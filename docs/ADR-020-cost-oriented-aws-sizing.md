# ADR-020: Cost-oriented AWS sizing for the development demonstration

Status: Accepted

Date: 2026-11-25

## Context

The AWS environment is a real academic `dev` deployment, not a highly available
production platform. It must run the complete demonstration predictably while
keeping continuous compute cost low. Druid requires substantially more memory
than Keycloak, and the shared PostgreSQL instance must serve three low-volume
logical databases.

## Decision

Use the following initial burstable, Single-AZ sizing in `us-east-1`:

| Workload | AWS size | Capacity | Purchase model |
|---|---|---|---|
| Apache Druid | `t3.large` | 2 vCPU, 8 GiB RAM | On-Demand |
| Keycloak | `t4g.small` | 2 vCPU, 2 GiB RAM | On-Demand |
| PostgreSQL RDS | `db.t4g.small` | 2 vCPU, 2 GiB RAM | On-Demand, Single-AZ |

- Druid will use x86-64 to minimize custom-image and JVM/plugin compatibility
  risk. Its memory configuration will remain within the 8 GiB host boundary.
- Keycloak will use the official ARM64-capable image on Graviton.
- EC2 instances will not use Spot capacity because interruption during the
  presentation is a greater risk than the small demonstration saving.
- Instance classes, EBS sizes, and Druid memory limits will be Terraform
  variables with these values as `dev` defaults.
- CloudWatch alarms and smoke tests will detect memory, CPU-credit, storage, and
  database-connection pressure. Upsizing requires evidence from those checks.
- The deployment guide will include safe start/stop procedures for EC2 resources
  when the demonstration environment is not in use.

## Rationale

The sizes provide the minimum practical separation selected in earlier ADRs:
Druid gets 8 GiB, Keycloak gets a dedicated small JVM host, and PostgreSQL moves
from the previous 1 GiB default to 2 GiB to accommodate three bounded connection
pools. On-Demand capacity makes the scheduled demonstration deterministic.

## Consequences

- This topology has limited burst credits and no redundancy.
- Druid ingestion or compaction may need throttling to stay within two vCPUs.
- Keycloak and RDS connection pools must be explicitly small.
- A load test can require a temporary size increase before deployment approval;
  the Terraform plan will make that cost-bearing change visible.
- Stopping EC2 reduces compute charges but makes authentication and analytics
  unavailable until health checks pass after restart.

## Presentation summary

Each persistent workload is sized according to its memory role, not with a
production cluster. Burstable On-Demand instances deliver a predictable demo
while Terraform variables preserve a clear scaling path.

## References

- [Amazon EC2 T3 specifications](https://aws.amazon.com/ec2/instance-types/t3/)
- [Amazon RDS instance specifications](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.Summary.html)
