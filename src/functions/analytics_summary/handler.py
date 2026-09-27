import os

from shared.adapters.http_api_v2 import handler_for
from shared.adapters.kafka_events import publish_event
from shared.application.summarize_requests import summarize_requests


def _summarize(body):
    return summarize_requests(body.get("requests", []))


def _publish(_body, result, principal, request_id):
    publish_event(
        topic=os.environ["KAFKA_TOPIC_ANALYTICS"],
        event_type="analytics.summarized.v1",
        actor_id=principal.subject,
        actor_roles=principal.roles,
        correlation_id=request_id,
        data={
            "total": result["total"],
            "by_type": result["by_type"],
            "by_status": result["by_status"],
        },
    )


def lambda_handler(event, context):
    return handler_for(
        _summarize,
        event,
        required_roles={"ANALYST", "ADMINISTRATOR"},
        after_success=_publish,
    )
