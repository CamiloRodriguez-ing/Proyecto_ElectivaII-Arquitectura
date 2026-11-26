# ADR-011: Analytical model and privacy-safe event enrichment

Status: Accepted

Date: 2026-11-25

## Context

The existing dashboard calculates a small summary from operational request data
sent by the browser. Existing Kafka events are sufficient to count submitted
requests and review transitions, but review events do not carry the request type,
course pair, or credit values. Without those attributes, Druid cannot calculate
approval outcomes by equivalence directly from the event stream.

The analytical model must demonstrate meaningful OLAP operations while keeping
personal and document data outside the analytical platform.

## Decision

Implement the complete academic analytical model and enrich the event contracts
needed to build it directly from Kafka.

### Analytical views

#### Request outcomes

Grain: one academic request, using its latest known state.

Dimensions:

- event date and time hierarchy;
- tenant/engineering program;
- request type;
- current status.

Measures:

- distinct request count;
- approved, rejected, and changes-requested counts;
- approval and rejection rates;
- average resolution time.

#### Course equivalences

Grain: one academic request for a source-to-target course pair.

Dimensions:

- event date and time hierarchy;
- tenant/engineering program;
- request type and current status;
- source course and target course.

Measures:

- distinct request count;
- approved and rejected counts;
- requested source/target credits;
- approved credits.

#### Review processing

Grain: one review/status-transition event.

Dimensions:

- event date and time hierarchy;
- tenant/engineering program;
- reviewer role;
- decision;
- previous and new status.

Measures:

- distinct review count;
- changes-requested count;
- average response time from original submission to the review.

### Event contract evolution

Introduce new versioned analytical event contracts rather than changing the
meaning of existing version-1 events in place.

The request submission event will include:

- request ID, tenant ID, request type, and initial status;
- source and target course;
- source and target credits;
- submission timestamp;
- a pseudonymization source used only by the controlled ingestion boundary when
  a stable anonymous student key is required.

The review/status-change event will be enriched with:

- request ID and tenant ID;
- request type;
- source and target course;
- source and target credits;
- previous status, new status, decision, and reviewer role;
- submission and review timestamps.

The enrichment happens while the operational transaction already holds the
request row. Druid must not query operational PostgreSQL to complete events.

### Privacy boundary

Analytical events and Druid datasources will exclude:

- student name, email, and institutional code;
- reviewer identity;
- observations and free-form text;
- document names, contents, object keys, and URLs;
- access tokens and credentials.

Tenant identity is retained because it is required for authorization and
aggregation. Stable person identifiers, if used, must be pseudonymized before
they reach durable analytical storage.

### Freshness

Use Druid native Kafka streaming ingestion. Under normal demonstration load,
accepted Kafka events should become queryable within 60 seconds. This is an
operational target rather than a synchronous API guarantee: an operational
transaction remains successful if the analytical path is temporarily delayed.

## Consequences

- The dashboard will obtain historical indicators from the analytical API, not
  from a browser-submitted copy of operational requests.
- Event schemas, examples, producer tests, Druid ingestion specifications, and
  analytical queries must evolve together.
- Metrics based on the latest request state must not double-count status-change
  events. Queries must use the stable request ID and latest event time.
- At-least-once outbox delivery must not double-count a repeated `event_id`.
- Late events must be accepted and assigned by their event time.
- Every non-administrator analytical query must enforce the tenant from the
  authenticated token rather than accepting tenant scope from the browser.

## Presentation summary

The cube analyzes three related business perspectives: request outcomes, course
equivalence results, and review performance. Kafka events are deliberately made
self-contained for analytics, allowing Druid to remain independent from the
operational database while preserving privacy and tenant isolation.
