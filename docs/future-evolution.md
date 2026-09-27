# Future Evolution

Persistence may later be added behind a `RequestRepository` port using PostgreSQL and optimistic version checks. At that point domain events must be stored with a transactional outbox before publication to Kafka. Analytics can then consume event projections instead of requiring request collections in HTTP bodies.

These persistence changes must not break the versioned HTTP or event contracts.
