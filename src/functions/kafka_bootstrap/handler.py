import os
from typing import Any

from kafka import KafkaAdminClient
from kafka.admin import NewTopic
from kafka.errors import TopicAlreadyExistsError

from shared.adapters.kafka_events import _MskTokenProvider

TOPICS = (
    "academic-requests",
    "academic-reviews",
    "academic-notifications",
)


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    servers = [item.strip() for item in os.environ["KAFKA_BOOTSTRAP_SERVERS"].split(",") if item.strip()]
    admin = KafkaAdminClient(
        bootstrap_servers=servers,
        security_protocol="SASL_SSL",
        sasl_mechanism="OAUTHBEARER",
        sasl_oauth_token_provider=_MskTokenProvider(),
        client_id="academic-topic-bootstrap",
        request_timeout_ms=15_000,
        api_version_auto_timeout_ms=15_000,
    )
    try:
        existing = set(admin.list_topics())
        missing = [topic for topic in TOPICS if topic not in existing]
        if missing:
            try:
                admin.create_topics(
                    [NewTopic(name=topic, num_partitions=2, replication_factor=-1) for topic in missing]
                )
            except TopicAlreadyExistsError:
                pass
        return {"topics": list(TOPICS), "created": missing}
    finally:
        admin.close()
