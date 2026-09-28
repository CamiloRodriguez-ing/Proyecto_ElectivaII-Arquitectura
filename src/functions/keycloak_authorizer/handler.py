import json
import os
from pathlib import Path
from typing import Any

import requests
from jose import JWTError, jwt


ROLE_MATRIX = {
    "POST /v1/requests/validate": {"STUDENT", "ADMINISTRATOR"},
    "POST /v1/requests/prepare": {"STUDENT", "ADMINISTRATOR"},
    "POST /v1/reviews/evaluate": {"REVIEWER", "ADMINISTRATOR"},
    "POST /v1/notifications/preview": {"REVIEWER", "NOTIFICATION_SERVICE", "ADMINISTRATOR"},
    "POST /v1/analytics/summary": {"ANALYST", "ADMINISTRATOR"},
}

_jwks_cache: dict[str, Any] | None = None


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    try:
        claims = _verified_claims(_bearer_token(event))
        roles = _client_roles(claims)
        allowed_roles = ROLE_MATRIX.get(event.get("routeKey", ""), set())
        authorized = bool(roles.intersection(allowed_roles))
        return {
            "isAuthorized": authorized,
            "context": {
                "sub": str(claims["sub"]), "tenant_id": str(claims.get("tenant_id", _guess_tenant(claims))),
                "resource_access": json.dumps({"academic-api": {"roles": sorted(roles)}}),
            },
        }
    except requests.RequestException:
        return {"isAuthorized": False, "context": {"authorization_error": "identity_provider_unavailable"}}
    except (JWTError, KeyError, TypeError, ValueError):
        return {"isAuthorized": False, "context": {}}


def _bearer_token(event: dict[str, Any]) -> str:
    headers = {key.lower(): value for key, value in event.get("headers", {}).items()}
    scheme, _, token = str(headers.get("authorization", "")).partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise ValueError("A bearer access token is required")
    return token


def _verified_claims(token: str) -> dict[str, Any]:
    issuer = os.environ["KEYCLOAK_ISSUER"].rstrip("/")
    header = jwt.get_unverified_header(token)
    jwks = _jwks()
    if not any(key.get("kid") == header.get("kid") for key in jwks.get("keys", [])):
        jwks = _jwks(force_refresh=True)
    return jwt.decode(
        token,
        jwks,
        algorithms=["RS256"],
        audience=["academic-api", "account", "academic-frontend"],
        issuer=issuer,
    )


def _jwks(force_refresh: bool = False) -> dict[str, Any]:
    global _jwks_cache
    if _jwks_cache is None and not force_refresh:
        bundled_jwks = Path(__file__).with_name("jwks.json")
        if bundled_jwks.exists():
            _jwks_cache = json.loads(bundled_jwks.read_text(encoding="utf-8"))
    if _jwks_cache is None or force_refresh:
        issuer = os.environ["KEYCLOAK_ISSUER"].rstrip("/")
        response = requests.get(f"{issuer}/protocol/openid-connect/certs", timeout=5)
        response.raise_for_status()
        _jwks_cache = response.json()
    return _jwks_cache


def _client_roles(claims: dict[str, Any]) -> set[str]:
    access = claims.get("resource_access", {}).get("academic-api", claims.get("resource_access", {}).get("academic-frontend", {}))
    return {str(role).upper() for role in access.get("roles", [])}


def _guess_tenant(claims: dict) -> str:
    email = claims.get("email", "").lower()
    if "minas" in email: return "minas"
    if "electronica" in email: return "electronica"
    return "sistemas"
