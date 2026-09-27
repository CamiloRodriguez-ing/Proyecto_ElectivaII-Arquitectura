# Deployment Guide

Prerequisites: Python 3.11, Docker Desktop, AWS SAM CLI, and configured AWS credentials.

```powershell
sam validate --lint
sam build
sam deploy --guided
```

During the guided deployment set the exact Keycloak realm issuer, `academic-api` audience, Kafka bootstrap brokers, and network parameters. Do not deploy with placeholder identity or broker hostnames.

For later deployments:

```powershell
sam build
sam deploy
```

To roll back, use AWS CloudFormation to select a previous successful stack update, or deploy the last known-good commit with the same stack name. Confirm the change set before applying it.

The first academic demo uses `FRONTEND_ORIGIN=*` because the Cloudflare Pages hostname is assigned during deployment. The API does not use cookies or credentialed requests. After receiving the final Pages hostname, replace the wildcard with that exact origin for a stricter CORS policy.

## Identity deployment

Keycloak is deployed independently because it is a long-running identity platform, not a Lambda workload. Its Docker Compose topology, DNS/TLS requirements, multi-client configuration, and post-deployment checks are documented in [Keycloak Authentication and Authorization](authentication-keycloak.md#remote-deployment-single-node-academic-environment).

Deploy and verify Keycloak first. Configure `KeycloakIssuer` with the exact realm issuer and `KeycloakAudience=academic-api`. The SAM stack creates a REQUEST Lambda authorizer that validates Keycloak JWTs, protects every business route, leaves health public, permits the `Authorization` CORS header, and deploys a second role guard in each business Lambda.

The current development Keycloak hostname rejects connectivity from AWS. Its active public RS256 JWK is packaged in `src/functions/keycloak_authorizer/jwks.json`, allowing offline signature verification. Before and after every Keycloak key rotation, refresh this public file, run the authorizer tests, and redeploy; otherwise tokens signed by the new key are denied.

## Kafka deployment

For AWS-native Kafka, deploy [the MSK Serverless template](../infra/msk-serverless.yaml), obtain its IAM bootstrap brokers, and pass its subnet and security-group outputs to the SAM deployment. Full commands and topic settings are in [Kafka event integration](kafka-events.md#deploy-amazon-msk-serverless).

For local API work without a broker:

```powershell
sam local start-api --parameter-overrides KafkaEnabled=false
```

For MSK Serverless use `KafkaEnabled=true`, `KafkaSaslMechanism=AWS_MSK_IAM`, `UseKafkaVpc=true`, and the real broker, subnet and security-group values. Create all four topics before smoke testing.

The current `dev` deployment uses the existing external broker on port `9094` with `KafkaSecurityProtocol=PLAINTEXT` and `KafkaSaslMechanism=NONE` because the AWS account is not subscribed to Amazon MSK. This fallback is suitable only for development: it has neither transport encryption nor broker authentication. Enable MSK in the account and redeploy with IAM before treating the environment as production.

## Post-deployment verification

Verify in this order:

1. `GET /v1/health` returns `200` without a token.
2. A protected route returns `401` without a token.
3. A valid token with the wrong client role returns `403`.
4. A valid role returns the documented `2xx` response.
5. Kafka contains one correctly keyed, versioned event without student PII.
6. A deliberately unavailable broker yields `503 EVENT_PUBLISH_UNAVAILABLE`.
