import json

from jose import jwt

from functions.auth_session import handler


def _access_token(role="STUDENT"):
    return jwt.encode(
        {
            "sub": "user-1",
            "preferred_username": "estudiante.sistemas",
            "name": "Estudiante Sistemas",
            "email": "estudiante@sistemas.local",
            "tenant_id": "sistemas",
            "resource_access": {"academic-api": {"roles": [role]}},
        },
        "test-only-secret",
        algorithm="HS256",
    )


def test_login_returns_safe_identity_and_http_only_session_cookies(monkeypatch):
    monkeypatch.setenv("APP_ENV", "local")
    monkeypatch.setenv("AUTH_CSRF_SECRET", "test-csrf-secret-with-at-least-32-characters")
    monkeypatch.setattr(
        handler,
        "password_grant",
        lambda username, password: {
            "access_token": _access_token(),
            "refresh_token": "refresh-value",
            "expires_in": 300,
        },
    )
    event = {
        "routeKey": "POST /v1/auth/login",
        "headers": {},
        "body": json.dumps({"username": "estudiante.sistemas", "password": "estudiante"}),
    }

    result = handler.lambda_handler(event, None)

    assert result["statusCode"] == 200
    assert json.loads(result["body"])["data"]["user"]["roles"] == ["STUDENT"]
    assert len(result["cookies"]) == 4
    assert "academic_access=" in result["cookies"][0]
    assert "HttpOnly" in result["cookies"][0]
    assert "SameSite=Strict" in result["cookies"][0]
    assert "Path=/;" in result["cookies"][3]
    assert "HttpOnly" not in result["cookies"][3]
    assert "password" not in result["body"].lower()


def test_login_uses_generic_error_for_invalid_credentials(monkeypatch):
    monkeypatch.setattr(
        handler,
        "password_grant",
        lambda username, password: (_ for _ in ()).throw(handler.InvalidCredentials("Keycloak detail")),
    )
    event = {
        "routeKey": "POST /v1/auth/login",
        "headers": {},
        "body": json.dumps({"username": "unknown", "password": "wrong"}),
    }

    result = handler.lambda_handler(event, None)

    assert result["statusCode"] == 401
    payload = json.loads(result["body"])
    assert payload["error"] == {
        "code": "INVALID_CREDENTIALS",
        "message": "Usuario o contraseña incorrectos",
        "details": [],
    }


def test_refresh_requires_matching_signed_csrf_token(monkeypatch):
    monkeypatch.setenv("AUTH_CSRF_SECRET", "test-csrf-secret-with-at-least-32-characters")
    event = {
        "routeKey": "POST /v1/auth/refresh",
        "headers": {"cookie": "academic_refresh=refresh-value; academic_csrf=invalid"},
        "body": "{}",
    }

    result = handler.lambda_handler(event, None)

    assert result["statusCode"] == 401
    assert json.loads(result["body"])["error"]["code"] == "UNAUTHENTICATED"


def test_logout_clears_all_session_cookies_without_persistent_expiry(monkeypatch):
    monkeypatch.setenv("APP_ENV", "local")
    result = handler.lambda_handler(
        {"routeKey": "POST /v1/auth/logout", "headers": {}, "body": "{}"},
        None,
    )

    assert result["statusCode"] == 200
    assert len(result["cookies"]) == 4
    assert all("Max-Age=0" in cookie for cookie in result["cookies"])
