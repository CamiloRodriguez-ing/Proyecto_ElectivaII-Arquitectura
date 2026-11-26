# ADR-014: Local analytics resource profile

Status: Accepted

Date: 2026-11-25

## Context

Apache Druid adds several JVM processes and therefore materially increases the
memory requirements of the complete Docker environment. The demonstration will
run on the current workstation, which has approximately 31 GiB of RAM, 12 CPU
threads, and sufficient Docker support. Supporting an 8 GiB development machine
is not a project requirement.

Demonstration simplicity is more important than minimizing local resource usage.

## Decision

Optimize the complete local environment for the 31 GiB demonstration machine.

- One documented `docker compose up --build` workflow will start the operational
  application, Redpanda, the S3-compatible service, Keycloak, and the compact
  Druid topology required for analytics.
- The analytical services will start by default rather than requiring an
  optional Compose profile.
- Druid JVM heap and direct-memory limits will be explicitly configured and the
  total analytical allocation will target approximately 6-8 GiB.
- Containers will have health checks and dependency conditions so ingestion
  supervisors are installed only after Kafka and Druid are ready.
- Named volumes will preserve broker, metadata, object, and Druid state across
  normal restarts.
- Documentation will state a practical local minimum of 16 GiB RAM and recommend
  the 31 GiB demonstration workstation. An 8 GiB machine is outside the
  supported complete-stack profile.
- A smoke test will verify the path from a business operation through Kafka to a
  Druid-backed API response before the environment is considered ready.

## Rationale

Starting the complete system with one command reduces presentation risk and
makes the architectural flow observable without manual profile switching. The
selected workstation has enough memory to favor predictable JVM behavior over
aggressive downsizing.

## Consequences

- The complete stack may fail or swap heavily on smaller machines.
- Image downloads and named volumes require several gigabytes of disk, so the
  deployment guide must include a preflight disk-space check.
- Explicit resource limits and pinned image versions are required for repeatable
  demonstrations.
- CI tests should separate fast unit/contract tests from the heavier Docker
  end-to-end analytics test.

## Presentation summary

The local environment is intentionally a complete architectural demonstration,
not a minimal laptop profile. One Compose command starts the transaction,
eventing, archival, OLAP, API, identity, and frontend layers.
