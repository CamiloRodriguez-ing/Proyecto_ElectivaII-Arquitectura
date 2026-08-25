from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from src.shared.domain.rules import validate_request
from src.shared.domain.enums import RequestStatus
from src.shared.domain.errors import ValidationError


def prepare_request(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = {**payload}
    normalized["type"] = str(payload["type"]).strip().upper()
    normalized["student"] = {
        **payload["student"],
        "student_code": str(payload["student"]["student_code"]).strip(),
        "name": str(payload["student"]["name"]).strip(),
        "email": str(payload["student"]["email"]).strip().lower(),
    }
    normalized["academic_data"] = {
        **payload["academic_data"],
        **{key: value.strip() for key, value in payload["academic_data"].items() if isinstance(value, str)},
    }
    normalized["documents"] = [
        {**document, "name": str(document["name"]).strip(), "mime_type": str(document["mime_type"]).strip().lower()}
        for document in payload.get("documents", [])
    ]
    errors = validate_request(normalized)
    if errors:
        raise ValidationError("VALIDATION_ERROR", "The request contains invalid data", errors)
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return {
        **normalized,
        "request_id": str(uuid4()),
        "status": RequestStatus.SUBMITTED.value,
        "observations": [],
        "created_at": now,
        "updated_at": now,
        "version": 1,
    }
