from typing import Any

from .enums import RequestStatus, RequestType, ReviewDecision
from .errors import StateTransitionError, ValidationError

REQUIRED_FIELDS = {RequestType.CREDIT_TRANSFER: ("source_course", "target_course", "source_credits", "target_credits")}
ALLOWED_MIME_TYPES = {"application/pdf"}
MAX_DOCUMENT_SIZE_BYTES = 10_000_000


def validate_request(payload: dict[str, Any]) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    student = payload.get("student")
    if not isinstance(student, dict):
        errors.append({"field": "student", "reason": "Student data is required"})
    else:
        for field in ("student_code", "name", "email"):
            if not str(student.get(field, "")).strip():
                errors.append({"field": f"student.{field}", "reason": "This field is required"})
        if student.get("email") and not str(student["email"]).lower().endswith(".edu.co"):
            errors.append({"field": "student.email", "reason": "A university email address is required"})

    try:
        request_type = RequestType(payload.get("type"))
    except ValueError:
        errors.append({"field": "type", "reason": "Unsupported request type"})
        request_type = None

    academic_data = payload.get("academic_data")
    if request_type and not isinstance(academic_data, dict):
        errors.append({"field": "academic_data", "reason": "Academic data is required"})
    elif request_type:
        for field in REQUIRED_FIELDS[request_type]:
            if field not in academic_data:
                errors.append({"field": f"academic_data.{field}", "reason": "This field is required"})

    documents = payload.get("documents", [])
    if not isinstance(documents, list):
        errors.append({"field": "documents", "reason": "Documents must be a list"})
    else:
        for index, document in enumerate(documents):
            for field in ("name", "mime_type", "size_bytes"):
                if field not in document:
                    errors.append({"field": f"documents[{index}].{field}", "reason": "This field is required"})
            if document.get("mime_type") not in ALLOWED_MIME_TYPES:
                errors.append({"field": f"documents[{index}].mime_type", "reason": "Unsupported MIME type"})
            if document.get("size_bytes", 0) > MAX_DOCUMENT_SIZE_BYTES:
                errors.append({"field": f"documents[{index}].size_bytes", "reason": "Document is too large"})
    return errors


def next_status(current: RequestStatus, decision: ReviewDecision) -> RequestStatus:
    if current not in {RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW}:
        raise StateTransitionError("STATE_TRANSITION_NOT_ALLOWED", "The request cannot be evaluated in its current state")
    return {
        ReviewDecision.APPROVE: RequestStatus.APPROVED,
        ReviewDecision.REJECT: RequestStatus.REJECTED,
        ReviewDecision.REQUEST_CHANGES: RequestStatus.CHANGES_REQUESTED,
    }[decision]
