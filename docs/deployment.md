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
