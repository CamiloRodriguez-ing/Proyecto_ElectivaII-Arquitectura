"""Browser-session helpers shared by the auth facade and API authorizer."""

import base64
import hashlib
import hmac
import os
import secrets
from http.cookies import SimpleCookie
from typing import Any

ACCESS_COOKIE = "academic_access"
REFRESH_COOKIE = "academic_refresh"
CSRF_COOKIE = "academic_csrf"
CSRF_HEADER = "x-csrf-token"


class CsrfError(ValueError):
    """Raised when a cookie-authenticated unsafe request has no valid CSRF token."""


def event_cookies(event: dict[str, Any]) -> dict[str, str]:
    raw_values = [str(value) for value in event.get("cookies", []) if value]
    headers = {str(key).lower(): value for key, value in event.get("headers", {}).items()}
    if not raw_values and headers.get("cookie"):
        raw_values.append(str(headers["cookie"]))

    parsed: dict[str, str] = {}
    for raw_value in raw_values:
        cookie = SimpleCookie()
        cookie.load(raw_value)
        parsed.update({name: morsel.value for name, morsel in cookie.items()})
    return parsed


def access_token(event: dict[str, Any]) -> tuple[str, str]:
    headers = {str(key).lower(): value for key, value in event.get("headers", {}).items()}
    scheme, _, token = str(headers.get("authorization", "")).partition(" ")
    if scheme.lower() == "bearer" and token:
        return token, "bearer"

    token = event_cookies(event).get(ACCESS_COOKIE, "")
    if token:
        return token, "cookie"
    raise ValueError("An authenticated session is required")


def new_csrf_token() -> str:
    nonce = secrets.token_urlsafe(32)
    return f"{nonce}.{_csrf_signature(nonce)}"


def require_csrf(event: dict[str, Any]) -> None:
    headers = {str(key).lower(): value for key, value in event.get("headers", {}).items()}
    header_token = str(headers.get(CSRF_HEADER, ""))
    cookie_token = event_cookies(event).get(CSRF_COOKIE, "")
    if not header_token or not cookie_token or not hmac.compare_digest(header_token, cookie_token):
        raise CsrfError("A valid CSRF token is required")

    nonce, separator, signature = header_token.rpartition(".")
    if not separator or not nonce or not hmac.compare_digest(signature, _csrf_signature(nonce)):
        raise CsrfError("A valid CSRF token is required")


def session_cookies(access: str, refresh: str, csrf: str) -> list[str]:
    return [
        _cookie(ACCESS_COOKIE, access, "/v1", http_only=True),
        _cookie(REFRESH_COOKIE, refresh, "/v1/auth", http_only=True),
        # Remove the pre-ADR-025 path so an upgraded browser cannot send two
        # cookies with the same name to /v1.
        _cookie(CSRF_COOKIE, "", "/v1", http_only=False, clear=True),
        # Angular routes live outside /v1, so JavaScript must be able to read
        # this non-HttpOnly double-submit value from every SPA route.
        _cookie(CSRF_COOKIE, csrf, "/", http_only=False),
    ]


def clear_session_cookies() -> list[str]:
    return [
        _cookie(ACCESS_COOKIE, "", "/v1", http_only=True, clear=True),
        _cookie(REFRESH_COOKIE, "", "/v1/auth", http_only=True, clear=True),
        _cookie(CSRF_COOKIE, "", "/", http_only=False, clear=True),
        _cookie(CSRF_COOKIE, "", "/v1", http_only=False, clear=True),
    ]


def _csrf_signature(nonce: str) -> str:
    secret = os.environ.get("AUTH_CSRF_SECRET", "")
    if len(secret) < 32:
        raise RuntimeError("AUTH_CSRF_SECRET must contain at least 32 characters")
    digest = hmac.new(secret.encode("utf-8"), nonce.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def _cookie(name: str, value: str, path: str, *, http_only: bool, clear: bool = False) -> str:
    cookie = SimpleCookie()
    cookie[name] = value
    morsel = cookie[name]
    morsel["path"] = path
    morsel["samesite"] = "Strict"
    if http_only:
        morsel["httponly"] = True
    secure_default = os.environ.get("APP_ENV", "production").lower() != "local"
    secure = os.environ.get("AUTH_COOKIE_SECURE", str(secure_default)).lower() == "true"
    if secure:
        morsel["secure"] = True
    if clear:
        morsel["max-age"] = "0"
        morsel["expires"] = "Thu, 01 Jan 1970 00:00:00 GMT"
    return morsel.OutputString()
