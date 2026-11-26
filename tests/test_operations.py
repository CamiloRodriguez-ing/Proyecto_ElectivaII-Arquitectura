from shared.application.evaluate_request import evaluate_request
from shared.application.preview_notification import preview_notification


def test_evaluation_increments_version_and_creates_event():
    result = evaluate_request({"request": {"request_id": "request-1", "status": "UNDER_REVIEW", "version": 2}, "evaluation": {"decision": "APPROVE", "observation": "Meets requirements", "actor": {"id": "admin-demo", "role": "ADMINISTRATOR"}}})
    assert result["request"]["status"] == "APPROVED"
    assert result["request"]["version"] == 3
    assert result["event"]["event_type"] == "request.status_changed.v2"
    assert result["event"]["schema_version"] == 2


def test_notification_is_only_a_preview():
    result = preview_notification({"event": {"event_type": "request.status_changed.v1", "data": {"new_status": "REJECTED"}}, "recipient": {"email": "student@university.edu.co"}})
    assert result["channel"] == "EMAIL"
    assert "rejected" in result["subject"]
