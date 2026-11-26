# ADR-016: Complete AWS hosting scope

Status: Accepted

Date: 2026-11-25

## Context

The existing Terraform configuration primarily covers the API, operational
database, object storage, Kafka, and the previous analytical path. The Angular
frontend was expected to use an external static host, and Keycloak was documented
as an independently deployed external service.

The deployment goal is now to demonstrate the complete system inside AWS rather
than only moving the backend and OLAP pipeline.

## Decision

The Terraform-managed `dev` environment in `us-east-1` will include:

- the Angular frontend and its HTTPS delivery layer;
- Keycloak and its durable PostgreSQL state;
- API Gateway, Lambda functions, and authorization integration;
- the operational PostgreSQL database and RDS Proxy;
- private document storage in S3;
- Amazon MSK Serverless and Kafka event publication;
- the pseudonymized raw analytical archive in S3;
- Apache Druid on a single EC2 instance with S3 deep storage and PostgreSQL
  metadata;
- CloudWatch logs, health checks, and deployment outputs needed for an
  end-to-end demonstration.

All public browser entry points must use HTTPS. Druid, databases, MSK, and
management endpoints remain private. Terraform is the source of truth for the
AWS topology; manual console configuration is limited to explicitly documented
bootstrap or credential steps that cannot be safely automated.

## Rationale

Hosting every runtime layer in AWS makes the final demonstration match the
deployment diagrams and removes dependencies on unrelated hosting providers.
It also allows Terraform outputs and smoke tests to describe one reproducible
environment.

## Consequences

- Terraform must add frontend delivery and Keycloak compute resources.
- The current external Keycloak issuer and frontend-host documentation become
  migration artifacts rather than the target architecture.
- Keycloak migration must update issuer, redirect URIs, web origins, realm
  bootstrap, and the API authorizer configuration together.
- The AWS plan will include more ongoing cost than an analytics-only deployment.
- Public DNS/TLS naming and the low-cost Keycloak hosting topology require a
  separate decision.

## Presentation summary

The demonstration has a single cloud boundary: the browser reaches AWS-hosted
frontend and identity endpoints, while all transaction, event, archive, and OLAP
processing runs in private AWS infrastructure managed by Terraform.
