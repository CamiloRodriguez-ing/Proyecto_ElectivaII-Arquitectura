# Keycloak Authentication and Authorization

## Document status

This document defines the **target** identity architecture for Student Requests. It does not describe a feature that is already active: the deployed API and the current frontend do not yet validate tokens or enforce roles. No source code or infrastructure template is changed by this document.

Keycloak is the required identity provider. The application remains stateless: Keycloak owns identities, credentials, clients, roles, and identity sessions; the Student Requests API still owns no database and stores no academic requests.

## Security objectives

- Authenticate browser users with OpenID Connect (OIDC).
- Use OAuth 2.0 access tokens, never ID tokens, to call the API.
- Keep browser and machine clients separate.
- Put API permissions in client roles belonging to `academic-api`.
- Validate the token issuer, signature, expiration, and audience at API Gateway.
- Enforce the route-to-role matrix before executing a use case.
- Derive the actor identity from the validated token instead of trusting `actor`, email, or role values sent in a request body.

Authentication answers **who the caller is**. Authorization answers **what that caller may do**. Both controls are required.

## Target topology

```text
                         OIDC login / PKCE
Browser ───────────────────────────────────────────┐
   │                                               v
   │ Bearer access token                  Keycloak (remote HTTPS)
   │                                      realm: academic-requests
   v                                               │
API Gateway HTTP API <──── public signing keys ────┘
   │
   │ validated JWT claims
   v
route role guard
   │
   ├── requests Lambda
   ├── reviews Lambda
   ├── notifications Lambda
   └── analytics Lambda
```

The OIDC issuer is:

```text
https://auth.example.edu/realms/academic-requests
```

`auth.example.edu` is a placeholder and must be replaced with the real public hostname everywhere. The issuer must match exactly; changing the realm name, scheme, host, port, or path changes the issuer.

## Realm and multi-client model

Create one realm named `academic-requests`. Do not configure application users in the `master` realm.

| Client ID | Type | Purpose | Enabled flow |
|---|---|---|---|
| `academic-portal` | Public browser client | Current static frontend | Authorization Code with PKCE S256 |
| `academic-api` | Resource/API client | Audience and namespace for API roles | No interactive or direct grant flow |
| `academic-automation` | Confidential machine client | Future trusted notification or operational job | Service Accounts / Client Credentials only |

This separation is the multi-client design. A browser never receives a client secret. A machine secret never appears in frontend files. The API accepts only tokens whose `aud` contains `academic-api`.

### `academic-portal`

Configure the client as follows:

- Client type: `OpenID Connect`.
- Client authentication: `Off` (public client).
- Standard flow: `On`.
- Implicit flow: `Off`.
- Direct access grants: `Off`.
- Service accounts: `Off`.
- PKCE method: `S256`.
- Valid redirect URIs: the exact production frontend paths, for example `https://portal.example.edu/*`.
- Valid post-logout redirect URIs: the exact production frontend paths.
- Web origins: the exact production origin, for example `https://portal.example.edu`.

Do not use `*` for redirect URIs or web origins in production. A JavaScript application is a public client because it cannot keep a secret. Keycloak also recommends specific redirect URIs and web origins for browser clients.

### `academic-api`

Use this client only as the resource-server identity and role namespace:

- Client authentication: `On`.
- Standard flow, direct access grants, implicit flow, and service accounts: `Off`.
- Define all application roles in this client's **Roles** tab.
- Do not distribute this client's secret to the frontend or Lambda functions; token validation uses the realm's public signing keys.

For `academic-portal`, create an Audience protocol mapper in its dedicated client scope:

- Name: `academic-api-audience`.
- Included Client Audience: `academic-api`.
- Add to access token: `On`.
- Add to ID token: `Off`.

Apply the same audience mapper to `academic-automation`. The resulting access token must have `academic-api` in `aud`. This prevents a token intended only for another client from being accepted by this API.

### `academic-automation`

- Client authentication: `On`.
- Service accounts: `On`.
- Standard flow, implicit flow, and direct access grants: `Off`.
- Store its secret in a server-side secret manager, never in Git or the frontend.
- Assign only the `NOTIFICATION_SERVICE` client role to its service account unless another permission is explicitly justified.
- Rotate the secret after exposure and periodically according to the operating policy.

This client obtains an access token from:

```text
POST https://auth.example.edu/realms/academic-requests/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=academic-automation&client_secret=REDACTED
```

## API roles

Create these as **client roles of `academic-api`**, not as realm roles:

| Role | Meaning |
|---|---|
| `STUDENT` | Validate and prepare the caller's academic request. |
| `REVIEWER` | Evaluate an academic request and preview its resulting notification. |
| `ANALYST` | Read the aggregate demonstration indicators. |
| `NOTIFICATION_SERVICE` | Machine-only permission to generate notification previews. |
| `ADMINISTRATOR` | Application administrator with all human-facing API permissions. |

Make `ADMINISTRATOR` a composite of `STUDENT`, `REVIEWER`, and `ANALYST`. Grant it explicit access to notification preview as shown below; do not make human administrators members of the machine client.

`ADMINISTRATOR` is an application role. It must not imply Keycloak realm administration or access to the Keycloak Admin Console.

### Groups and assignments

Use realm groups to simplify user administration:

| Group | Assigned `academic-api` client role |
|---|---|
| `/students` | `STUDENT` |
| `/reviewers` | `REVIEWER` |
| `/analysts` | `ANALYST` |
| `/api-administrators` | `ADMINISTRATOR` |

Assign users to groups instead of repeatedly assigning roles directly. Do not place the `NOTIFICATION_SERVICE` role in a human group; assign it only to the `academic-automation` service account.

## Route authorization matrix

The matrix is deny-by-default. A protected route not present in the matrix must be rejected until its permission is explicitly designed.

| Method and route | Public | Allowed `academic-api` roles |
|---|:---:|---|
| `GET /v1/health` | Yes | None required |
| `POST /v1/requests/validate` | No | `STUDENT`, `ADMINISTRATOR` |
| `POST /v1/requests/prepare` | No | `STUDENT`, `ADMINISTRATOR` |
| `POST /v1/reviews/evaluate` | No | `REVIEWER`, `ADMINISTRATOR` |
| `POST /v1/notifications/preview` | No | `REVIEWER`, `NOTIFICATION_SERVICE`, `ADMINISTRATOR` |
| `POST /v1/analytics/summary` | No | `ANALYST`, `ADMINISTRATOR` |

The current stateless API cannot prove ownership of a request received in the body. In a persistence phase, `STUDENT` access must additionally require that the token subject owns the request. A role check alone is not object-level authorization.

## Access-token contract

A browser sends the access token in the standard header:

```http
Authorization: Bearer eyJ...
```

The relevant decoded claims should look like this:

```json
{
  "iss": "https://auth.example.edu/realms/academic-requests",
  "sub": "9e3c5e1d-...",
  "aud": ["academic-api"],
  "azp": "academic-portal",
  "exp": 1788541200,
  "resource_access": {
    "academic-api": {
      "roles": ["STUDENT"]
    }
  }
}
```

Authorization must read only `resource_access.academic-api.roles`. It must not accept a similarly named role from `realm_access` or another client.

### HTTP outcomes

- `401 Unauthorized`: token missing, malformed, expired, signed by an unknown key, wrong issuer, or wrong audience.
- `403 Forbidden`: token valid but none of the required `academic-api` roles is present.
- `2xx`: both token validation and route authorization passed, then the business operation succeeded.

## Enforcement with API Gateway and Lambda

AWS API Gateway HTTP API JWT authorizers validate the JWT signature through the issuer's discovery/JWKS metadata and validate claims such as `iss`, `aud`, and `exp`. Configure:

```text
Identity source: $request.header.Authorization
Issuer:          https://auth.example.edu/realms/academic-requests
Audience:        academic-api
```

Attach this authorizer to every route except `GET /v1/health` and `OPTIONS` preflight requests.

API Gateway's native route permissions inspect `scope` or `scp`; Keycloak client roles are normally emitted in the nested `resource_access` claim. Therefore, the target implementation needs a shared authorization guard after Gateway's JWT validation, or a custom Lambda authorizer that validates the token and enforces the same matrix. The recommended first implementation is:

1. API Gateway JWT authorizer validates signature, issuer, audience, and time claims.
2. A shared Lambda adapter reads `requestContext.authorizer.jwt.claims`.
3. The adapter parses `resource_access`, selects `academic-api.roles`, and checks the route matrix.
4. The adapter returns `403` before calling the use case when no allowed role is present.

This requires a later code and SAM change and is intentionally **not implemented by this documentation task**. Do not mark a route as protected in OpenAPI or release notes until enforcement is deployed and tested.

The future implementation must also:

- Add `Authorization` to API Gateway CORS `AllowHeaders`.
- Keep `OPTIONS` unauthenticated so browser preflight succeeds.
- Use `sub` as the stable actor ID.
- Replace the body-provided evaluation actor with the validated token subject and role.
- Never log access tokens, refresh tokens, authorization headers, passwords, or client secrets.

## Keycloak configuration procedure

After the remote server is available:

1. Sign in to the Admin Console with the one-time bootstrap administrator.
2. Create the `academic-requests` realm and require TLS for external requests.
3. Create the three clients using the settings in this document.
4. Create the five client roles under `Clients` → `academic-api` → `Roles`.
5. Configure the `ADMINISTRATOR` composite roles.
6. Add the explicit `academic-api` audience mapper to the portal and automation clients; enable it only for access tokens.
7. Create the four realm groups and map the corresponding client roles.
8. Create demonstration users and add each one to the appropriate group.
9. Assign `NOTIFICATION_SERVICE` to the `academic-automation` service account.
10. Inspect a decoded test access token and confirm `iss`, `aud`, `azp`, `exp`, and `resource_access.academic-api.roles` before integrating the API.

Use separate realms for materially isolated environments, for example `academic-requests-dev` and `academic-requests-prod`. Never use production credentials in a development realm.

## Remote deployment: single-node academic environment

This is a concrete, low-complexity deployment for a class demonstration. It runs on a remote Linux VM such as an AWS EC2 instance or a VPS, not on a developer laptop:

```text
Internet
   │ 80/443
   v
Caddy (automatic TLS)
   │ private Docker network :8080
   v
Keycloak
   │ private Docker network :5432
   v
PostgreSQL persistent volume
```

PostgreSQL here belongs only to the identity platform. It stores realms, users, roles, clients, and Keycloak state; it is not an application-request database. A durable supported database is required for a production-mode Keycloak deployment.

This single VM is appropriate for an academic demo but is a single point of failure. For production availability, run multiple Keycloak instances behind a load balancer and use a managed, backed-up PostgreSQL service such as Amazon RDS.

### 1. Prepare DNS and the remote host

- Allocate a VM with at least 2 vCPU and 4 GiB RAM for a small demonstration.
- Install Docker Engine and the Docker Compose plugin.
- Point an `A`/`AAAA` record such as `auth.example.edu` to the VM.
- Allow inbound TCP `80` and `443` from the Internet.
- Restrict SSH to administrator IP addresses.
- Do **not** expose `5432`, `8080`, or `9000` publicly.

Create a deployment directory on the remote host, for example `/opt/academic-keycloak`. The following files are deployment examples to create on that host; they are not application source files.

### 2. Build an optimized Keycloak image

Create `Containerfile`:

```dockerfile
ARG KEYCLOAK_VERSION
FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION} AS builder

ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true

RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION}
COPY --from=builder /opt/keycloak/ /opt/keycloak/
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
```

Pin `KEYCLOAK_VERSION` to an explicit version tested by the team. Do not deploy the floating `latest` tag.

### 3. Define the containers

Create `compose.yaml`:

```yaml
name: academic-identity

services:
  postgres:
    image: postgres:${POSTGRES_VERSION}
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks: [identity]

  keycloak:
    build:
      context: .
      dockerfile: Containerfile
      args:
        KEYCLOAK_VERSION: ${KEYCLOAK_VERSION}
    restart: unless-stopped
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB}
      KC_DB_USERNAME: ${POSTGRES_USER}
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD}
      KC_HOSTNAME: https://${AUTH_HOSTNAME}
      KC_HTTP_ENABLED: "true"
      KC_PROXY_HEADERS: xforwarded
      KC_BOOTSTRAP_ADMIN_USERNAME: ${KC_BOOTSTRAP_ADMIN_USERNAME}
      KC_BOOTSTRAP_ADMIN_PASSWORD: ${KC_BOOTSTRAP_ADMIN_PASSWORD}
    command: ["start", "--optimized"]
    depends_on:
      postgres:
        condition: service_healthy
    expose: ["8080", "9000"]
    networks: [identity]

  caddy:
    image: caddy:${CADDY_VERSION}
    restart: unless-stopped
    environment:
      AUTH_HOSTNAME: ${AUTH_HOSTNAME}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [keycloak]
    networks: [identity]

networks:
  identity:

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

Create `Caddyfile`:

```caddyfile
{$AUTH_HOSTNAME} {
    encode zstd gzip
    reverse_proxy keycloak:8080
}
```

Create `.env` on the remote host and protect it with `chmod 600 .env`:

```dotenv
AUTH_HOSTNAME=auth.example.edu
KEYCLOAK_VERSION=<PINNED_KEYCLOAK_VERSION>
POSTGRES_VERSION=<PINNED_POSTGRES_VERSION>-alpine
CADDY_VERSION=<PINNED_CADDY_VERSION>-alpine
POSTGRES_DB=keycloak
POSTGRES_USER=keycloak
POSTGRES_PASSWORD=<LONG_RANDOM_DATABASE_PASSWORD>
KC_BOOTSTRAP_ADMIN_USERNAME=<NON_DEFAULT_ADMIN_NAME>
KC_BOOTSTRAP_ADMIN_PASSWORD=<LONG_RANDOM_BOOTSTRAP_PASSWORD>
```

Replace every placeholder. Keep `.env` outside source control. In a stricter deployment, inject these values from a secret manager instead of a file.

### 4. Start and verify

From the deployment directory on the remote VM:

```bash
docker compose config
docker compose build --pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 keycloak caddy
```

Verify the public discovery endpoint:

```bash
curl --fail --silent --show-error \
  https://auth.example.edu/realms/academic-requests/.well-known/openid-configuration
```

The realm endpoint returns `404` until the realm has been created. Before that, verify the Admin Console over `https://auth.example.edu/admin/` and inspect the internal readiness endpoint from the Docker network. The management port `9000` must remain private.

After the first successful sign-in:

1. Create a permanent named administrator with only the required realm-management privileges.
2. Remove `KC_BOOTSTRAP_ADMIN_USERNAME` and `KC_BOOTSTRAP_ADMIN_PASSWORD` from `.env` and `compose.yaml`.
3. Recreate the Keycloak container with `docker compose up -d`.

### 5. Backups, updates, and monitoring

- Back up the PostgreSQL database and test restoration. A realm JSON export is useful for configuration portability but is not a complete database backup.
- Back up Caddy data so certificate state is recoverable.
- Enable alerts for container restarts, disk usage, certificate failures, Keycloak login failures, and readiness failures.
- Keep health and metrics on private port `9000`; do not proxy it to the Internet.
- Test a pinned Keycloak upgrade against a restored backup before updating the remote instance.
- Review realm administrator memberships and confidential-client secrets periodically.

## Integration acceptance criteria

Authentication is not complete until all of the following pass in the deployed environment:

- Discovery and JWKS endpoints are reachable through HTTPS with a valid certificate.
- A portal login uses Authorization Code with PKCE S256.
- An access token includes `aud=academic-api` and the correct client role.
- Missing, expired, wrong-issuer, and wrong-audience tokens receive `401` on every protected route.
- Each role receives `2xx` only on the routes allowed by the matrix and `403` on the others.
- `GET /v1/health` and CORS preflight remain available without a token.
- A machine token can preview notifications but cannot evaluate requests or read analytics.
- Evaluation audit identity comes from token `sub`, not the request body.
- Neither browser storage, logs, Git history, nor API responses expose a client secret or token.

## Authoritative references

- [Keycloak: Running Keycloak in a container](https://www.keycloak.org/server/containers)
- [Keycloak: Configuring Keycloak for production](https://www.keycloak.org/server/configuration-production)
- [Keycloak: Configuring the hostname](https://www.keycloak.org/server/hostname)
- [Keycloak: Configuring a reverse proxy](https://www.keycloak.org/server/reverseproxy)
- [Keycloak: Configuring the database](https://www.keycloak.org/server/db)
- [Keycloak: JavaScript adapter](https://www.keycloak.org/securing-apps/javascript-adapter)
- [Keycloak: Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [Keycloak: Health checks](https://www.keycloak.org/observability/health)
- [AWS: Control access to HTTP APIs with JWT authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)

