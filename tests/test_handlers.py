import json

from src.functions.health.handler import lambda_handler as health_handler
from src.functions.requests.handler import lambda_handler as requests_handler
from src.shared.application.prepare_request import prepare_request


def test_health_handler_returns_http_contract():
    result = health_handler({"headers": {"x-request-id": "test-id"}}, None)
    assert result["statusCode"] == 200
    assert json.loads(result["body"])["meta"]["request_id"] == "test-id"


def test_validate_handler_returns_valid_data():
    event = {"rawPath": "/v1/requests/validate", "body": json.dumps({"student": {"student_code": "1", "name": "A", "email": "a@u.edu.co"}, "type": "CREDIT_TRANSFER", "academic_data": {"source_course": "A", "target_course": "B", "source_credits": 3, "target_credits": 3}, "documents": []})}
    result = requests_handler(event, None)
    assert result["statusCode"] == 200
    assert json.loads(result["body"])["data"]["valid"] is True


def test_prepare_normalizes_and_returns_created_status():
    payload = {"student": {"student_code": " 1 ", "name": " Student ", "email": "A@U.EDU.CO "}, "type": " credit_transfer ", "academic_data": {"source_course": " A ", "target_course": " B ", "source_credits": 3, "target_credits": 3}, "documents": []}
    result = requests_handler({"rawPath": "/v1/requests/prepare", "body": json.dumps(payload)}, None)
    data = json.loads(result["body"])["data"]
    assert result["statusCode"] == 201
    assert data["type"] == "CREDIT_TRANSFER"
    assert data["student"]["email"] == "a@u.edu.co"
