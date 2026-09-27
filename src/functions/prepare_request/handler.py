import os

from shared.adapters.http_api_v2 import handler_for
from shared.adapters.kafka_events import publish_event
from shared.application.prepare_request import prepare_request


def _publish(_body, result, principal, request_id):
    publish_event(
        topic=os.environ["KAFKA_TOPIC_REQUESTS"],
        event_type="request.submitted.v1",
        actor_id=principal.subject,
        actor_roles=principal.roles,
        correlation_id=request_id,
        aggregate_id=result["request_id"],
        data={"request_id": result["request_id"], "type": result["type"], "status": result["status"]},
    )


def lambda_handler(event, context):
    return handler_for(
        prepare_request,
        event,
        success_status=201,
        required_roles={"STUDENT", "ADMINISTRATOR"},
        after_success=_publish,
    )
