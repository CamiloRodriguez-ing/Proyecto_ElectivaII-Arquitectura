from src.shared.adapters.http_api_v2 import handler_for
from src.shared.application.prepare_request import prepare_request
from src.shared.domain.rules import validate_request


def lambda_handler(event, context):
    operation = event.get("rawPath", "")
    if operation.endswith("/validate"):
        def validate(body):
            errors = validate_request(body)
            return {"valid": not errors, "errors": errors, "warnings": ["Files are represented only by metadata at this stage"]}

        return handler_for(validate, event)
    return handler_for(prepare_request, event, success_status=201)
