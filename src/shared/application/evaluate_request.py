from datetime import datetime, timezone
from typing import Any

from src.shared.domain.enums import RequestStatus, ReviewDecision
from src.shared.domain.errors import ValidationError
from src.shared.domain.rules import next_status


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
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    updated = {**request, "status": new_status.value, "updated_at": now, "version": request.get("version", 0) + 1}
    return {"request": updated, "event": {"event_id": f"{updated.get('request_id', 'unknown')}-{updated['version']}", "event_type": "request.status_changed.v1", "aggregate_type": "request", "aggregate_id": updated.get("request_id"), "occurred_at": now, "schema_version": 1, "data": {"previous_status": current_status.value, "new_status": new_status.value}}}
