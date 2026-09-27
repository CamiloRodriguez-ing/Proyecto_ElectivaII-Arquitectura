# Student Requests Backend

Stateless academic request API implemented with Python, one AWS Lambda per endpoint, API Gateway HTTP API, Keycloak authorization, Kafka events, and AWS SAM.

## Local development

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest
```

SAM commands require Docker:

```powershell
sam validate --lint
sam build
sam local start-api
```

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
