# Architecture

The platform separates transactional processing from analytical processing. API Gateway HTTP API uses payload format 2.0 and invokes a different Lambda for every endpoint. Handlers adapt HTTP events, application services coordinate use cases, and domain rules remain independent from AWS.

PostgreSQL is the operational source of truth for requests, reviews, notifications, document metadata, optimistic versions, and the transactional outbox. Lambdas connect through RDS Proxy. Document bytes are stored in a private, encrypted, versioned S3 bucket and transferred with short-lived presigned URLs.

Request and review mutations insert an outbox row in the same database transaction. A scheduled publisher locks pending rows, publishes versioned envelopes to Kafka, and marks them delivered. Consumers deduplicate by `event_id` because delivery is at least once.

The optional analytical path consumes Kafka into an immutable, pseudonymized S3 raw zone. AWS Glue normalizes those events into Parquet, and an hourly loader maintains a Redshift Serverless star schema, daily snapshot, and three materialized OLAP cubes. Analytical failures cannot roll back operational transactions.

An externally deployed Keycloak realm owns identity. An API Gateway Lambda authorizer validates issuer, audience, signature, time claims and client roles; the shared endpoint adapter repeats the route-role check. See [Keycloak Authentication and Authorization](authentication-keycloak.md) and [ADR-005](ADR-005-keycloak-identity.md). Kafka event publication is described in [Kafka event integration](kafka-events.md) and [ADR-006](ADR-006-kafka-events.md).

## Boundaries

- `src/functions`: AWS entry points.
- `src/shared/application`: use cases.
- `src/shared/domain`: pure rules and enums.
- `src/shared/adapters`: HTTP response and event translation.
- `db/migrations`: operational PostgreSQL and analytical Redshift schemas.
- `analytics/glue`: raw-to-curated analytics transformation.
- `infra/terraform`: AWS networking, persistence, eventing, and warehouse resources.
- `docs/openapi.yaml`: external contract.

## Identity boundary

Keycloak owns users, credentials, groups, clients, roles, and identity sessions. The application stores only trusted subject and tenant identifiers required for ownership and audit; it never stores credentials or access tokens. Tenant and owner predicates are applied inside repository queries, not accepted from request bodies.

See [Persistence and OLAP](persistence-and-olap.md) for data models, flow, recovery, and analytical grain.
