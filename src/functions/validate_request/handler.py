import os

from shared.adapters.http_api_v2 import handler_for
from shared.adapters.kafka_events import publish_event
from shared.domain.rules import validate_request


def _validate(body):
    errors = validate_request(body)
    return {
        "valid": not errors,
        "errors": errors,
        "warnings": ["Files are represented only by metadata at this stage"],
    }


def _publish(_body, result, principal, request_id):
    publish_event(
        topic=os.environ["KAFKA_TOPIC_REQUESTS"],
        event_type="request.validated.v1",
        actor_id=principal.subject,
        actor_roles=principal.roles,
        correlation_id=request_id,
        data={"valid": result["valid"], "error_count": len(result["errors"])},
    )


def lambda_handler(event, context):
    return handler_for(_validate, event, required_roles={"STUDENT", "ADMINISTRATOR"}, after_success=_publish)
