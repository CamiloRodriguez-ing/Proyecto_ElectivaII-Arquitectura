# ADR-022: Deterministic synthetic analytical dataset

Status: Accepted

Date: 2026-11-25

## Context

An empty event stream cannot demonstrate time hierarchies, course-equivalence
outcomes, review performance, tenant isolation, or Druid rollups. Manually
creating enough records during a presentation would be slow and would produce no
meaningful historical distribution.

The AWS environment is ephemeral, so demonstration data must be reproducible
after infrastructure re-creation without retaining billable cloud resources.

## Decision

Provide an explicit, deterministic, idempotent synthetic dataset generator for
`local` and `dev` only.

- Generate approximately 300 academic requests over the previous twelve months.
- Distribute records across the Sistemas, Minas, and Electrónica tenants.
- Include multiple course pairs, credit values, statuses, decisions, reviewer
  roles, resolution times, and changes-requested cycles.
- Use fixed generation rules and stable identifiers so rerunning the same dataset
  version does not create duplicates.
- Insert coherent operational request/review state and transactional outbox
  intent so events follow the normal publisher, Kafka, archive, and Druid path.
- Do not call Druid directly or write analytical segments from the generator.
- Use invented academic values and synthetic subjects only. Do not generate
  realistic names, email addresses, institutional student codes, observations,
  or document contents.
- Require an explicit local command or Terraform-controlled one-shot invocation and reject execution when
  `APP_ENV` is not `local` or `dev`.
- Do not expose a public HTTP seed endpoint.
- Emit a dataset version and expected aggregate manifest so end-to-end tests can
  compare Druid results with deterministic totals.

## Rationale

The generator makes the analytical demonstration repeatable and validates the
real event path rather than bypassing Kafka. Stable IDs and expected totals turn
the presentation fixture into an integration-test oracle.

## Consequences

- Operational screens and analytical views can show coherent demonstration
  records.
- Historical timestamps are intentionally synthetic and must be visibly labeled
  as demonstration data.
- Dataset contract changes require a new dataset version and updated expected
  aggregates.
- The AWS seed task must run only after infrastructure health checks and before
  the presentation smoke test.
- Teardown can remove all cloud data because the dataset is reconstructible.

## Presentation summary

The dashboard is populated by a controlled twelve-month academic scenario, but
every aggregate still travels through the same transaction, outbox, Kafka,
archive, and Druid stages as live data.
