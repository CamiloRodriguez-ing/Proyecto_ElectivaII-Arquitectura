Event fixtures for `sam local invoke`.

Fixtures include synthetic claims for direct Lambda invocation. They do not validate a JWT; API Gateway performs that validation in AWS. Examples:

```powershell
sam local invoke ValidateRequestFunction --event events\validate-request.json --parameter-overrides KafkaEnabled=false
sam local invoke EvaluateReviewFunction --event events\evaluate-request.json --parameter-overrides KafkaEnabled=false
```

The analytical fixture documents the GET event shape, but its handler requires a
reachable Druid SQL endpoint. Use the Docker Compose environment for analytical
invocation and end-to-end testing.
