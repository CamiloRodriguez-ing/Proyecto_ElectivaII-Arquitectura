# ADR-023: Spanish presentation package with English technical artifacts

Status: Accepted

Date: 2026-11-25

## Context

[ADR-004](ADR-004-english-technical-artifacts.md) requires repository technical
documentation, identifiers, contracts, code, and tests to use English. The final
academic presentation will be delivered in Spanish, and the decision records are
intended to provide evidence and source material for that presentation.

## Decision

- Keep source code, event/API contracts, tests, infrastructure definitions,
  operational guides, and ADRs in English.
- Create a Spanish presentation package that synthesizes rather than translates
  every technical file.
- The package will include:
  - the problem, objective, and scope;
  - local and AWS architecture diagrams;
  - the PostgreSQL outbox to Kafka, S3 archive, and Druid data journey;
  - OLAP grains, dimensions, measures, and example slice-and-dice questions;
  - the decision timeline and rejected alternatives;
  - privacy, tenant isolation, idempotency, and recovery controls;
  - the cost model, promotional-credit constraint, and 48-hour deployment plan;
  - a repeatable demonstration script using the synthetic dataset;
  - test and deployment evidence collected after implementation;
  - known limitations and the production evolution path.
- Link every presentation claim to the relevant ADR, test, configuration, or
  captured evidence so the material remains auditable.
- Clearly label synthetic data and the non-high-availability `dev` topology.

## Rationale

English technical artifacts preserve repository consistency, while a focused
Spanish narrative makes the architecture accessible to the intended academic
audience without duplicating every maintenance document.

## Consequences

- Presentation material must be updated when an accepted ADR changes.
- Screenshots and deployment outputs cannot be finalized until the corresponding
  local or AWS verification succeeds.
- The Spanish package is explanatory; English contracts and runbooks remain the
  implementation source of truth.

## Presentation summary

The repository remains technically consistent in English and produces a
traceable Spanish narrative designed for the final defense.
