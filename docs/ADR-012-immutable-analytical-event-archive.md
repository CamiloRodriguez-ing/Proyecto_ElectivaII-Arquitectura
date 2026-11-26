# ADR-012: Immutable analytical event archive in Amazon S3

Status: Accepted

Date: 2026-11-25

## Context

Druid will consume Kafka directly and store queryable segments in S3 deep
storage. Those segments are an optimized representation of the current Druid
datasource schema; they are not a durable copy of the original versioned event
contracts. Kafka retention is also finite.

The analytical platform needs a low-cost way to rebuild datasources after a
schema change, recover from an ingestion error, and demonstrate an auditable
event lineage.

## Decision

Keep an immutable, pseudonymized analytical event archive in Amazon S3 in
parallel with Druid streaming ingestion.

```text
Transactional outbox -> Kafka/MSK -> Druid streaming ingestion -> queryable segments
                              |
                              +-> archive consumer -> pseudonymized raw events in S3
```

- Druid and the archive service use independent Kafka consumer groups.
- The archive consumer will validate supported event contracts, remove fields
  outside the analytical allowlist, pseudonymize permitted stable person keys,
  and write immutable JSON objects partitioned by event type and event time.
- The stable `event_id` will determine object identity so redelivery is
  idempotent and does not create multiple logical archived events.
- The S3 bucket will use encryption, public-access blocking, versioning, and a
  documented lifecycle policy.
- Archived objects will never include student names, email addresses,
  institutional codes, reviewer identities, observations, documents, tokens, or
  credentials.
- Rebuild procedures will read the archive and republish or batch-ingest the
  approved event projection into a new Druid datasource before switching API
  traffic.
- Local development will exercise the same archive behavior against the
  S3-compatible service already present in Docker Compose.

## Rationale

At the expected academic volume, object storage is inexpensive and adds a
material recovery capability. It also preserves an explainable lineage from the
operational transaction through Kafka to both the real-time OLAP store and the
rebuild source.

## Consequences

- The analytical path has two independently monitored Kafka consumers.
- Archive lag or failure does not block operational writes or Druid ingestion,
  but it must raise an alert because it reduces recoverability.
- Druid S3 deep storage and the raw event archive require separate prefixes,
  permissions, retention rules, and recovery documentation.
- Event contract compatibility and replay tests become required.
- S3 storage and request charges increase slightly.

## Rejected alternative

Relying only on Kafka retention and Druid deep-storage segments was rejected.
It would be simpler, but it would prevent a faithful rebuild from original
analytical events after Kafka data expires or the Druid schema changes.

## Presentation summary

Kafka fans out to two purposes: Druid serves low-latency OLAP queries, while S3
preserves a privacy-safe event history. The archive makes the cube reproducible;
Druid deep storage makes the current cube durable.
