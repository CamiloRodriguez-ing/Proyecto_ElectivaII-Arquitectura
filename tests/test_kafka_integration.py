import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

# pyrefly: ignore [missing-import]
import main
# pyrefly: ignore [missing-import]
from kafka_producer import (
    ServerlessKafkaProducer,
    KafkaEventProducer,
    KafkaPublishError,
    extract_actor_info,
    json_serializer,
    TOPIC_REQUESTS,
    TOPIC_REVIEWS,
    TOPIC_NOTIFICATIONS,
    TOPIC_ANALYTICS,
    EVENT_REQUEST_VALIDATED,
    EVENT_REQUEST_PREPARED,
    EVENT_REVIEW_EVALUATED,
    EVENT_NOTIFICATION_PREVIEWED,
    EVENT_ANALYTICS_SUMMARIZED,
)


# =====================================================================
# Tests Unitarios de kafka_producer.py (Serverless)
# =====================================================================

def test_json_serializer():
    data = {"key": "value", "number": 123}
    serialized = json_serializer(data)
    assert isinstance(serialized, bytes)
    assert b"\"key\": \"value\"" in serialized


def test_extract_actor_info():
    token_payload = {
        "sub": "user-uuid-1234",
        "resource_access": {
            "academic-api": {
                "roles": ["STUDENT", "ADMINISTRATOR"]
            }
        }
    }
    actor_id, roles = extract_actor_info(token_payload)
    assert actor_id == "user-uuid-1234"
    assert roles == ["STUDENT", "ADMINISTRATOR"]


@pytest.mark.asyncio
async def test_kafka_producer_send_event_structure():
    producer = ServerlessKafkaProducer(bootstrap_servers="localhost:9092")
    mock_inner_producer = MagicMock()
    mock_future = MagicMock()
    mock_meta = MagicMock()
    mock_meta.partition = 0
    mock_meta.offset = 42
    mock_future.get.return_value = mock_meta
    mock_inner_producer.send.return_value = mock_future

    producer._producer = mock_inner_producer

    data_payload = {"student_id": "1001", "credits": 3}
    event = await producer.send_event(
        topic="academic-requests",
        event_type="RequestValidated",
        actor="student-sub-123",
        data=data_payload
    )

    # Verificar estructura exacta requerida
    assert event["event_type"] == "RequestValidated"
    assert event["actor"] == "student-sub-123"
    assert "timestamp" in event
    assert event["data"] == data_payload

    # Verificar llamada interna a send y a flush (crítico en Serverless)
    mock_inner_producer.send.assert_called_once()
    mock_inner_producer.flush.assert_called_once()
    mock_future.get.assert_called_once()

    call_kwargs = mock_inner_producer.send.call_args.kwargs
    assert mock_inner_producer.send.call_args.args[0] == "academic-requests"
    assert call_kwargs["value"]["event_type"] == "RequestValidated"
    assert call_kwargs["value"]["actor"] == "student-sub-123"
    assert call_kwargs["key"] == b"student-sub-123"


@pytest.mark.asyncio
async def test_kafka_producer_error_handling():
    producer = ServerlessKafkaProducer(bootstrap_servers="localhost:9092")
    mock_inner_producer = MagicMock()
    mock_inner_producer.send.side_effect = Exception("Kafka connection lost")
    producer._producer = mock_inner_producer

    with pytest.raises(KafkaPublishError) as exc_info:
        await producer.send_event(
            topic="test-topic",
            event_type="TestEvent",
            actor="actor-1",
            data={}
        )
    assert "Fallo al publicar evento" in str(exc_info.value)
    # Verificar que el productor se reinicia a None ante fallos
    assert producer._producer is None


# =====================================================================
# Tests de Integración de Endpoints FastAPI con Kafka
# =====================================================================

@pytest.fixture
def mock_kafka():
    with patch("main.kafka_producer.send_event", new_callable=AsyncMock) as mock_send:
        yield mock_send


def test_health_endpoint():
    client = TestClient(main.app)
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "Service health"}


def test_validate_request_emits_kafka_event(mock_kafka):
    dummy_payload = {
        "sub": "student-123",
        "resource_access": {
            "academic-api": {
                "roles": ["STUDENT"]
            }
        }
    }

    main.app.dependency_overrides[main.verify_jwt] = lambda: dummy_payload

    client = TestClient(main.app)
    request_data = {"type": "CREDIT_TRANSFER", "course": "Arquitectura"}
    response = client.post("/v1/requests/validate", json=request_data)

    assert response.status_code == 200
    resp_json = response.json()
    assert resp_json["actor"] == "student-123"
    assert resp_json["data"] == request_data

    mock_kafka.assert_awaited_once_with(
        topic=TOPIC_REQUESTS,
        event_type=EVENT_REQUEST_VALIDATED,
        actor="student-123",
        data=request_data
    )

    main.app.dependency_overrides.clear()


def test_prepare_request_emits_kafka_event(mock_kafka):
    dummy_payload = {
        "sub": "student-456",
        "resource_access": {
            "academic-api": {
                "roles": ["STUDENT"]
            }
        }
    }

    main.app.dependency_overrides[main.verify_jwt] = lambda: dummy_payload

    client = TestClient(main.app)
    request_data = {"request_id": "req-999"}
    response = client.post("/v1/requests/prepare", json=request_data)

    assert response.status_code == 201
    mock_kafka.assert_awaited_once_with(
        topic=TOPIC_REQUESTS,
        event_type=EVENT_REQUEST_PREPARED,
        actor="student-456",
        data=request_data
    )

    main.app.dependency_overrides.clear()


def test_evaluate_request_emits_kafka_event(mock_kafka):
    dummy_payload = {
        "sub": "reviewer-789",
        "resource_access": {
            "academic-api": {
                "roles": ["REVIEWER"]
            }
        }
    }

    main.app.dependency_overrides[main.verify_jwt] = lambda: dummy_payload

    client = TestClient(main.app)
    request_data = {"evaluation": "APPROVED", "score": 95}
    response = client.post("/v1/reviews/evaluate", json=request_data)

    assert response.status_code == 200
    mock_kafka.assert_awaited_once_with(
        topic=TOPIC_REVIEWS,
        event_type=EVENT_REVIEW_EVALUATED,
        actor="reviewer-789",
        data=request_data
    )

    main.app.dependency_overrides.clear()


def test_preview_notification_emits_kafka_event(mock_kafka):
    dummy_payload = {
        "sub": "notif-service-01",
        "resource_access": {
            "academic-api": {
                "roles": ["NOTIFICATION_SERVICE"]
            }
        }
    }

    main.app.dependency_overrides[main.verify_jwt] = lambda: dummy_payload

    client = TestClient(main.app)
    request_data = {"recipient": "user@test.edu", "template": "REQUEST_ACCEPTED"}
    response = client.post("/v1/notifications/preview", json=request_data)

    assert response.status_code == 200
    mock_kafka.assert_awaited_once_with(
        topic=TOPIC_NOTIFICATIONS,
        event_type=EVENT_NOTIFICATION_PREVIEWED,
        actor="notif-service-01",
        data=request_data
    )

    main.app.dependency_overrides.clear()


def test_analytics_summary_emits_kafka_event(mock_kafka):
    dummy_payload = {
        "sub": "analyst-321",
        "resource_access": {
            "academic-api": {
                "roles": ["ANALYST"]
            }
        }
    }

    main.app.dependency_overrides[main.verify_jwt] = lambda: dummy_payload

    client = TestClient(main.app)
    request_data = {"period": "2026-Q1", "metrics": ["throughput", "latencies"]}
    response = client.post("/v1/analytics/summary", json=request_data)

    assert response.status_code == 200
    mock_kafka.assert_awaited_once_with(
        topic=TOPIC_ANALYTICS,
        event_type=EVENT_ANALYTICS_SUMMARIZED,
        actor="analyst-321",
        data=request_data
    )

    main.app.dependency_overrides.clear()


def test_forbidden_role_does_not_emit_kafka_event(mock_kafka):
    dummy_payload = {
        "sub": "student-123",
        "resource_access": {
            "academic-api": {
                "roles": ["STUDENT"]  # No tiene rol REVIEWER ni ADMINISTRATOR
            }
        }
    }

    main.app.dependency_overrides[main.verify_jwt] = lambda: dummy_payload

    client = TestClient(main.app)
    response = client.post("/v1/reviews/evaluate", json={"data": "test"})

    assert response.status_code == 403
    mock_kafka.assert_not_awaited()

    main.app.dependency_overrides.clear()


# =====================================================================
# Test del Handler Serverless Mangum para AWS Lambda
# =====================================================================

def test_mangum_handler_serverless_invocation():
    # Simula un evento HTTP de API Gateway PayloadFormatVersion "2.0"
    lambda_event = {
        "version": "2.0",
        "routeKey": "GET /v1/health",
        "rawPath": "/v1/health",
        "rawQueryString": "",
        "headers": {
            "accept": "application/json",
            "host": "localhost:3000"
        },
        "requestContext": {
            "http": {
                "method": "GET",
                "path": "/v1/health",
                "protocol": "HTTP/1.1",
                "sourceIp": "127.0.0.1",
                "userAgent": "pytest"
            }
        },
        "isBase64Encoded": False
    }

    response = main.handler(lambda_event, {})
    assert response["statusCode"] == 200
    assert '"status":"ok"' in response["body"].replace(" ", "")
