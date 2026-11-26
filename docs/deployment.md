# Deployment Guide

## Complete local environment

The workstation must provide Docker Engine, Docker Compose, at least 12 GiB of
free RAM, and approximately 12 GiB of free disk for first-time image pulls.

```bash
cp .env.example .env
docker compose up -d --build
docker compose --profile seed run --rm demo-seed
```

The first command starts PostgreSQL, Keycloak, Redpanda, S3Mock, the API, the
static Angular SPA, and the Apache Druid micro-quickstart services. The second
command explicitly creates the idempotent `olap-demo-v1` dataset: 300 requests
and 270 reviews across 12 months and three tenants. It writes operational rows
and outbox intent only; Kafka, Druid, and the archive consume the regular path.

| Component | Local endpoint |
|---|---|
| Angular SPA | <http://localhost:4200> |
| API health | <http://localhost:8080/v1/health> |
| Keycloak | <http://localhost:8081> |
| Druid console and SQL | <http://localhost:8888> |
| Kafka from host | `localhost:19092` |
| S3Mock | <http://localhost:9090> |

The realm fixture provides `estudiante.sistemas`, `revisor.sistemas`,
`analista.sistemas`, and `admin.sistemas`; each password is the first word of
its username. These credentials are local-only.

The portal renders its own username/password form at
<http://localhost:4200>. Nginx proxies `/v1/*` to the API, so the browser remains
on one origin and is never redirected to Keycloak. If the Keycloak volume was
created before ADR-025, re-import the changed realm once with
`docker compose down --volumes` followed by `docker compose up -d --build`.
This intentionally removes all local Docker data; do not run it against data
that must be retained.

Useful verification commands:

```bash
curl -fsS http://localhost:8888/druid/indexer/v1/supervisor/academic_events/status
docker compose exec -T api python -c \
  "from shared.adapters.druid import summary_for_tenant; print(summary_for_tenant(None))"
docker compose exec -T app-postgres psql -U academic_app -d academic_requests \
  -c "select count(*), count(published_at) from outbox_events"
SMOKE_USERNAME=analista.sistemas SMOKE_PASSWORD=analista \
  .venv/bin/python scripts/smoke_local_analytics.py
```

The expected summary is stored in `analytics/demo-expected.json`. Stop services
with `docker compose down`. Do not add `--volumes` unless an irreversible local
data reset is intended.

## AWS deployment gate

> **Plan invalidation (2026-11-25):** `deployment.tfplan` predates ADR-025 and
> must not be applied. It does not contain the auth facade, cookie-aware
> authorizer, CloudFront `/v1/*` behavior, or generated BFF/CSRF secrets. Generate
> a new saved plan only after the AWS account decision is resumed.

AWS deployment uses Terraform, `us-east-1`, environment `dev`, and short-lived
IAM Identity Center credentials. No Terraform apply is allowed before all of
the following are true:

1. local unit, build, and end-to-end checks pass;
2. the SSO caller, account, and region are verified;
3. the AWS promotional-credit expiration is checked in Billing;
4. a budget notification email is configured;
5. a saved Terraform plan and its cost estimate are reviewed and explicitly
   approved by the user.

The pre-plan 48-hour estimate and its assumptions are in
[`aws-cost-estimate.md`](aws-cost-estimate.md). The current approval ceiling is
USD 65; exceeding it requires a new explicit decision even if credits remain.

Configure and authenticate a named profile outside the repository:

```bash
aws configure sso --profile academic-demo
aws sso login --profile academic-demo
AWS_PROFILE=academic-demo aws sts get-caller-identity
```

Do not place SSO tokens, account IDs, or credentials in `terraform.tfvars`.

## Reviewable Terraform plan

```bash
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
# Replace the pseudonym salt and budget email in the ignored tfvars file.
AWS_PROFILE=academic-demo terraform -chdir=infra/terraform init
AWS_PROFILE=academic-demo terraform -chdir=infra/terraform fmt -check
AWS_PROFILE=academic-demo terraform -chdir=infra/terraform validate
AWS_PROFILE=academic-demo terraform -chdir=infra/terraform plan -out=deployment.tfplan
AWS_PROFILE=academic-demo terraform -chdir=infra/terraform show deployment.tfplan
```

The full configuration provisions:

- API Gateway and Python Lambdas;
- RDS PostgreSQL `db.t4g.small` and RDS Proxy;
- private S3 document, frontend, and immutable analytical buckets;
- MSK Serverless with IAM authentication;
- Druid 38 on one private on-demand `t3.large` EC2 instance;
- Keycloak 26 on one private ARM `t4g.small` EC2 instance;
- isolated `keycloak` and `druid` logical databases and users on the shared RDS
  instance, with credentials in Secrets Manager;
- a private Keycloak ALB exposed only through a CloudFront VPC Origin;
- a private S3 Angular origin exposed through a separate CloudFront hostname,
  with `/v1/*` forwarded to API Gateway for same-origin session cookies;
- budget alerts at USD 25, 50, and 80 when an email is configured.

Druid's Docker tasks obtain short-lived MSK and S3 credentials from the EC2
instance profile through IMDSv2. The Druid host alone uses response hop limit 2
so container networking can reach IMDS; no static AWS keys are injected.

After CloudFront assigns its generated hostname, Terraform uses SSM to set that
full HTTPS URL as Keycloak's strict public hostname and restart the container.
This prevents the private HTTP ALB hop from leaking an `http` issuer into OIDC
discovery; no SSH port or public EC2 address is required.

During the `dev` apply, private one-shot Lambdas also create the three MSK topics,
apply the operational schema, create the isolated service databases, and load
`olap-demo-v1` when `load_demo_dataset=true`. The seed is not an HTTP endpoint
and refuses to run outside `dev`.

The Angular build is uploaded during apply. Terraform writes `/v1` to
`runtime-config.json`; the SPA uses the generated frontend CloudFront hostname
for both static assets and API calls. Keycloak remains reachable over its own
CloudFront hostname only for backend token exchange and identity administration.

After plan and cost approval only:

```bash
AWS_PROFILE=academic-demo terraform -chdir=infra/terraform apply deployment.tfplan
AWS_PROFILE=academic-demo terraform -chdir=infra/terraform output
```

CloudFront and VPC Origin creation can take 15–25 minutes. EC2 bootstrap logs
are available through SSM without opening SSH. Retrieve the Keycloak bootstrap
secret from the output ARN through Secrets Manager; never include its value in
presentation evidence.

## 48-hour lifecycle and teardown

Record the deployment timestamp and schedule a human reminder no later than 48
hours. Budgets alert but do not automatically stop or destroy resources. MSK
Serverless, NAT Gateway, RDS, EC2, and the ALB accrue cost while idle.

```bash
AWS_PROFILE=academic-demo terraform -chdir=infra/terraform plan -destroy -out=destroy.tfplan
AWS_PROFILE=academic-demo terraform -chdir=infra/terraform show destroy.tfplan
AWS_PROFILE=academic-demo terraform -chdir=infra/terraform apply destroy.tfplan
```

Confirm afterward that no MSK cluster, NAT Gateway, RDS instance, EC2 instance,
ALB, VPC Origin, or CloudFront distribution remains. Non-production buckets use
`force_destroy`; the synthetic dataset is reproducible and is not a backup.
