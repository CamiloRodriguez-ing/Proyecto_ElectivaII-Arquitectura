# ADR-006: Kafka events through Amazon MSK Serverless

Status: Accepted and implemented

## Decision

Protected route Lambdas publish minimal versioned events to Kafka after successful domain execution. Amazon MSK Serverless with IAM authentication is the AWS deployment target. Producers reuse connections across warm invocations, request acknowledgement from all in-sync replicas, and fail the HTTP operation with `503` when publication is not acknowledged.

Kafka is explicitly enabled per environment after broker networking and topics exist; local and incomplete deployments keep publication disabled.

The service currently has no database, so direct synchronous publication is the only consistency boundary. Consumers are idempotent because retries can produce duplicates. A transactional outbox becomes mandatory when durable request state is added.

## Consequences

- Each endpoint remains independently deployable and scalable.
- Event publishing adds Kafka latency to protected write requests.
- Lambda networking must reach the brokers; MSK Serverless requires Lambda VPC attachment.
- Event schemas are versioned and exclude unnecessary personal data.
