# Deployment Guide

## Complete local environment

Prerequisite: Docker Engine with the Compose plugin. The Compose project runs the Angular SSR frontend, the Lambda-compatible Python API, separate application and Keycloak PostgreSQL databases, an S3-compatible object store, and a single-node Redpanda Kafka-compatible broker.

```bash
cp .env.example .env
docker compose up --build
```

Wait until `api` and `keycloak` are healthy, then open <http://localhost:4200>. Keycloak is available at <http://localhost:8081>, API health at <http://localhost:8080/v1/health>, Kafka at `localhost:19092`, and the S3-compatible endpoint at <http://localhost:9090>. The `app-migrate` one-shot service applies the operational schema before API startup.

The realm fixture creates these local-only accounts:

| Username | Password | API role |
|---|---|---|
| `estudiante.sistemas` | `estudiante` | `STUDENT` |
| `revisor.sistemas` | `revisor` | `REVIEWER` |
| `analista.sistemas` | `analista` | `ANALYST` |
| `admin.sistemas` | `admin` | `ADMINISTRATOR` |

Use `docker compose logs -f api app-postgres keycloak kafka s3mock` to inspect the core services and `docker compose down` to stop them. Named volumes retain application, identity, Kafka, and object data. `docker compose down --volumes` irreversibly deletes all local project data and should only be used for an intentional reset.

The local API server is only an HTTP adapter. It invokes the same authorizer and route handlers used by Lambda, so domain behavior and Kafka event publication are not forked for development.

## AWS deployment with Terraform

Prerequisites: Terraform 1.5 or newer, Python 3, internet access for provider and Python package installation, and AWS credentials allowed to manage Lambda, IAM, API Gateway, CloudWatch, VPC, RDS, Secrets Manager, S3, and optionally MSK, Glue, Redshift Serverless, EventBridge, and the Redshift Data API.

```bash
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform fmt -check
terraform -chdir=infra/terraform validate
terraform -chdir=infra/terraform plan -out=deployment.tfplan
terraform -chdir=infra/terraform apply deployment.tfplan
terraform -chdir=infra/terraform output api_url
```

Terraform packages `src` and both SQL migrations during `plan`/`apply`. It creates one Lambda per route, the Keycloak REQUEST authorizer, HTTP API routes and CORS, IAM permissions, X-Ray tracing, retained CloudWatch log groups, a private two-AZ VPC, RDS PostgreSQL with a managed master secret and RDS Proxy, and a private encrypted/versioned document bucket. A deployment invocation applies the operational migration after the proxy target is ready.

Two Kafka deployment modes are supported:

- Existing broker: leave `create_msk_serverless=false` and set the bootstrap servers and security settings. Because persistent Lambdas run in the application VPC, the broker must be reachable from that VPC through peering, Transit Gateway, PrivateLink, VPN, or equivalent private routing.
- AWS-managed broker: set `create_msk_serverless=true` and `kafka_enabled=true`. Terraform creates MSK Serverless in the application VPC and selects IAM/SASL automatically.

To enable the analytical platform, set:

```hcl
analytics_enabled          = true
analytics_pseudonym_salt   = "a-long-deployment-specific-secret"
create_msk_serverless      = true
kafka_enabled              = true
```

Terraform then creates the analytics bucket, Kafka event source mapping, scheduled Glue transform, Redshift Serverless namespace/workgroup, warehouse migration, hourly loader, and cube APIs. The salt default is rejected when analytics is enabled. Keep it out of source control and shared shell history; use protected variable injection in automated deployments.

MSK Serverless topic administration still requires a Kafka administrative client with VPC access. Create the four topics documented in [Kafka event integration](kafka-events.md) before exercising protected endpoints.

`terraform.tfvars` and Terraform state can contain deployment details and are gitignored. Store shared state in an encrypted, locked remote backend before multiple people manage the environment; the repository intentionally does not hard-code an account-specific backend.

The existing SAM/CloudFormation deployment is not automatically adopted into Terraform state. Applying this configuration creates a separately managed deployment. If the same physical resources must be adopted instead, import each resource into Terraform state and verify a no-replacement plan before retiring the CloudFormation stack. Never let CloudFormation and Terraform manage the same resource concurrently.

To remove a Terraform-owned academic environment:

```bash
terraform -chdir=infra/terraform plan -destroy -out=destroy.tfplan
terraform -chdir=infra/terraform apply destroy.tfplan
```

Review the destroy plan carefully: it can delete the API, Lambdas, database, buckets in non-production, logs, warehouse, and a Terraform-managed MSK cluster/VPC. Production RDS deletion protection intentionally blocks accidental destruction.

## Legacy SAM workflow

The original SAM template is retained as a migration and comparison artifact. Terraform is the primary deployment path.

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
5. A document presigned PUT succeeds and the attached request returns a presigned download URL.
6. PostgreSQL contains the request plus one pending or published outbox row in the same transaction.
7. Kafka eventually contains one correctly keyed, versioned event without student PII; retrying a consumer event is harmless.
8. When analytics is enabled, raw S3 contains only pseudonymized identity fields, Glue produces Parquet, warehouse load succeeds, and each cube endpoint returns tenant-scoped data.
