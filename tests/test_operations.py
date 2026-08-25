from src.shared.application.evaluate_request import evaluate_request
from src.shared.application.preview_notification import preview_notification
from src.shared.application.summarize_requests import summarize_requests


def test_evaluation_increments_version_and_creates_event():
    result = evaluate_request({"request": {"request_id": "request-1", "status": "UNDER_REVIEW", "version": 2}, "evaluation": {"decision": "APPROVE", "observation": "Meets requirements", "actor": {"id": "admin-demo", "role": "ADMINISTRATOR"}}})
    assert result["request"]["status"] == "APPROVED"
    assert result["request"]["version"] == 3
    assert result["event"]["event_type"] == "request.status_changed.v1"


def test_notification_is_only_a_preview():
    result = preview_notification({"event": {"event_type": "request.status_changed.v1", "data": {"new_status": "REJECTED"}}, "recipient": {"email": "student@university.edu.co"}})
    assert result["channel"] == "EMAIL"
    assert "rejected" in result["subject"]


def test_analytics_summarizes_statuses_and_decisions():
    result = summarize_requests([{"type": "CREDIT_TRANSFER", "status": "APPROVED"}, {"type": "CREDIT_TRANSFER", "status": "REJECTED"}, {"type": "CREDIT_TRANSFER", "status": "CHANGES_REQUESTED"}])
    assert result["total"] == 3
    assert result["approval_percentage"] == 50.0
    assert result["changes_requested"] == 1
