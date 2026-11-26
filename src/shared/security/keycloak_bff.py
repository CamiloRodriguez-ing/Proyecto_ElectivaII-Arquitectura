"""Confidential Keycloak client used only by the backend auth facade."""

import os
from typing import Any

import requests


class InvalidCredentials(ValueError):
    pass


class InvalidRefreshToken(ValueError):
    pass


class IdentityProviderUnavailable(RuntimeError):
    pass


def password_grant(username: str, password: str) -> dict[str, Any]:
    return _token_request({"grant_type": "password", "username": username, "password": password}, InvalidCredentials)


def refresh_grant(refresh_token: str) -> dict[str, Any]:
    return _token_request({"grant_type": "refresh_token", "refresh_token": refresh_token}, InvalidRefreshToken)


def end_session(refresh_token: str) -> None:
    try:
        response = requests.post(
            _endpoint("logout"),
            data={**_client_credentials(), "refresh_token": refresh_token},
            timeout=5,
        )
        response.raise_for_status()
    except requests.RequestException:
        # Local cookies are still cleared. Keycloak session cleanup is best effort.
        return


def _token_request(data: dict[str, str], invalid_error: type[ValueError]) -> dict[str, Any]:
    try:
        response = requests.post(
            _endpoint("token"),
            data={**_client_credentials(), **data, "scope": "openid profile email"},
            timeout=5,
        )
        if response.status_code in {400, 401}:
            raise invalid_error("The supplied credentials are not valid")
        response.raise_for_status()
        payload = response.json()
    except invalid_error:
        raise
    except (requests.RequestException, ValueError) as error:
        raise IdentityProviderUnavailable("The identity provider is unavailable") from error

    if not payload.get("access_token") or not payload.get("refresh_token"):
        raise IdentityProviderUnavailable("The identity provider returned an incomplete session")
    return payload


def _client_credentials() -> dict[str, str]:
    client_id = os.environ.get("KEYCLOAK_BFF_CLIENT_ID", "academic-bff")
    client_secret = os.environ.get("KEYCLOAK_BFF_CLIENT_SECRET", "")
    if not client_secret:
        raise IdentityProviderUnavailable("The authentication client is not configured")
    return {"client_id": client_id, "client_secret": client_secret}


def _endpoint(operation: str) -> str:
    override = os.environ.get(f"KEYCLOAK_{operation.upper()}_URL")
    if override:
        return override
    issuer = os.environ["KEYCLOAK_ISSUER"].rstrip("/")
    return f"{issuer}/protocol/openid-connect/{operation}"
