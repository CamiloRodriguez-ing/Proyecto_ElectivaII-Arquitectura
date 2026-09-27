# Operations Guide

Every response includes a correlation `request_id`. Application logs must be structured JSON and must not include student names, email addresses, document names, or complete request bodies.

The service has no application persistence, email delivery, or attachment storage. Keycloak protects business routes and Kafka receives operation events; neither system stores academic request state for this API.

Monitor Lambda invocation errors and duration, API Gateway 401/403/5xx responses, Kafka authentication and connection failures, broker metrics, and consumer lag.

## Identity operations

Monitor failed logins, administrative events, confidential-client use, token validation failures, `401`/`403` rates, readiness, container restarts, certificate expiry, identity-database backups, and disk usage. Authorization headers, tokens, passwords, and client secrets must never be written to application or proxy logs.
