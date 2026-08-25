# Future Evolution

Persistence may later be added behind a `RequestRepository` port using PostgreSQL and optimistic version checks. Domain events can be stored with an outbox and published to Kafka only when asynchronous processing is required. Analytics can then consume event projections instead of requiring large request collections in HTTP bodies.

These integrations are intentionally absent from the first stage and must not change the versioned HTTP contracts.
