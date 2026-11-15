# Student Requests Backend

Stateless academic request API implemented with Python, one AWS Lambda per endpoint, API Gateway HTTP API, Keycloak authorization, Kafka events, and Terraform. The complete development environment also runs with Docker Compose.

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

Edit `terraform.tfvars` first. It supports either the existing external Kafka broker or an optional Terraform-managed Amazon MSK Serverless cluster. Terraform deploys the same Lambda-per-route/API Gateway architecture as the SAM template.

## Routes

- `GET /v1/health`
- `POST /v1/requests/validate`
- `POST /v1/requests/prepare`
- `POST /v1/reviews/evaluate`
- `POST /v1/notifications/preview`
- `POST /v1/analytics/summary`

This first stage is intentionally stateless. Prepared requests and events are returned to the caller but are not persisted, and documents are represented only by metadata.

All routes except health require a Keycloak access token with audience `academic-api` and an allowed client role. Successful protected operations publish versioned events to Kafka. For direct local handler tests set `KAFKA_ENABLED=false`; deployed environments should configure a reachable broker.

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Keycloak authentication and route authorization](docs/authentication-keycloak.md)
- [Kafka event integration](docs/kafka-events.md)
- [OpenAPI contract](docs/openapi.yaml)
