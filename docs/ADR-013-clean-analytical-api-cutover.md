# ADR-013: Clean cutover to a Druid-backed analytical API

Status: Accepted

Date: 2026-11-25

## Context

The current dashboard loads operational requests into the browser and submits a
derived list to `POST /v1/analytics/summary`. The backend then summarizes the
client-provided payload. This route neither queries historical analytical data
nor guarantees that the submitted collection is complete or trustworthy.

The repository also declares three cube endpoints intended for the analytical
warehouse, but the frontend does not use them. There are no identified external
consumers that require compatibility with the payload-based summary operation.

## Decision

Perform a clean API cutover to Druid-backed read operations.

- Remove `POST /v1/analytics/summary` and its request payload contract.
- Add `GET /v1/analytics/summary`, calculated exclusively from Druid data in the
  authenticated tenant scope.
- Preserve the existing analytical resource paths and reimplement their queries
  for Druid:
  - `GET /v1/analytics/cube/requests`;
  - `GET /v1/analytics/cube/equivalences`;
  - `GET /v1/analytics/cube/processing-times`.
- Update the Angular dashboard to request the analytical summary and cube views
  without first downloading operational requests for calculation.
- Keep all analytical queries behind the application API. Druid will not be
  exposed to the browser.
- Update OpenAPI, route authorization, tests, examples, and presentation
  documentation in the same change.

## Rationale

The old operation models a calculation service rather than an OLAP query and
allows the client to choose the dataset. A clean cutover avoids maintaining a
misleading compatibility endpoint in a project with no known external API
consumer.

## Consequences

- This is an intentional breaking change within API version `v1`.
- Old clients that send `POST /v1/analytics/summary` will receive no supported
  analytical response and must migrate to `GET`.
- The dashboard will display event-derived historical data and may be eventually
  consistent with a request that was just submitted.
- Loading states must distinguish an empty cube from an unavailable or lagging
  analytical service.
- API tests must verify tenant enforcement and dimension/filter allowlists.

## Rejected alternative

Keeping the POST operation as a compatibility shim was rejected because ignoring
its payload would be misleading, while honoring the payload would preserve an
untrusted second source of analytical truth.

## Presentation summary

The browser no longer constructs analytics. It asks an authenticated read-only
API, the API applies tenant policy, and Druid calculates indicators over the
Kafka-derived historical dataset.
