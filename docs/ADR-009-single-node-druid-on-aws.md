# ADR-009: Single-node Apache Druid deployment on AWS

Status: Accepted

Date: 2026-11-25

## Context

[ADR-008](ADR-008-druid-olap-platform.md) selects Apache Druid as the canonical
OLAP engine. Druid can be deployed as a distributed cluster, but the immediate
goal is an academic demonstration. Cost, reproducibility, and operational
simplicity are more important than continuous availability and horizontal
scaling.

## Decision

Deploy Druid on one Amazon EC2 instance using a version-controlled Docker
Compose profile.

- The instance will run the Druid services required by the compact local
  topology.
- Amazon S3 will provide durable Druid deep storage so analytical segments are
  not durable only on the instance disk.
- PostgreSQL will provide Druid metadata storage. The implementation will
  evaluate sharing the existing RDS PostgreSQL instance through an isolated
  database and credentials instead of creating another database instance.
- Druid will consume analytical events from the selected Amazon MSK topology.
- Terraform will provision the EC2 instance, IAM instance profile, security
  groups, configuration/bootstrap mechanism, S3 access, metadata credentials,
  monitoring, and private network connectivity.
- Druid will remain private. The application analytics API will be the only
  browser-facing query boundary.
- Local Docker and EC2 will use the same datasource definitions, ingestion
  specifications, and API query semantics. Environment-specific endpoints and
  credentials will be injected as configuration.

## Rationale

A single-node deployment is sufficient for the expected demonstration data and
avoids the control-plane, node, and operational overhead of an EKS deployment.
Keeping durable segments in S3 and metadata in PostgreSQL makes loss or
replacement of the EC2 instance recoverable even though it is not highly
available.

## Consequences

- Druid is unavailable during instance failure, maintenance, or replacement.
- The deployment has no zero-downtime upgrade guarantee.
- EC2 instance sizing must satisfy Druid's Java heap and direct-memory needs;
  this creates a minimum infrastructure cost even at low event volume.
- Recovery procedures must recreate the instance from Terraform/bootstrap,
  reconnect metadata and deep storage, and verify Kafka supervisor offsets.
- Backups protect configuration, PostgreSQL metadata, and S3 segments; local
  container state must not be the only copy of important data.
- A future high-availability requirement will require a new ADR and migration
  to a distributed topology such as EKS or multiple dedicated instances.

## Rejected alternative

Amazon EKS with a distributed Druid cluster was rejected for the current phase.
It provides better scaling and availability but conflicts with the chosen cost
and demonstration-simplicity priorities.

## Presentation summary

The architecture intentionally trades availability for cost: compute is a
replaceable single EC2 node, while analytical segments and metadata live in
durable AWS services. This provides a credible recovery path without paying for
a production-grade Druid cluster during an academic demonstration.
