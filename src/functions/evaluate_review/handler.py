import os

from shared.adapters.http_api_v2 import handler_for
from shared.adapters.kafka_events import publish_event
from shared.adapters.postgres_repository import evaluate_persisted_request, persistence_enabled
from shared.application.evaluate_request import evaluate_request


def _trusted_actor(body, principal):
    evaluation = {**body.get("evaluation", {})}
    evaluation["actor"] = {
        "id": principal.subject,
        "role": min(principal.roles),
        "tenant_id": principal.tenant_id,
    }
    return {
        **body,
        "evaluation": evaluation,
        "_principal": {
            "subject": principal.subject,
            "roles": list(principal.roles),
            "tenant_id": principal.tenant_id,
        },
    }


def _publish(_body, result, principal, request_id):
    if persistence_enabled():
        return
    domain_event = result["event"]
    publish_event(
        topic=os.environ["KAFKA_TOPIC_REVIEWS"],
        event_type=domain_event["event_type"],
        actor_id=principal.subject,
        actor_roles=principal.roles,
        correlation_id=request_id,
        aggregate_id=domain_event["aggregate_id"],
        data={**domain_event["data"], "request_id": domain_event["aggregate_id"]},
        schema_version=domain_event["schema_version"],
    )


def lambda_handler(event, context):
    def execute(body):
        principal = body.pop("_principal", {})
        if not persistence_enabled():
            return evaluate_request(body)
        return evaluate_persisted_request(
            body,
            tenant_id=principal["tenant_id"],
            actor_subject=principal["subject"],
            actor_roles=set(principal["roles"]),
            correlation_id=event.get("headers", {}).get("x-request-id", "review"),
        )

    return handler_for(
        execute,
        event,
        required_roles={"REVIEWER", "ADMINISTRATOR"},
        prepare_body=_trusted_actor,
        after_success=_publish,
    )
