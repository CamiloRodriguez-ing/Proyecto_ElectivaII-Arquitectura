# Architecture

The first stage is a stateless HTTP API. API Gateway HTTP API uses payload format 2.0 and invokes one Lambda per business capability. Handlers adapt HTTP events, application services coordinate use cases, and domain rules remain independent from AWS.

No application storage, queues, identity provider, email provider, or file storage is declared in the current SAM stack. Prepared requests and domain events are returned to the caller and are not persisted. Documents contain metadata only.

The accepted target for the next identity increment is an externally deployed Keycloak realm with multiple OIDC clients and role-based route authorization. It is specified in [Keycloak Authentication and Authorization](authentication-keycloak.md) and [ADR-005](ADR-005-keycloak-identity.md). This target is not implemented by the current source code or infrastructure template.

## Boundaries

- `src/functions`: AWS entry points.
- `src/shared/application`: use cases.
- `src/shared/domain`: pure rules and enums.
- `src/shared/adapters`: HTTP response and event translation.
- `docs/openapi.yaml`: external contract.

## Target identity boundary

Keycloak will own users, credentials, groups, clients, roles, and identity sessions. API Gateway will validate access tokens issued for `academic-api`; a route guard will enforce the API client roles before invoking a use case. Identity storage belongs to Keycloak and does not make the academic-request API stateful.
