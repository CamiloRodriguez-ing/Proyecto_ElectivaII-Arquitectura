# ADR-010: Amazon MSK Serverless with IAM authentication for Druid

Status: Accepted

Date: 2026-11-25

## Context

The local environment uses Redpanda as a Kafka-compatible broker. The AWS
deployment needs a managed Kafka service that minimizes broker operations and
integrates with the single-node Druid deployment selected by
[ADR-009](ADR-009-single-node-druid-on-aws.md).

The repository already contains Terraform support for Amazon MSK Serverless and
IAM-authenticated event producers. Druid's Kafka ingestion runs on a JVM, so it
can use the AWS-provided IAM authentication library when that library is placed
on the Kafka client's classpath.

## Decision

Use Amazon MSK Serverless with IAM authentication and authorization.

- Druid will use `SASL_SSL` and the `AWS_MSK_IAM` SASL mechanism.
- A custom, version-pinned Druid image will add the official
  `aws-msk-iam-auth` library to the Kafka client classpath.
- Druid will obtain temporary AWS credentials from the EC2 instance profile.
  Static AWS access keys will not be stored in images, Compose files, Terraform
  variables, or Druid ingestion specifications.
- The Druid EC2 role will receive least-privilege permissions to connect to the
  selected MSK cluster, describe topics and consumer groups, and read only the
  analytical source topics.
- Existing producer roles will retain separate write permissions. Druid's read
  role will not be reused by application producers.
- Local Druid ingestion will continue to use `PLAINTEXT` against Redpanda on the
  private Docker network. The datasource schema will remain identical; only
  Kafka connection and authentication properties will vary by environment.
- Terraform and deployment validation will verify network reachability, IAM
  policy scope, plugin availability, and supervisor health.

## Rationale

MSK Serverless avoids operating Kafka brokers and aligns with the existing AWS
infrastructure. IAM removes long-lived broker credentials and allows the EC2
instance profile to be the workload identity. The additional custom-image step
is acceptable because it is deterministic and can be tested before deployment.

## Consequences

- The Druid image becomes a project artifact and must pin both Druid and the IAM
  authentication library versions.
- An image build or classpath error can prevent Kafka supervisors from starting;
  this requires an explicit startup/integration check.
- MSK Serverless requires private VPC connectivity and IAM access control.
- Local and AWS connection configuration differ, so both profiles require
  automated tests.
- Container logs must not enable credential debug output outside controlled
  troubleshooting because it can reveal workload identity details.

## Rejected alternatives

- MSK Provisioned with SASL/SCRAM was rejected because it adds fixed broker and
  secret-management overhead without improving the academic demonstration.
- Co-locating Redpanda with Druid on the EC2 instance was rejected because a
  single host failure would remove both the event log and the analytical engine,
  and it would not demonstrate the intended managed AWS event backbone.

## References

- [AWS MSK IAM authentication library](https://github.com/aws/aws-msk-iam-auth)
- [Amazon MSK Serverless client setup](https://docs.aws.amazon.com/msk/latest/developerguide/create-serverless-cluster-client.html)
- [Apache Druid Kafka ingestion](https://druid.apache.org/docs/latest/ingestion/kafka-ingestion/)
