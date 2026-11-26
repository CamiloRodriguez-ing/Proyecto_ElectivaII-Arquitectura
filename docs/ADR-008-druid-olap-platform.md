# ADR-008: Apache Druid as the OLAP platform

Status: Accepted

Date: 2026-11-25

## Context

The repository currently describes an AWS-specific analytical path based on S3,
Glue, and Redshift Serverless. It also contains a partial Redshift dimensional
model and cube API, but the complete local Docker environment has no analytical
consumer or OLAP engine. Consequently, the dashboard still calculates a summary
from the operational requests returned to the browser instead of querying a
Kafka-derived analytical store.

The project needs one demonstrable local pipeline that consumes Kafka events,
supports multidimensional analysis, and has a credible deployment path to AWS.
The selected engine should avoid maintaining unrelated local and cloud
analytical implementations.

## Decision

Use Apache Druid as the canonical OLAP engine.

- In local development, Druid will run in Docker Compose and consume the
  existing Kafka-compatible Redpanda topics.
- In AWS, Druid will consume the equivalent managed Kafka topics and use AWS
  infrastructure for its durable dependencies. The exact Druid compute
  topology is a separate pending decision.
- The analytical API and dashboard will query Druid rather than calculate
  indicators from operational API responses.
- Kafka event envelopes remain the integration boundary. Operational
  PostgreSQL will not be queried directly by Druid.
- Event ingestion must remain idempotent by stable `event_id`, preserve tenant
  isolation, and exclude unnecessary personal data.
- Druid SQL, dimensions, measures, rollup, and time-based aggregation will
  provide the required OLAP operations. A traditional MDX interface is not a
  project requirement.

This decision supersedes only the Redshift/Glue analytical-engine portion of
[ADR-007](ADR-007-persistence-and-olap.md). PostgreSQL, S3 document storage, the
transactional outbox, Kafka delivery semantics, and pseudonymization constraints
from ADR-007 remain in force.

## Rationale

Apache Druid is designed for event-oriented real-time OLAP workloads, provides
native Kafka streaming ingestion, supports SQL queries and time-based rollup,
and publishes an official Docker Compose workflow. These properties match the
existing event-driven architecture and allow the local demonstration to exercise
the same analytical model intended for AWS.

Apache Pinot was considered but rejected for this project because its local
evaluation topology has a higher documented resource recommendation and does not
provide a material advantage for the expected academic workload. Apache Kylin
and Mondrian were not selected because the desired pipeline benefits more from
direct, continuously queryable Kafka ingestion than from a batch-oriented cube
build or an MDX-centric semantic layer.

## Consequences

- The existing Redshift migration, Glue transform, loader, Terraform resources,
  and Redshift Data API handler must be retired or clearly retained only as
  historical migration artifacts; they must not remain a second active source
  of analytical truth.
- Docker requires additional memory and services for Druid.
- Druid ingestion specifications, datasource schemas, retention, compaction,
  and query contracts become version-controlled project artifacts.
- AWS deployment is no longer fully serverless. It requires long-running Druid
  compute plus metadata storage and durable deep storage.
- The API must mediate dashboard access so that browser clients never receive
  direct administrative access to Druid.
- Automated tests must cover duplicate events, late events, tenant filtering,
  measures, and local end-to-end Kafka-to-dashboard behavior.

The AWS compute topology is resolved by
[ADR-009](ADR-009-single-node-druid-on-aws.md): a cost-oriented, single-node EC2
deployment with durable AWS dependencies.

The AWS Kafka topology is resolved by
[ADR-010](ADR-010-msk-serverless-iam-for-druid.md): Amazon MSK Serverless with
IAM-authenticated Druid ingestion.

The analytical scope and event enrichment are resolved by
[ADR-011](ADR-011-analytical-model-and-event-enrichment.md): three analytical
views, privacy-safe self-contained events, and a 60-second freshness target.

Analytical recovery and replay are resolved by
[ADR-012](ADR-012-immutable-analytical-event-archive.md): Druid consumes Kafka
for real-time queries while an independent consumer stores an immutable,
pseudonymized event archive in S3.

The API migration is resolved by
[ADR-013](ADR-013-clean-analytical-api-cutover.md): remove the client-payload
summary operation and expose only Druid-backed analytical reads.

The local resource profile is resolved by
[ADR-014](ADR-014-local-analytics-resource-profile.md): the complete stack starts
by default on the 31 GiB demonstration workstation with explicit Druid memory
limits.

## References

- [Apache Druid: introduction](https://druid.apache.org/docs/latest/)
- [Apache Druid: Kafka ingestion](https://druid.apache.org/docs/latest/ingestion/kafka-ingestion/)
- [Apache Druid: Docker deployment](https://druid.apache.org/docs/latest/tutorials/docker/)
