import json
import os
from datetime import datetime, timezone
from threading import Lock
from typing import Any
from uuid import uuid4


class KafkaPublishError(Exception):
    """Raised when an event cannot be acknowledged by Kafka."""


class _MskTokenProvider:
    def token(self) -> str:
        from aws_msk_iam_sasl_signer import MSKAuthTokenProvider

        token, _ = MSKAuthTokenProvider.generate_auth_token(os.environ.get("AWS_REGION", "us-east-1"))
        return token


class KafkaEventPublisher:
    def __init__(self) -> None:
        self._producer = None
        self._lock = Lock()

    def publish(
        self,
        *,
        topic: str,
        event_type: str,
        actor_id: str,
        actor_roles: set[str] | frozenset[str],
        data: dict[str, Any],
        correlation_id: str,
        aggregate_id: str | None = None,
    ) -> dict[str, Any] | None:
        if os.environ.get("KAFKA_ENABLED", "false").lower() != "true":
            return None

        event = {
            "event_id": str(uuid4()),
            "event_type": event_type,
            "occurred_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "source": "academic-requests-api",
            "schema_version": 1,
            "correlation_id": correlation_id,
            "actor": {"id": actor_id, "roles": sorted(actor_roles)},
            "data": data,
        }
        key = (aggregate_id or actor_id).encode("utf-8")
        try:
            producer = self._get_producer()
            future = producer.send(topic, key=key, value=event)
            future.get(timeout=float(os.environ.get("KAFKA_ACK_TIMEOUT_SECONDS", "10")))
            return event
        except Exception as error:
            with self._lock:
                if self._producer is not None:
                    try:
                        self._producer.close(timeout=0)
                    except Exception:
                        pass
                    self._producer = None
            raise KafkaPublishError(f"Kafka did not acknowledge {event_type}") from error

    def _get_producer(self):
        if self._producer is not None:
            return self._producer
        with self._lock:
            if self._producer is None:
                self._producer = self._create_producer()
        return self._producer

    @staticmethod
    def _create_producer():
        from kafka import KafkaProducer

        bootstrap_servers = [
            server.strip()
            for server in os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "").split(",")
            if server.strip()
        ]
        if not bootstrap_servers:
            raise KafkaPublishError("KAFKA_BOOTSTRAP_SERVERS is required when Kafka is enabled")

        mechanism = os.environ.get("KAFKA_SASL_MECHANISM", "AWS_MSK_IAM")
        options: dict[str, Any] = {
            "bootstrap_servers": bootstrap_servers,
            "value_serializer": lambda value: json.dumps(value, separators=(",", ":")).encode("utf-8"),
            "acks": "all",
            "retries": 3,
            "request_timeout_ms": 10_000,
            "max_block_ms": 10_000,
            "security_protocol": os.environ.get("KAFKA_SECURITY_PROTOCOL", "SASL_SSL"),
        }
        if mechanism == "OAUTHBEARER" or mechanism == "AWS_MSK_IAM":
            options["sasl_mechanism"] = "OAUTHBEARER"
            options["sasl_oauth_token_provider"] = _MskTokenProvider()
        elif mechanism in {"PLAIN", "SCRAM-SHA-256", "SCRAM-SHA-512"}:
            options["sasl_mechanism"] = mechanism
            username, password = _load_sasl_credentials()
            options["sasl_plain_username"] = username
            options["sasl_plain_password"] = password
        return KafkaProducer(**options)


def _load_sasl_credentials() -> tuple[str, str]:
    secret_id = os.environ.get("KAFKA_CREDENTIALS_SECRET_ID", "")
    if secret_id:
        import boto3

        secret = boto3.client("secretsmanager").get_secret_value(SecretId=secret_id)["SecretString"]
        credentials = json.loads(secret)
        return str(credentials["username"]), str(credentials["password"])
    return os.environ.get("KAFKA_USERNAME", ""), os.environ.get("KAFKA_PASSWORD", "")


publisher = KafkaEventPublisher()


def publish_event(**kwargs: Any) -> dict[str, Any] | None:
    return publisher.publish(**kwargs)
