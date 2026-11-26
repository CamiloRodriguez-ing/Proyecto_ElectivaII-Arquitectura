# Kafka Event Integration

## Topics and producers

| Operation | Topic | Event type | Key |
|---|---|---|---|
| create request | `academic-requests` | `request.submitted.v2` | request ID |
| evaluate request | `academic-reviews` | `request.status_changed.v2` | request ID |
| validation preview | `academic-requests` | `request.validated.v1` | subject |
| notification preview | `academic-notifications` | `notification.previewed.v1` | subject |

The analytical `GET` endpoints do not publish events. Request and review events
originate in the transactional outbox. Acknowledgement uses `acks=all`; an event
can be delivered more than once if the process fails after broker acknowledgement
and before updating the outbox.

## Version-2 envelope

```json
{
  "event_id": "stable-uuid",
  "event_type": "request.status_changed.v2",
  "occurred_at": "2026-11-25T18:00:00Z",
  "source": "academic-requests-api",
  "schema_version": 2,
  "correlation_id": "request-correlation-id",
  "aggregate_type": "request",
  "aggregate_id": "request-uuid",
  "tenant_id": "sistemas",
  "actor": {"id": "trusted-keycloak-subject", "roles": ["REVIEWER"]},
  "data": {
    "request_id": "request-uuid",
    "type": "CREDIT_TRANSFER",
    "source_course": "CALCULO-I",
    "target_course": "MATEMATICAS-I",
    "source_credits": 4,
    "target_credits": 4,
    "previous_status": "SUBMITTED",
    "new_status": "APPROVED",
    "decision": "APPROVE",
    "reviewer_role": "REVIEWER",
    "submitted_at": "2026-11-23T18:00:00Z",
    "occurred_at": "2026-11-25T18:00:00Z"
  }
}
```

Druid explicitly flattens only analytical fields. The archive consumer hashes
the actor and optional owner source. Names, emails, student codes, observations,
documents, URLs, and tokens are not part of the analytical contract.

## Consumers

- Druid uses one native Kafka supervisor with the pattern
  `academic-requests|academic-reviews`, one ingestion task, and earliest offsets
  for the first run.
- The archive consumer uses an independent group and writes one S3 object per
  event ID. `If-None-Match: *` makes the write create-only; reprocessing reports
  the existing object as a duplicate and never replaces its bytes.
- Both consumers monitor their own lag and do not share offsets.

## Local broker

Redpanda provides a Kafka-compatible endpoint inside Docker at `kafka:9092` and
from the host at `localhost:19092`. `kafka-init` creates the three topics. The API,
outbox worker, Druid, and archive consumer all use the internal endpoint.

## Amazon MSK Serverless

Terraform creates the two-AZ MSK Serverless cluster when
`create_msk_serverless=true`. Clients use `SASL_SSL` port 9098 and IAM:

- Python producers generate OAUTHBEARER tokens with their Lambda role.
- Druid's pinned image adds the official `aws-msk-iam-auth` uber JAR and uses
  `AWS_MSK_IAM` with the EC2 instance role.
- Security groups allow only Lambda and Druid sources to the broker.

Terraform invokes a private, IAM-authenticated bootstrap Lambda after MSK is
ready. It idempotently creates the three topics with two partitions each and the
broker-managed replication factor; the deployment does not depend on automatic
topic creation or an SSH session. Recommended demo retention is 48 hours or more
than the planned environment lifetime.

## Operational checks

Monitor oldest pending outbox age, publication attempts/errors, MSK authentication
failures, per-consumer lag, Druid supervisor health, and S3 archive counts. Never
log full event payloads or credentials.
