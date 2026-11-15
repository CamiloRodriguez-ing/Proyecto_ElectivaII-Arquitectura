# Deployment Guide

## Complete local environment

Prerequisite: Docker Engine with the Compose plugin. The Compose project runs the Angular SSR frontend, the Lambda-compatible Python API, Keycloak backed by PostgreSQL, and a single-node Redpanda Kafka-compatible broker.

```bash
cp .env.example .env
docker compose up --build
```

Wait until `api` and `keycloak` are healthy, then open <http://localhost:4200>. Keycloak is available at <http://localhost:8081>, API health at <http://localhost:8080/v1/health>, and Kafka at `localhost:19092` for host-side inspection.

The realm fixture creates these local-only accounts:

| Username | Password | API role |
|---|---|---|
| `estudiante.sistemas` | `estudiante` | `STUDENT` |
| `revisor.sistemas` | `revisor` | `REVIEWER` |
| `analista.sistemas` | `analista` | `ANALYST` |
| `admin.sistemas` | `admin` | `ADMINISTRATOR` |

Use `docker compose logs -f api keycloak kafka` to inspect the core services and `docker compose down` to stop them. Named volumes retain identity and Kafka data. If the realm fixture changes and a clean re-import is required, remove the local volumes explicitly with `docker compose down --volumes`; this irreversibly deletes only the Compose project's local Keycloak and Kafka data.

The local API server is only an HTTP adapter. It invokes the same authorizer and route handlers used by Lambda, so domain behavior and Kafka event publication are not forked for development.

## AWS deployment with Terraform

Prerequisites: Terraform 1.5 or newer, Python 3, internet access for provider and Python package installation, and AWS credentials allowed to manage Lambda, IAM, API Gateway, CloudWatch, EC2 networking, and optionally MSK.

```bash
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform fmt -check
terraform -chdir=infra/terraform validate
terraform -chdir=infra/terraform plan -out=deployment.tfplan
terraform -chdir=infra/terraform apply deployment.tfplan
terraform -chdir=infra/terraform output api_url
```

Terraform packages `src` and its Lambda dependencies during `plan`/`apply`, creates one Lambda per route, the Keycloak REQUEST authorizer, HTTP API routes and CORS, IAM permissions, X-Ray tracing, and retained CloudWatch log groups.

Two Kafka deployment modes are supported:

- Existing broker: leave `create_msk_serverless=false` and set the bootstrap servers, security protocol, SASL mechanism, VPC subnets, and security groups as applicable.
- AWS-managed broker: set `create_msk_serverless=true` and `kafka_enabled=true`. Terraform creates an isolated two-AZ VPC and MSK Serverless cluster, selects IAM/SASL automatically, and attaches only event-producing Lambdas to that VPC.

MSK Serverless topic administration still requires a Kafka administrative client with VPC access. Create the four topics documented in [Kafka event integration](kafka-events.md) before exercising protected endpoints.

`terraform.tfvars` and Terraform state can contain deployment details and are gitignored. Store shared state in an encrypted, locked remote backend before multiple people manage the environment; the repository intentionally does not hard-code an account-specific backend.

The existing SAM/CloudFormation deployment is not automatically adopted into Terraform state. Applying this configuration creates a separately managed deployment. If the same physical resources must be adopted instead, import each resource into Terraform state and verify a no-replacement plan before retiring the CloudFormation stack. Never let CloudFormation and Terraform manage the same resource concurrently.

To remove a Terraform-owned academic environment:

```bash
terraform -chdir=infra/terraform plan -destroy -out=destroy.tfplan
terraform -chdir=infra/terraform apply destroy.tfplan
```

Review the destroy plan carefully: it deletes the API, Lambdas, logs, and a Terraform-managed MSK cluster/VPC when enabled.

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
5. Kafka contains one correctly keyed, versioned event without student PII.
6. A deliberately unavailable broker yields `503 EVENT_PUBLISH_UNAVAILABLE`.
