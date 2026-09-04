# Deployment Guide

Prerequisites: Python 3.11, Docker Desktop, AWS SAM CLI, and configured AWS credentials.

```powershell
sam validate --lint
sam build
sam deploy --guided
```

For later deployments:

```powershell
sam build
sam deploy
```

To roll back, use AWS CloudFormation to select a previous successful stack update, or deploy the last known-good commit with the same stack name. Confirm the change set before applying it.

The first academic demo uses `FRONTEND_ORIGIN=*` because the Cloudflare Pages hostname is assigned during deployment. The API does not use cookies or credentialed requests. After receiving the final Pages hostname, replace the wildcard with that exact origin for a stricter CORS policy.

## Identity deployment

Keycloak is not part of the current SAM stack and authentication is not active in the deployed API. The target remote Keycloak topology, Docker Compose procedure, DNS/TLS requirements, multi-client configuration, and post-deployment checks are documented in [Keycloak Authentication and Authorization](authentication-keycloak.md#remote-deployment-single-node-academic-environment).

Before enabling authentication in a later release, deploy and verify Keycloak first, then configure API Gateway with its exact realm issuer and the `academic-api` audience. That later release must also allow the `Authorization` CORS header and deploy route-role enforcement. Do not enable the frontend login flow while the API still ignores bearer tokens.
