"""Archive Kafka analytical events to the local S3-compatible object store."""

import base64
import os

from kafka import KafkaConsumer

from functions.analytics_ingest.handler import lambda_handler


def main() -> None:
    topics = [
        os.environ.get("KAFKA_TOPIC_REQUESTS", "academic-requests"),
        os.environ.get("KAFKA_TOPIC_REVIEWS", "academic-reviews"),
    ]
    consumer = KafkaConsumer(
        *topics,
        bootstrap_servers=os.environ["KAFKA_BOOTSTRAP_SERVERS"].split(","),
        group_id="academic-analytics-archive-v2",
        enable_auto_commit=False,
        auto_offset_reset="earliest",
    )
    for message in consumer:
        event = {
            "records": {
                f"{message.topic}-{message.partition}": [
                    {"value": base64.b64encode(message.value).decode("ascii")}
                ]
            }
        }
        lambda_handler(event, None)
        consumer.commit()


if __name__ == "__main__":
    main()
