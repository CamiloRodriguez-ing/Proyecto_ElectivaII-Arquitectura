# ADR-005: Keycloak identity and role-based API authorization

Status: Accepted and implemented

## Context

The serverless API requires Keycloak access tokens and supports different permissions per route without adding request persistence to the application. The browser login integration remains a separate frontend concern.

## Decision

Use one environment-specific Keycloak realm with separate public browser, API resource, and confidential machine clients. Define application permissions as client roles under `academic-api` and use a deny-by-default route-to-role matrix.

A Lambda authorizer attached to API Gateway validates access-token signature, issuer, audience, time claims and `resource_access.academic-api.roles` before a protected endpoint executes. Each endpoint also applies the role matrix from the validated authorizer context. The application actor is derived from token `sub`; caller-supplied roles or actor identifiers are not trusted.

Keycloak will be deployed separately from the serverless application over public HTTPS. Its database is identity infrastructure only and does not change the API's stateless request-processing model.

The complete configuration, role matrix, deployment procedure, and acceptance criteria are in [Keycloak Authentication and Authorization](authentication-keycloak.md).

## Consequences

- Browser applications use Authorization Code with PKCE and contain no client secret.
- Machine integrations use a separate confidential client with least-privilege service-account roles.
- The SAM template configures a REQUEST Lambda authorizer, explicit protected routes and CORS; each business Lambda repeats the client-role check as defense in depth.
- Keycloak requires durable identity storage, backup, TLS, monitoring, and lifecycle management.
- The OpenAPI contract must not claim authentication is active until enforcement is deployed.
