# ADR-018: Static Angular application on S3 and CloudFront

Status: Accepted; authentication details amended by ADR-025

Date: 2026-11-25

## Context

The Angular project currently builds an SSR Node.js application for the local
Docker environment. Its business functionality, API access, OAuth authorization
code flow, and token handling execute in the browser. The server configuration
already replaces OAuth behavior with a mock during SSR, and no required route
depends on server-side rendering.

Keeping SSR in AWS would require an additional continuously running Node.js
service without a demonstrated functional or SEO requirement.

## Decision

Build the production frontend as a static Angular single-page application and
host it in a private S3 bucket behind CloudFront.

- Configure the production Angular build for static browser output.
- Keep the local development server available for focused frontend work, while
  the complete Docker demonstration may serve the same static artifact through a
  lightweight web server.
- Block all public access to the S3 bucket and grant CloudFront access through
  Origin Access Control.
- Redirect viewers to HTTPS.
- Configure SPA route fallback so application routes resolve to `index.html`
  without making the bucket public or using the S3 website endpoint.
- Publish a small runtime configuration artifact containing the same-origin API
  base path and presentation tenant settings.
- Do not place identity endpoints, tokens, or secrets in runtime frontend
  configuration. ADR-025 replaces the earlier public OAuth-client decision with
  a backend auth facade and HttpOnly cookies.
- Invalidate only the required CloudFront paths after a deployment. Hashed
  application assets may use long-lived immutable caching, while `index.html`
  and runtime configuration use short or no caching.

## Rationale

Static hosting removes a server, lowers cost, reduces the patching surface, and
matches the actual browser-only requirements. Runtime configuration resolves the
CloudFront-generated hostname dependency without rebuilding source code by hand.

## Consequences

- SSR-specific files become development or migration artifacts and are removed
  from the production delivery path.
- Search-engine rendering is client-side; this is acceptable for an
  authenticated institutional portal.
- Terraform and the deployment workflow must upload frontend artifacts and issue
  targeted CloudFront invalidations.
- Frontend tests must verify configuration loading before session restoration
  and API calls.

## Rejected alternative

Running Angular SSR on ECS or EC2 was rejected because it adds continuous
compute cost and operations without a project requirement for server rendering.

## Presentation summary

The public portal is a private S3 artifact delivered globally over CloudFront.
Only dynamic business and analytical operations reach the API; no frontend
application server is required.
