# Architecture

The first stage is a stateless HTTP API. API Gateway HTTP API uses payload format 2.0 and invokes one Lambda per business capability. Handlers adapt HTTP events, application services coordinate use cases, and domain rules remain independent from AWS.

No application storage, queues, identity provider, email provider, or file storage is declared. Prepared requests and domain events are returned to the caller and are not persisted. Documents contain metadata only.

## Boundaries

- `src/functions`: AWS entry points.
- `src/shared/application`: use cases.
- `src/shared/domain`: pure rules and enums.
- `src/shared/adapters`: HTTP response and event translation.
- `docs/openapi.yaml`: external contract.
