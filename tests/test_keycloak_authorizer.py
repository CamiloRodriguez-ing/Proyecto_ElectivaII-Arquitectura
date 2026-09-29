from functions.keycloak_authorizer import handler
import requests

def event(route_key, authorization="Bearer token"):
    return {"routeKey": route_key, "headers": {"authorization": authorization}}

def test_authorizer_allows_matching_keycloak_client_role(monkeypatch):
    monkeypatch.setattr(
        handler,
        "_verified_claims",
        lambda token: {
            "sub": "student-1",
            "resource_access": {"academic-api": {"roles": ["STUDENT"]}},
        },
    )
    result = handler.lambda_handler(event("POST /v1/requests/prepare"), None)
    assert result["isAuthorized"] is True
    assert result["context"]["sub"] == "student-1"

def test_authorizer_denies_wrong_role(monkeypatch):
    monkeypatch.setattr(
        handler,
        "_verified_claims",
        lambda token: {
            "sub": "student-1",
            "resource_access": {"academic-api": {"roles": ["STUDENT"]}},
        },
    )
    result = handler.lambda_handler(event("POST /v1/reviews/evaluate"), None)
    assert result == {
        "isAuthorized": False,
        "context": {
            "sub": "student-1",
            "resource_access": '{"academic-api": {"roles": ["STUDENT"]}}',
            "tenant_id": "sistemas",
        },
    }

def test_authorizer_denies_malformed_authorization_header():
    result = handler.lambda_handler(event("POST /v1/requests/prepare", "Basic invalid"), None)
    assert result == {"isAuthorized": False, "context": {}}