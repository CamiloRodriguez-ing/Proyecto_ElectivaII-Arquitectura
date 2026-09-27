import json
from unittest.mock import patch

import pytest

from functions.analytics_summary.handler import lambda_handler as analytics_handler
from functions.evaluate_review.handler import lambda_handler as review_handler
from functions.health.handler import lambda_handler as health_handler
from functions.prepare_request.handler import lambda_handler as prepare_handler
from functions.preview_notification.handler import lambda_handler as notification_handler
from functions.validate_request.handler import lambda_handler as validate_handler
from shared.adapters.kafka_events import KafkaPublishError


def authorized_event(body, roles, subject="user-1", path=""):
    return {
        "rawPath": path,
        "headers": {"x-request-id": "test-id"},
        "body": json.dumps(body),
        "requestContext": {
            "authorizer": {
                "jwt": {
                    "claims": {
                        "sub": subject,
                        "resource_access": json.dumps({"academic-api": {"roles": roles}}),
                    }
                }
            }
        },
    }


@pytest.fixture(autouse=True)
def disable_kafka(monkeypatch):
    monkeypatch.setenv("KAFKA_ENABLED", "false")
    monkeypatch.setenv("KAFKA_TOPIC_REQUESTS", "academic-requests")
    monkeypatch.setenv("KAFKA_TOPIC_REVIEWS", "academic-reviews")
    monkeypatch.setenv("KAFKA_TOPIC_NOTIFICATIONS", "academic-notifications")
    monkeypatch.setenv("KAFKA_TOPIC_ANALYTICS", "academic-analytics")


def valid_request():
    return {
        "student": {"student_code": "1", "name": "Student", "email": "a@u.edu.co"},
        "type": "CREDIT_TRANSFER",
        "academic_data": {
            "source_course": "A",
            "target_course": "B",
            "source_credits": 3,
            "target_credits": 3,
        },
        "documents": [],
    }


def test_health_handler_is_public_and_returns_http_contract():
    result = health_handler({"headers": {"x-request-id": "test-id"}}, None)
    assert result["statusCode"] == 200
    assert json.loads(result["body"])["meta"]["request_id"] == "test-id"


def test_validate_allows_student():
    result = validate_handler(authorized_event(valid_request(), ["STUDENT"]), None)
    assert result["statusCode"] == 200
    assert json.loads(result["body"])["data"]["valid"] is True


def test_prepare_requires_authentication():
    result = prepare_handler({"headers": {}, "body": json.dumps(valid_request())}, None)
    assert result["statusCode"] == 401
    assert json.loads(result["body"])["error"]["code"] == "UNAUTHENTICATED"


def test_prepare_rejects_wrong_role():
    result = prepare_handler(authorized_event(valid_request(), ["ANALYST"]), None)
    assert result["statusCode"] == 403


def test_prepare_normalizes_and_returns_created_status():
    payload = valid_request()
    payload["student"] = {"student_code": " 1 ", "name": " Student ", "email": "A@U.EDU.CO "}
    result = prepare_handler(authorized_event(payload, ["STUDENT"]), None)
    data = json.loads(result["body"])["data"]
    assert result["statusCode"] == 201
    assert data["student"]["email"] == "a@u.edu.co"


def test_prepare_publishes_minimal_event_with_trusted_actor(monkeypatch):
    monkeypatch.setenv("KAFKA_ENABLED", "true")
    with patch("functions.prepare_request.handler.publish_event") as publish:
        result = prepare_handler(authorized_event(valid_request(), ["STUDENT"], subject="student-1"), None)

    assert result["statusCode"] == 201
    published = publish.call_args.kwargs
    assert published["event_type"] == "request.submitted.v1"
    assert published["actor_id"] == "student-1"
    assert set(published["data"]) == {"request_id", "type", "status"}


def test_kafka_failure_returns_retryable_service_unavailable(monkeypatch):
    monkeypatch.setenv("KAFKA_ENABLED", "true")
    with patch(
        "functions.prepare_request.handler.publish_event",
        side_effect=KafkaPublishError("broker unavailable"),
    ):
        result = prepare_handler(authorized_event(valid_request(), ["STUDENT"]), None)

    assert result["statusCode"] == 503
    assert json.loads(result["body"])["error"]["code"] == "EVENT_PUBLISH_UNAVAILABLE"


def test_review_uses_token_actor_instead_of_body_actor():
    body = {
        "request": {"request_id": "request-1", "status": "SUBMITTED", "version": 1},
        "evaluation": {
            "decision": "APPROVE",
            "observation": "Meets requirements",
            "actor": {"id": "forged", "role": "ADMINISTRATOR"},
        },
    }
    result = review_handler(authorized_event(body, ["REVIEWER"], subject="reviewer-1"), None)
    assert result["statusCode"] == 200
    assert json.loads(result["body"])["data"]["request"]["status"] == "APPROVED"


def test_notification_and_analytics_role_matrix():
    notification = notification_handler(
        authorized_event(
            {
                "event": {"event_type": "request.status_changed.v1", "data": {"new_status": "APPROVED"}},
                "recipient": {"email": "student@u.edu.co"},
            },
            ["NOTIFICATION_SERVICE"],
        ),
        None,
    )
    analytics = analytics_handler(
        authorized_event({"requests": [{"type": "CREDIT_TRANSFER", "status": "APPROVED"}]}, ["ANALYST"]),
        None,
    )
    assert notification["statusCode"] == 200
    assert analytics["statusCode"] == 200
