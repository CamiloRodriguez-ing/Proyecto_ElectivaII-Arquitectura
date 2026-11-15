import os

from shared.adapters.http_api_v2 import handler_for
from shared.adapters.kafka_events import publish_event
from shared.application.summarize_requests import summarize_requests
from shared.adapters.postgres_repository import operational_summary, persistence_enabled


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
    def trusted_body(body, principal):
        return {**body, "_tenant_id": principal.tenant_id}

    def summarize(body):
        if persistence_enabled():
            return operational_summary(tenant_id=body["_tenant_id"])
        return _summarize(body)

    return handler_for(
        summarize,
        event,
        required_roles={"ANALYST", "ADMINISTRATOR"},
        prepare_body=trusted_body,
        after_success=_publish,
    )
