# Persistence and OLAP

## Operational model

PostgreSQL stores `academic_requests`, `request_documents`, `request_reviews`, `notifications`, and `outbox_events`. Foreign keys keep dependent records attached to a request; tenant and owner indexes support authorization-aware reads. Review updates lock the request row and compare `version`, preventing two reviewers from silently overwriting each other.

Document upload is a three-step flow:

1. `POST /v1/documents/upload-url` validates PDF metadata, creates a pending document row, and returns a five-minute S3 PUT URL.
2. The browser uploads bytes directly to the private bucket.
3. `POST /v1/requests/prepare` references the returned `document_id`; the repository verifies the physical S3 object and expected size before attaching it transactionally.

Downloads follow the inverse path and enforce tenant plus owner/role access before returning a short-lived GET URL. Database rows never contain document bytes.

## Event consistency

Submitting or reviewing a request changes operational rows and inserts an outbox envelope in one PostgreSQL transaction. The scheduled publisher uses `FOR UPDATE SKIP LOCKED`, publishes with the outbox UUID as `event_id`, and marks successful rows. A broker failure leaves the row pending for retry. This is at-least-once delivery: consumers must make `event_id` unique in their projections.

## Analytical pipeline

```text
PostgreSQL transaction -> outbox -> Kafka/MSK -> analytics-ingest Lambda
  -> S3 raw JSON -> Glue normalized Parquet -> Redshift Serverless
  -> star-schema facts/dimensions -> materialized CUBE views -> analytics API
```

The ingestion Lambda hashes actor and student identifiers with a deployment-specific salt before writing the raw zone. It does not copy student names, email addresses, access tokens, or documents. Raw objects are immutable and partitioned by event type and event time. Glue deduplicates stable event IDs and rebuilds curated Parquet; the Redshift loader uses `MERGE` and recomputed counters so reruns are idempotent.

The warehouse contains date, tenant, request-type, status, decision, and course dimensions; request, status-transition, review, and daily-snapshot facts. Its current grains are one request, one status transition, one review decision, and one open request per daily snapshot. Materialized cubes provide:

- request volume, decisions, credits, and resolution time;
- equivalence outcomes by source and target course;
- review volume and response time by role and decision.

Cube endpoints whitelist dimensions and SQL identifiers. Non-administrators are always restricted to the tenant from their signed token. Weighted sums/counts are used for correct roll-up of averages.

## Migrations and recovery

- `001_operational.sql` is applied to PostgreSQL by the deployment migration Lambda and by `app-migrate` locally.
- `002_warehouse.sql` is applied through the Redshift Data API when analytics is enabled.
- The Glue transform runs every 30 minutes; the warehouse load and cube refresh run hourly.

RDS automated backups protect transactional data. S3 versioning protects document replacement and the raw analytical zone is the warehouse rebuild source. In production, test restore procedures regularly and do not use Terraform destroy as a recovery mechanism.
