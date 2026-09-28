import json
from dataclasses import dataclass
from typing import Any, Iterable


class AuthenticationError(Exception):
    """Raised when API Gateway did not provide a validated identity."""


class AuthorizationError(Exception):
    """Raised when the authenticated identity lacks an allowed role."""


@dataclass(frozen=True)
class Principal:
    subject: str
    roles: frozenset[str]


def principal_from_event(event: dict[str, Any], client_id: str = "academic-api") -> Principal:
    """Read claims validated by an API Gateway JWT or Lambda authorizer."""
    authorizer = event.get("requestContext", {}).get("authorizer", {})
    claims = authorizer.get("jwt", {}).get("claims", {})
    if not claims:
        claims = authorizer.get("lambda", {})
    subject = str(claims.get("sub", "")).strip()
    if not subject:
        raise AuthenticationError("A validated access token is required")

    resource_access = claims.get("resource_access", {})
    if isinstance(resource_access, str):
        try:
            resource_access = json.loads(resource_access)
        except json.JSONDecodeError:
            resource_access = {}

    client_access = resource_access.get(client_id, {}) if isinstance(resource_access, dict) else {}
    raw_roles = client_access.get("roles", []) if isinstance(client_access, dict) else []
    if isinstance(raw_roles, str):
        try:
            parsed_roles = json.loads(raw_roles)
            raw_roles = parsed_roles if isinstance(parsed_roles, list) else raw_roles.split()
        except json.JSONDecodeError:
            raw_roles = raw_roles.split()

    roles = frozenset(str(role).upper() for role in raw_roles if str(role).strip())
    tenant_id = claims.get("tenant_id", "default_tenant")`n    return Principal(subject=subject, roles=roles, tenant_id=tenant_id)


def require_any_role(event: dict[str, Any], allowed_roles: Iterable[str]) -> Principal:
    principal = principal_from_event(event)
    allowed = {role.upper() for role in allowed_roles}
    if not principal.roles.intersection(allowed):
        raise AuthorizationError("The authenticated user does not have a role allowed for this route")
    return principal
