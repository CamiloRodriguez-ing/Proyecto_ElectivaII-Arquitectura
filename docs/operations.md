# Operations Guide

Every response includes a correlation `request_id`. Application logs must be structured JSON and must not include student names, email addresses, document names, or complete request bodies.

This stage has no persistent storage, authentication, email delivery, attachment storage, or asynchronous processing. `DEMO_MODE=true` indicates academic demonstration behavior and must not be treated as production security.

Monitor Lambda invocation errors, duration, and API Gateway 4xx/5xx responses through the AWS-managed service logs when deployed.

## Target identity operations

Once [Keycloak authentication](authentication-keycloak.md) is implemented, additionally monitor failed logins, administrative events, confidential-client use, token validation failures, `401`/`403` rates, readiness, container restarts, certificate expiry, identity-database backups, and disk usage. Authorization headers, tokens, passwords, and client secrets must never be written to application or proxy logs.
