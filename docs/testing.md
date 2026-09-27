# Testing Guide

Run unit and handler tests without AWS:

```powershell
python -m pytest -q
python -m compileall -q src
```

Validate the SAM template and build the functions after installing AWS SAM CLI:

```powershell
sam validate --lint
sam build
```

Run the local HTTP API with Docker:

```powershell
sam local start-api --parameter-overrides KafkaEnabled=false
```

SAM local does not emulate the deployed REQUEST Lambda authorizer context required by protected handlers, so use it for the public health route and rely on unit tests for synthetic authorization contexts. Run the full smoke test against the deployed API with an `ADMINISTRATOR` access token:

```powershell
.\scripts\smoke-test.ps1 -BaseUrl https://<api-id>.execute-api.<region>.amazonaws.com -AccessToken $env:ACCESS_TOKEN
```

The test suite covers validation, normalization, state transitions, version increments, Keycloak claim parsing, the route-role matrix, trusted actor replacement, Kafka envelopes and failures, notification previews, analytics, HTTP envelopes, and invalid terminal transitions.

Local handler tests cover both the authorizer and the `requestContext.authorizer.lambda` shape that API Gateway supplies. Missing tokens receive `401`; invalid, expired, wrong-issuer, wrong-audience or unauthorized-role tokens receive `403` from the simple-response authorizer. Valid-token scenarios must also be verified against the deployed HTTP API.
