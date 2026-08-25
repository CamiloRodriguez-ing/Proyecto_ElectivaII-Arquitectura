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
sam local start-api
.\scripts\smoke-test.ps1 -BaseUrl http://127.0.0.1:3000
```

The test suite covers validation, normalization, state transitions, version increments, events, notification previews, analytics, HTTP envelopes, and invalid terminal transitions.
