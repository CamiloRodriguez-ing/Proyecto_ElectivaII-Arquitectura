from datetime import UTC, datetime
from typing import Any

from shared.domain.enums import RequestStatus, ReviewDecision
from shared.domain.errors import ValidationError
from shared.domain.rules import next_status


def evaluate_request(payload: dict[str, Any]) -> dict[str, Any]:
    request = dict(payload.get("request", {}))
    evaluation = payload.get("evaluation", {})
    try:
        current_status = RequestStatus(request["status"])
        decision = ReviewDecision(evaluation["decision"])
        new_status = next_status(current_status, decision)
    except (KeyError, ValueError) as error:
        raise ValidationError("VALIDATION_ERROR", "The evaluation contains invalid data") from error
    actor = evaluation.get("actor", {})
    if not actor.get("id") or not actor.get("role") or not evaluation.get("observation", "").strip():
        raise ValidationError("VALIDATION_ERROR", "Actor and observation are required")
    if request.get("tenant_id") and request.get("tenant_id") != evaluation.get("actor", {}).get("tenant_id", ""):
        raise ValidationError("VALIDATION_ERROR", "Acceso denegado: El recurso pertenece a otra Ingeniería (Tenant)")
    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    updated = {**request, "status": new_status.value, "updated_at": now, "version": request.get("version", 0) + 1}
    academic_data = request.get("academic_data", {})
    return {
        "request": updated,
        "event": {
            "event_id": f"{updated.get('request_id', 'unknown')}-{updated['version']}",
            "event_type": "request.status_changed.v2",
            "aggregate_type": "request",
            "aggregate_id": updated.get("request_id"),
            "occurred_at": now,
            "schema_version": 2,
            "data": {
                "tenant_id": request.get("tenant_id"),
                "type": request.get("type"),
                "source_course": academic_data.get("source_course"),
                "target_course": academic_data.get("target_course"),
                "source_credits": academic_data.get("source_credits"),
                "target_credits": academic_data.get("target_credits"),
                "previous_status": current_status.value,
                "new_status": new_status.value,
                "decision": decision.value,
                "reviewer_role": actor["role"],
                "submitted_at": request.get("created_at"),
                "occurred_at": now,
            },
        },
    }
