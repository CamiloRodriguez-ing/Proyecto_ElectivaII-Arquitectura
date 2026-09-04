# Student Requests Backend

Stateless academic request API implemented with Python, AWS Lambda, API Gateway HTTP API, and AWS SAM.

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

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Keycloak authentication and route authorization](docs/authentication-keycloak.md)
- [OpenAPI contract](docs/openapi.yaml)

Authentication is currently a documented target and is not enforced by the deployed frontend or API yet.
