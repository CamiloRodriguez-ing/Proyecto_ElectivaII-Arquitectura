import os

from shared.adapters.http_api_v2 import handler_for
from shared.adapters.kafka_events import publish_event
from shared.application.evaluate_request import evaluate_request


def _trusted_actor(body, principal):
    evaluation = {**body.get("evaluation", {})}
    evaluation["actor"] = {"id": principal.subject, "role": sorted(principal.roles)[0]}
    return {**body, "evaluation": evaluation}


def _publish(_body, result, principal, request_id):
    domain_event = result["event"]
    publish_event(
        topic=os.environ["KAFKA_TOPIC_REVIEWS"],
        event_type=domain_event["event_type"],
        actor_id=principal.subject,
        actor_roles=principal.roles,
        correlation_id=request_id,
        aggregate_id=domain_event["aggregate_id"],
        data={**domain_event["data"], "request_id": domain_event["aggregate_id"]},
    )


def lambda_handler(event, context):
    return handler_for(
        evaluate_request,
        event,
        required_roles={"REVIEWER", "ADMINISTRATOR"},
        prepare_body=_trusted_actor,
        after_success=_publish,
    )
