# Future Evolution

Operational PostgreSQL persistence, optimistic version checks, private document storage, the transactional outbox, and the initial OLAP warehouse are implemented.

Likely next increments are point-in-time RDS recovery drills, KMS customer-managed keys, outbox dead-letter alerting, Glue bookmarks for incremental transforms, data-quality reconciliation, row-level security in Redshift, BI dashboards, and SCD2 source attributes once authoritative course and tenant catalogs exist. These changes must preserve the versioned HTTP and Kafka contracts.
