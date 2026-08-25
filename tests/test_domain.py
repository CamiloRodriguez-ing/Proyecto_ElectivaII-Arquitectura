from src.shared.domain.enums import RequestStatus, ReviewDecision
from src.shared.domain.errors import StateTransitionError
from src.shared.domain.rules import next_status, validate_request


def valid_payload():
    return {
        "student": {"student_code": "202012345", "name": "Student", "email": "student@university.edu.co"},
        "type": "CREDIT_TRANSFER",
        "academic_data": {"source_course": "Calculus I", "target_course": "Differential Calculus", "source_credits": 3, "target_credits": 3},
        "documents": [{"name": "syllabus.pdf", "mime_type": "application/pdf", "size_bytes": 1200}],
    }


def test_valid_request_has_no_errors():
    assert validate_request(valid_payload()) == []


def test_invalid_email_is_reported():
    payload = valid_payload()
    payload["student"]["email"] = "student@example.com"
    assert any(error["field"] == "student.email" for error in validate_request(payload))


def test_review_decision_changes_status():
    assert next_status(RequestStatus.UNDER_REVIEW, ReviewDecision.APPROVE) == RequestStatus.APPROVED


def test_terminal_request_cannot_be_evaluated():
    try:
        next_status(RequestStatus.APPROVED, ReviewDecision.REJECT)
        assert False
    except StateTransitionError as error:
        assert error.code == "STATE_TRANSITION_NOT_ALLOWED"
