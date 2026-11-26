# Student Requests Platform

Academic-request platform with Python/Lambda, Keycloak, PostgreSQL, a
transactional Kafka outbox, private documents, Apache Druid OLAP, and an
immutable pseudonymized S3 event archive. The complete flow runs locally with
Docker Compose and is prepared for an ephemeral AWS deployment.

## Local quick start

Prerequisite: Docker Engine and Docker Compose.

```bash
cp .env.example .env
docker compose up -d --build
docker compose --profile seed run --rm demo-seed
```

- Static Angular portal: <http://localhost:4200>
- API health: <http://localhost:8080/v1/health>
- Keycloak: <http://localhost:8081>
- Druid console: <http://localhost:8888>
- Kafka host endpoint: `localhost:19092`
- S3Mock: <http://localhost:9090>

The seed command is explicit, idempotent, and local/dev-only. It creates 300
synthetic requests across 12 months and three tenants through PostgreSQL and the
outbox. Expected analytical totals are in
[`analytics/demo-expected.json`](analytics/demo-expected.json).

Run backend checks:

```bash
.venv/bin/pytest -q
terraform -chdir=infra/terraform validate
```

The local realm includes `estudiante.sistemas`, `revisor.sistemas`,
`analista.sistemas`, and `admin.sistemas`; each local-only password is the first
word of the username.

Login uses the portal's own form and keeps tokens in `HttpOnly` cookies; it does
not redirect to Keycloak or use browser storage. Existing local Keycloak volumes
must be recreated once to import the confidential `academic-bff` client. See
[Authentication](docs/authentication-keycloak.md) before removing volumes.

## AWS deployment

The target is `us-east-1`/`dev`: private Druid `t3.large`, private Keycloak
`t4g.small`, shared RDS `db.t4g.small` with isolated databases/users, MSK
Serverless IAM, private S3 origins, and generated CloudFront HTTPS hostnames.
Human access uses AWS IAM Identity Center (SSO), never long-lived keys.

```bash
aws configure sso --profile academic-demo
aws sso login --profile academic-demo
AWS_PROFILE=academic-demo aws sts get-caller-identity
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
AWS_PROFILE=academic-demo terraform -chdir=infra/terraform plan -out=deployment.tfplan
```

Do not apply until the saved plan, current AWS pricing estimate, promotional
credit expiration, and budget email have been reviewed. The full environment is
limited to 48 hours and must be destroyed afterward. See
[Deployment](docs/deployment.md) for the approval and teardown runbook.
The current 48-hour planning estimate is documented in
[AWS cost estimate](docs/aws-cost-estimate.md); it is not a substitute for the
account-specific pre-apply review.

## Analytical API

- `GET /v1/analytics/summary`
- `GET /v1/analytics/cube/requests`
- `GET /v1/analytics/cube/equivalences`
- `GET /v1/analytics/cube/processing-times`

Every analytical route requires `ANALYST` or `ADMINISTRATOR`. Non-administrator
queries are tenant-scoped from the verified token. The browser sends no
operational dataset to these endpoints.

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment and SSO runbook](docs/deployment.md)
- [AWS cost estimate](docs/aws-cost-estimate.md)
- [Persistence and OLAP](docs/persistence-and-olap.md)
- [Kafka events](docs/kafka-events.md)
- [Authentication and custom login](docs/authentication-keycloak.md)
- [OpenAPI](docs/openapi.yaml)
- [Spanish presentation package](docs/presentacion-olap.md)
- [Architecture decisions](docs/ADR-008-druid-olap-platform.md)
