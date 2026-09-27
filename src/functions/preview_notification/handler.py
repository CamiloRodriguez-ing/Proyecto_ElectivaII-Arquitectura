import os

from shared.adapters.http_api_v2 import handler_for
from shared.adapters.kafka_events import publish_event
from shared.application.preview_notification import preview_notification


def _publish(_body, result, principal, request_id):
    publish_event(
        topic=os.environ["KAFKA_TOPIC_NOTIFICATIONS"],
        event_type="notification.previewed.v1",
        actor_id=principal.subject,
        actor_roles=principal.roles,
        correlation_id=request_id,
        data={"channel": result["channel"], "source_event_type": result["event_type"]},
    )


def lambda_handler(event, context):
    return handler_for(
        preview_notification,
        event,
        required_roles={"REVIEWER", "NOTIFICATION_SERVICE", "ADMINISTRATOR"},
        after_success=_publish,
    )
