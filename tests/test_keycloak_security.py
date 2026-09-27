import json

import pytest

from shared.security.keycloak import (
    AuthenticationError,
    AuthorizationError,
    principal_from_event,
    require_any_role,
)


def event_with_claims(claims):
    return {"requestContext": {"authorizer": {"jwt": {"claims": claims}}}}


def test_parses_keycloak_client_roles_from_api_gateway_claims():
    event = event_with_claims(
        {
            "sub": "user-123",
            "resource_access": json.dumps({"academic-api": {"roles": ["STUDENT", "ANALYST"]}}),
        }
    )
    principal = principal_from_event(event)
    assert principal.subject == "user-123"
    assert principal.roles == {"STUDENT", "ANALYST"}


def test_missing_validated_subject_is_unauthenticated():
    with pytest.raises(AuthenticationError):
        principal_from_event({})


def test_missing_allowed_role_is_forbidden():
    event = event_with_claims(
        {"sub": "user-123", "resource_access": {"academic-api": {"roles": ["STUDENT"]}}}
    )
    with pytest.raises(AuthorizationError):
        require_any_role(event, {"REVIEWER"})
