# Future Evolution

Operational PostgreSQL persistence, optimistic version checks, private document storage, the transactional outbox, and the initial OLAP warehouse are implemented.

Likely next increments are point-in-time RDS recovery drills, KMS customer-managed keys, outbox dead-letter alerting, Druid compaction and retention policies, archive-to-Druid replay automation, data-quality reconciliation, BI integrations, and SCD2 source attributes once authoritative course and tenant catalogs exist. These changes must preserve the versioned HTTP and Kafka contracts.
