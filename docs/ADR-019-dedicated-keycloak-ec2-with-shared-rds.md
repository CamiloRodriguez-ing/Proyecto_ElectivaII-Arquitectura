# ADR-019: Dedicated Keycloak EC2 instance with shared RDS infrastructure

Status: Accepted

Date: 2026-11-25

## Context

The complete AWS scope requires Keycloak to run in AWS. The deployment prioritizes
cost and demonstration simplicity, but identity must not compete with Druid for
memory or make an OLAP restart an authentication outage.

Creating a separate RDS instance for each workload would add cost. The expected
academic traffic is low enough for one PostgreSQL instance to host isolated
logical databases when permissions, credentials, connections, and backup
procedures are explicit.

## Decision

Run Keycloak on its own single EC2 instance and use the existing RDS PostgreSQL
instance as shared physical database infrastructure.

- Keycloak and Druid will run on different EC2 instances.
- The Keycloak instance will be a CloudFront VPC origin and will not expose its
  management or health ports publicly.
- Keycloak will run in production mode from a version-pinned container image.
- The RDS instance will contain separate logical databases and roles for:
  - operational application data;
  - Keycloak identity data;
  - Druid metadata.
- Each role will have access only to its own database and schema. Credentials
  will be generated and stored in AWS Secrets Manager.
- Application Lambdas will continue through RDS Proxy. Long-running Keycloak and
  Druid connections will use private direct database endpoints with bounded
  pools appropriate to the small RDS instance.
- Terraform/bootstrap automation will import or reconcile the development realm,
  configure exact CloudFront redirect/origin values, and remove bootstrap admin
  credentials after a permanent administrator is available.
- RDS backup and restore documentation must cover all three logical workloads.

## Rationale

A dedicated small compute instance isolates the identity service from Druid's
JVM and analytical workload. Sharing only RDS physical capacity avoids paying for
three database instances while retaining strong logical access boundaries.

## Consequences

- Keycloak remains a single point of failure suitable for `dev`, not a
  highly-available production identity deployment.
- RDS sizing and connection limits must account for all three workloads.
- An RDS outage affects transactions, identity, and Druid metadata; logical
  isolation is not availability isolation.
- Database creation and grants require a controlled bootstrap step using the RDS
  administrator secret.
- A future production environment can split the databases without changing the
  application-level contracts.

## Rejected alternatives

- Co-locating Keycloak with Druid was rejected because it couples identity
  availability and resource pressure to the analytical engine.
- ECS/Fargate was rejected for the current phase because the additional service
  and networking cost does not improve the single-node academic availability
  target.

## Presentation summary

Identity and analytics have separate compute failure domains, while one managed
PostgreSQL service is divided into least-privilege logical databases to control
cost.
