# ADR-007: Operational persistence and analytical warehouse

Status: Accepted

## Decision

Use PostgreSQL as the relational operational source of truth because requests, reviews, documents, notifications, ownership, and state transitions require transactions and referential integrity. Use RDS Proxy for Lambda connection pooling and optimistic `version` checks for concurrent reviews.

Store document bytes in private, encrypted, versioned S3 and keep only metadata and object keys in PostgreSQL. Upload and download use short-lived presigned URLs.

Write Kafka event intent into a PostgreSQL transactional outbox in the same commit as each request or review mutation. Publish asynchronously with at-least-once delivery and stable event IDs.

Build analytics separately: Kafka to immutable pseudonymized S3 JSON, Glue to curated Parquet, and Redshift Serverless to a star schema and materialized OLAP cubes. Analytical workloads never query the operational database directly.

## Consequences

Operational writes remain consistent during broker outages, while events may be delayed and consumers must deduplicate. PostgreSQL and S3 have distinct backup/lifecycle controls. The warehouse is eventually consistent and can be rebuilt from the immutable raw event zone. Enabling analytics adds Glue and Redshift cost, so it remains an explicit Terraform option.
