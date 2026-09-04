# ADR-005: Keycloak identity and role-based API authorization

Status: Accepted; implementation pending

## Context

The deployed frontend and serverless API currently have no authentication or authorization. The next identity increment must use Keycloak and must support multiple clients and different permissions per API route without adding request persistence to the application.

## Decision

Use one environment-specific Keycloak realm with separate public browser, API resource, and confidential machine clients. Define application permissions as client roles under `academic-api` and use a deny-by-default route-to-role matrix.

API Gateway will validate access-token signature, issuer, audience, and time claims. A shared authorization guard, or a custom Lambda authorizer, must enforce `resource_access.academic-api.roles` before a protected use case executes. The application actor will be derived from token `sub`; caller-supplied roles or actor identifiers are not trusted.

Keycloak will be deployed separately from the serverless application over public HTTPS. Its database is identity infrastructure only and does not change the API's stateless request-processing model.

The complete target configuration, role matrix, deployment procedure, and acceptance criteria are in [Keycloak Authentication and Authorization](authentication-keycloak.md).

## Consequences

- Browser applications use Authorization Code with PKCE and contain no client secret.
- Machine integrations use a separate confidential client with least-privilege service-account roles.
- Protected API routes require future SAM, CORS, frontend, and shared authorization changes before this decision is operational.
- Keycloak requires durable identity storage, backup, TLS, monitoring, and lifecycle management.
- The OpenAPI contract must not claim authentication is active until enforcement is deployed.

