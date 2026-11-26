import os

from shared.adapters.http_api_v2 import handler_for
from shared.adapters.kafka_events import publish_event
from shared.adapters.postgres_repository import create_request, persistence_enabled
from shared.application.prepare_request import prepare_request


def _publish(_body, result, principal, request_id):
    if persistence_enabled():
        return
    publish_event(
        topic=os.environ["KAFKA_TOPIC_REQUESTS"],
        event_type="request.submitted.v2",
        actor_id=principal.subject,
        actor_roles=principal.roles,
        correlation_id=request_id,
        aggregate_id=result["request_id"],
        data={
            "request_id": result["request_id"],
            "tenant_id": result["tenant_id"],
            "type": result["type"],
            "status": result["status"],
            "source_course": result["academic_data"].get("source_course"),
            "target_course": result["academic_data"].get("target_course"),
            "source_credits": result["academic_data"].get("source_credits"),
            "target_credits": result["academic_data"].get("target_credits"),
            "submitted_at": result["created_at"],
        },
        schema_version=2,
    )


def _trusted_actor(body, principal):
    return {
        **body,
        "tenant_id": principal.tenant_id,
        "_principal_subject": principal.subject,
        "_principal_roles": list(principal.roles),
    }


def _prepare_and_persist(body):
    subject = body.pop("_principal_subject", "")
    roles = set(body.pop("_principal_roles", []))
    correlation_id = body.pop("_correlation_id", "")
    prepared = prepare_request(body)
    if not persistence_enabled():
        return prepared
    return create_request(
        prepared,
        owner_subject=subject,
        actor_roles=roles,
        correlation_id=correlation_id or prepared["request_id"],
    )


def lambda_handler(event, context):
    def trusted_actor(body, principal):
        trusted = _trusted_actor(body, principal)
        trusted["_correlation_id"] = {
            key.lower(): value for key, value in event.get("headers", {}).items()
        }.get("x-request-id", "")
        return trusted

    return handler_for(
        _prepare_and_persist,
        event,
        success_status=201,
        required_roles={"STUDENT", "ADMINISTRATOR"},
        prepare_body=trusted_actor,
        after_success=_publish,
    )
