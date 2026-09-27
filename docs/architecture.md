# Architecture

The service is a stateless HTTP API. API Gateway HTTP API uses payload format 2.0 and invokes a different Lambda for every endpoint. Handlers adapt HTTP events, application services coordinate use cases, and domain rules remain independent from AWS.

No application database, email provider, or file storage is declared in the application stack. Prepared requests are returned but not persisted; successful protected operations publish minimal events to Kafka. Documents contain metadata only.

An externally deployed Keycloak realm owns identity. An API Gateway Lambda authorizer validates issuer, audience, signature, time claims and client roles; the shared endpoint adapter repeats the route-role check. See [Keycloak Authentication and Authorization](authentication-keycloak.md) and [ADR-005](ADR-005-keycloak-identity.md). Kafka event publication is described in [Kafka event integration](kafka-events.md) and [ADR-006](ADR-006-kafka-events.md).

## Boundaries

- `src/functions`: AWS entry points.
- `src/shared/application`: use cases.
- `src/shared/domain`: pure rules and enums.
- `src/shared/adapters`: HTTP response and event translation.
- `docs/openapi.yaml`: external contract.

## Identity boundary

Keycloak owns users, credentials, groups, clients, roles, and identity sessions. The Lambda authorizer validates access tokens issued for `academic-api` and enforces client roles before API Gateway invokes an endpoint. Identity storage belongs to Keycloak and does not make the academic-request API stateful.
