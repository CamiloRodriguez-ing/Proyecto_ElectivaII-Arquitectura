import json
import os
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt

from shared.security.browser_session import (
    REFRESH_COOKIE,
    access_token,
    clear_session_cookies,
    event_cookies,
    new_csrf_token,
    require_csrf,
    session_cookies,
)
from shared.security.keycloak_bff import (
    IdentityProviderUnavailable,
    InvalidCredentials,
    InvalidRefreshToken,
    end_session,
    password_grant,
    refresh_grant,
)


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    route_key = event.get("routeKey", "")
    headers = {str(key).lower(): value for key, value in event.get("headers", {}).items()}
    request_id = str(headers.get("x-request-id") or uuid4())
    try:
        if route_key == "POST /v1/auth/login":
            return _login(event, request_id)
        if route_key == "POST /v1/auth/refresh":
            return _refresh(event, request_id)
        if route_key == "POST /v1/auth/logout":
            return _logout(event, request_id)
        if route_key == "GET /v1/auth/me":
            return _success({"user": _user_from_access_token(access_token(event)[0])}, request_id)
        return _error("NOT_FOUND", "Authentication route not found", 404, request_id)
    except json.JSONDecodeError:
        return _error("INVALID_JSON", "The request body must be valid JSON", 400, request_id)
    except InvalidCredentials:
        return _error("INVALID_CREDENTIALS", "Usuario o contraseña incorrectos", 401, request_id)
    except InvalidRefreshToken:
        return _error(
            "SESSION_EXPIRED", "La sesión expiró; inicia sesión nuevamente", 401, request_id,
            cookies=clear_session_cookies(),
        )
    except IdentityProviderUnavailable:
        return _error("IDENTITY_PROVIDER_UNAVAILABLE", "El servicio de identidad no está disponible", 503, request_id)
    except (JWTError, KeyError, TypeError, ValueError):
        return _error("UNAUTHENTICATED", "La sesión no es válida", 401, request_id)


def _login(event: dict[str, Any], request_id: str) -> dict[str, Any]:
    body = json.loads(event.get("body") or "{}")
    username = body.get("username")
    password = body.get("password")
    if not isinstance(username, str) or not 1 <= len(username.strip()) <= 254:
        raise InvalidCredentials("Invalid username")
    if not isinstance(password, str) or not 1 <= len(password) <= 1024:
        raise InvalidCredentials("Invalid password")

    tokens = password_grant(username.strip(), password)
    csrf = new_csrf_token()
    return _success(
        {"user": _user_from_access_token(tokens["access_token"]), "expires_in": tokens.get("expires_in")},
        request_id,
        cookies=session_cookies(tokens["access_token"], tokens["refresh_token"], csrf),
    )


def _refresh(event: dict[str, Any], request_id: str) -> dict[str, Any]:
    require_csrf(event)
    refresh_token = event_cookies(event).get(REFRESH_COOKIE, "")
    if not refresh_token:
        raise InvalidRefreshToken("Missing refresh token")
    tokens = refresh_grant(refresh_token)
    csrf = new_csrf_token()
    return _success(
        {"user": _user_from_access_token(tokens["access_token"]), "expires_in": tokens.get("expires_in")},
        request_id,
        cookies=session_cookies(tokens["access_token"], tokens["refresh_token"], csrf),
    )


def _logout(event: dict[str, Any], request_id: str) -> dict[str, Any]:
    cookies = event_cookies(event)
    if cookies:
        require_csrf(event)
    refresh_token = cookies.get(REFRESH_COOKIE)
    if refresh_token:
        end_session(refresh_token)
    return _success({"logged_out": True}, request_id, cookies=clear_session_cookies())


def _user_from_access_token(token: str) -> dict[str, Any]:
    claims = jwt.get_unverified_claims(token)
    roles = {
        str(role).upper()
        for role in ((claims.get("resource_access") or {}).get("academic-api") or {}).get("roles", [])
    }
    if not roles:
        raise ValueError("The access token has no application role")
    tenant_id = str(claims.get("tenant_id") or _guess_tenant(claims))
    expected_tenant = os.environ.get("TENANT_ID", "").lower()
    if expected_tenant and tenant_id.lower() != expected_tenant:
        raise ValueError("The identity belongs to another tenant")
    return {
        "subject": str(claims["sub"]),
        "username": str(claims.get("preferred_username", "")),
        "name": str(claims.get("name") or claims.get("preferred_username") or "Usuario"),
        "email": str(claims.get("email", "")),
        "tenant_id": tenant_id,
        "roles": sorted(roles),
    }


def _guess_tenant(claims: dict[str, Any]) -> str:
    email = str(claims.get("email") or "").lower()
    for tenant in ("minas", "electronica", "sistemas"):
        if tenant in email:
            return tenant
    return "sistemas"


def _success(data: Any, request_id: str, cookies: list[str] | None = None) -> dict[str, Any]:
    return {
        "statusCode": 200,
        "headers": _headers(),
        "cookies": cookies or [],
        "body": json.dumps({
            "data": data,
            "meta": {
                "request_id": request_id,
                "api_version": "v1",
                "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            },
        }),
    }


def _error(
    code: str, message: str, status: int, request_id: str, cookies: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "statusCode": status,
        "headers": _headers(),
        "cookies": cookies or [],
        "body": json.dumps({
            "error": {"code": code, "message": message, "details": []},
            "meta": {"request_id": request_id, "api_version": "v1"},
        }),
    }


def _headers() -> dict[str, str]:
    return {
        "content-type": "application/json",
        "cache-control": "no-store",
        "pragma": "no-cache",
    }
