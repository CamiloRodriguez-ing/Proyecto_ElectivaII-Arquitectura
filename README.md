# Student Requests Platform

Persistent academic-request platform implemented with Python, one AWS Lambda per endpoint, API Gateway HTTP API, Keycloak authorization, PostgreSQL/RDS Proxy, private S3 document storage, a transactional Kafka outbox, and an optional S3/Glue/Redshift Serverless OLAP platform. The complete operational flow also runs with Docker Compose.

## Run the complete stack locally

Prerequisite: Docker Engine with the Compose plugin.

```bash
cp .env.example .env
docker compose up --build
```

The local services are:

- Portal: <http://localhost:4200>
- API health: <http://localhost:8080/v1/health>
- Keycloak: <http://localhost:8081> (administration user `admin`, password from `.env`)
- Kafka from the host: `localhost:19092`
- Application PostgreSQL: internal service `app-postgres`
- S3-compatible document and analytics storage: <http://localhost:9090>

The imported development users are `estudiante.sistemas`, `revisor.sistemas`, `analista.sistemas`, and `admin.sistemas`. Each user's password is its first word (`estudiante`, `revisor`, `analista`, or `admin`). These credentials are local fixtures and must never be used in a deployed environment.

Stop the stack with `docker compose down`. See [Deployment](docs/deployment.md) for local lifecycle details and Terraform deployment.

## Local development

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest
```

The legacy SAM template remains available as a migration reference:

```powershell
sam validate --lint
sam build
sam local start-api
```

## Deploy to AWS with Terraform

```bash
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform plan -out=deployment.tfplan
terraform -chdir=infra/terraform apply deployment.tfplan
```

Edit `terraform.tfvars` first. Terraform provisions the operational database, RDS Proxy, document bucket and migrations. Set `create_msk_serverless=true` for managed Kafka and `analytics_enabled=true` plus a non-default `analytics_pseudonym_salt` for the OLAP platform.

## Routes

- `GET /v1/health`
- `POST /v1/requests/validate`
- `POST /v1/requests/prepare`
- `GET /v1/requests`
- `GET /v1/requests/{request_id}`
- `POST /v1/documents/upload-url`
- `GET /v1/documents/{document_id}/download-url`
- `POST /v1/reviews/evaluate`
- `POST /v1/notifications/preview`
- `GET /v1/notifications`
- `PATCH /v1/notifications/{notification_id}/read`
- `POST /v1/analytics/summary`
- `GET /v1/analytics/cube/requests`
- `GET /v1/analytics/cube/equivalences`
- `GET /v1/analytics/cube/processing-times`

All routes except health require a Keycloak access token with audience `academic-api` and an allowed client role. Request and review writes commit their state and event intent atomically; the outbox publisher delivers those events to Kafka with at-least-once semantics. Documents are uploaded directly through short-lived presigned URLs and are never public.

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Keycloak authentication and route authorization](docs/authentication-keycloak.md)
- [Kafka event integration](docs/kafka-events.md)
- [Persistence and OLAP](docs/persistence-and-olap.md)
- [OpenAPI contract](docs/openapi.yaml)
