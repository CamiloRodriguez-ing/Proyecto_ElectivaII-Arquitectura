import json
from unittest.mock import MagicMock

import pytest

from shared.adapters.kafka_events import KafkaEventPublisher, KafkaPublishError


def test_disabled_publisher_is_a_noop(monkeypatch):
    monkeypatch.setenv("KAFKA_ENABLED", "false")
    publisher = KafkaEventPublisher()

    assert publisher.publish(
        topic="events",
        event_type="request.validated.v1",
        actor_id="student-1",
        actor_roles={"STUDENT"},
        data={"valid": True},
        correlation_id="correlation-1",
    ) is None


def test_publisher_builds_versioned_envelope_and_waits_for_ack(monkeypatch):
    monkeypatch.setenv("KAFKA_ENABLED", "true")
    publisher = KafkaEventPublisher()
    producer = MagicMock()
    publisher._producer = producer

    event = publisher.publish(
        topic="academic-requests",
        event_type="request.submitted.v1",
        actor_id="student-1",
        actor_roles={"STUDENT"},
        data={"request_id": "request-1"},
        correlation_id="correlation-1",
        aggregate_id="request-1",
    )

    assert event["schema_version"] == 1
    assert event["actor"] == {"id": "student-1", "roles": ["STUDENT"]}
    producer.send.assert_called_once_with(
        "academic-requests",
        key=b"request-1",
        value=event,
    )
    producer.send.return_value.get.assert_called_once_with(timeout=10.0)


def test_publish_failure_resets_cached_producer(monkeypatch):
    monkeypatch.setenv("KAFKA_ENABLED", "true")
    publisher = KafkaEventPublisher()
    producer = MagicMock()
    producer.send.side_effect = RuntimeError("broker unavailable")
    publisher._producer = producer

    with pytest.raises(KafkaPublishError):
        publisher.publish(
            topic="events",
            event_type="test.v1",
            actor_id="actor-1",
            actor_roles={"ADMINISTRATOR"},
            data={},
            correlation_id="correlation-1",
        )

    assert publisher._producer is None


def test_serializer_emits_compact_json(monkeypatch):
    monkeypatch.setenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9098")
    monkeypatch.setenv("KAFKA_SASL_MECHANISM", "AWS_MSK_IAM")
    fake_kafka = MagicMock()
    monkeypatch.setitem(__import__("sys").modules, "kafka", fake_kafka)

    KafkaEventPublisher._create_producer()

    serializer = fake_kafka.KafkaProducer.call_args.kwargs["value_serializer"]
    assert serializer({"a": 1}) == json.dumps({"a": 1}, separators=(",", ":")).encode()
