# Kafka event integration

## Implemented architecture

State-changing request and review Lambdas persist a versioned event envelope in `outbox_events` in the same transaction as operational data. A scheduled publisher uses row locks to claim pending envelopes and publishes with `acks=all`; success records `published_at`, while a broker failure records the error and leaves the row retryable. Stateless validation/preview operations retain direct publication when Kafka is enabled.

The safe local/template default is `KAFKA_ENABLED=false`. A deployed event-producing environment must explicitly set `KafkaEnabled=true` together with reachable broker and network settings; this prevents an incomplete broker configuration from making every business route return `503`.

| Route | Topic | Event type | Partition key |
|---|---|---|---|
| `POST /v1/requests/validate` | `academic-requests` | `request.validated.v1` | Keycloak subject |
| `POST /v1/requests/prepare` | `academic-requests` | `request.submitted.v1` | request ID (outbox) |
| `POST /v1/reviews/evaluate` | `academic-reviews` | `request.status_changed.v1` | request ID (outbox) |
| `POST /v1/notifications/preview` | `academic-notifications` | `notification.previewed.v1` | Keycloak subject |
| `POST /v1/analytics/summary` | `academic-analytics` | `analytics.summarized.v1` | Keycloak subject |

Events contain `event_id`, `event_type`, `occurred_at`, `source`, `schema_version`, `correlation_id`, aggregate and tenant identifiers, the trusted Keycloak actor, and a minimal event-specific `data` object. Student names, email addresses, document names, access tokens, and complete HTTP bodies are deliberately excluded. The analytics ingestion projection hashes actor and owner identifiers before writing S3.

## Deploy Amazon MSK Serverless

The optional infrastructure template creates an isolated two-AZ VPC, a self-referencing security group and an IAM-authenticated MSK Serverless cluster:

```bash
aws cloudformation deploy \
  --template-file infra/msk-serverless.yaml \
  --stack-name academic-events-dev

CLUSTER_ARN=$(aws cloudformation describe-stacks \
  --stack-name academic-events-dev \
  --query "Stacks[0].Outputs[?OutputKey=='ClusterArn'].OutputValue" \
  --output text)

aws kafka get-bootstrap-brokers --cluster-arn "$CLUSTER_ARN"
```

Use `BootstrapBrokerStringSaslIam` from the last command. Also copy the `LambdaSubnetIds` and `LambdaSecurityGroupIds` stack outputs into the application deployment parameters:

```bash
sam deploy --guided \
  --parameter-overrides \
    KafkaEnabled=true \
    KafkaBootstrapServers='b-1....amazonaws.com:9098,b-2....amazonaws.com:9098' \
    KafkaSaslMechanism=AWS_MSK_IAM \
    UseKafkaVpc=true \
    KafkaSubnetIds='subnet-a,subnet-b' \
    KafkaSecurityGroupIds='sg-123'
```

The application template grants the producer Lambdas `Connect`, `DescribeTopic` and `WriteData`. Narrow the wildcard resources to the deployed cluster and topic ARNs after the first deployment, when the generated MSK cluster UUID is known.

Create the four topics from an administrative client placed in the VPC. Recommended demonstration settings are three partitions, replication managed by MSK Serverless, `cleanup.policy=delete`, and a retention appropriate to the environment. Automatic topic creation must not be relied upon in production.

## Connectivity and authentication

- MSK Serverless uses `SASL_SSL` on port `9098` with IAM/OAUTHBEARER tokens generated from the Lambda execution role.
- Attach only event-producing Lambdas to the MSK VPC. The public health Lambda remains outside it.
- The isolated VPC needs no NAT gateway for MSK traffic. The Keycloak Lambda authorizer uses the packaged public JWK described in the authentication guide; refreshing that key from Keycloak requires outbound HTTPS connectivity.
- For an externally hosted Kafka service, set `UseKafkaVpc=false` and select its SASL mechanism. Use `NONE` only for an isolated development broker; it provides no transport or identity protection. PLAIN/SCRAM credentials can be loaded from Secrets Manager through `KAFKA_CREDENTIALS_SECRET_ID`; grant that secret explicitly to the Lambda role before using it.

## Delivery semantics

Outbox publication is asynchronous and at least once. A process can publish and fail before recording `published_at`, so consumers must enforce uniqueness on `event_id`. The outbox makes the database change and event intent atomic, but it does not promise exactly-once broker delivery. Broker outages delay events without rejecting already committed HTTP writes.

Monitor pending outbox age/count, attempts and `last_error`, publisher errors/duration, MSK connection/authentication failures, topic bytes, and consumer lag. Alert when the oldest pending event exceeds the agreed service level. Never log payloads containing identity or academic data.

## Authoritative references

- [AWS: Configure clients for IAM access control](https://docs.aws.amazon.com/msk/latest/developerguide/configure-clients-for-iam-access-control.html)
- [AWS: MSK Serverless CloudFormation resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-msk-serverlesscluster.html)
- [AWS: IAM access control requirements for MSK](https://docs.aws.amazon.com/msk/latest/developerguide/iam-access-control.html)
