import os

from shared.adapters.kafka_events import KafkaPublishError, publish_envelope
from shared.adapters.postgres_repository import connection


def lambda_handler(event, context):
    if os.environ.get("KAFKA_ENABLED", "false").lower() != "true":
        return {"published": 0, "failed": 0, "skipped": "Kafka is disabled"}
    published = 0
    failed = 0
    batch_size = min(int(os.environ.get("OUTBOX_BATCH_SIZE", "50")), 100)
    with connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM outbox_events
            WHERE published_at IS NULL
            ORDER BY occurred_at
            LIMIT %s
            FOR UPDATE SKIP LOCKED
            """,
            (batch_size,),
        ).fetchall()
        for row in rows:
            envelope = {
                "event_id": str(row["event_id"]),
                "event_type": row["event_type"],
                "occurred_at": row["occurred_at"].isoformat().replace("+00:00", "Z"),
                "source": "academic-requests-api",
                "schema_version": row["schema_version"],
                "correlation_id": row["correlation_id"],
                "aggregate_type": row["aggregate_type"],
                "aggregate_id": row["aggregate_id"],
                "tenant_id": row["tenant_id"],
                "actor": {"id": row["actor_subject"], "roles": row["actor_roles"]},
                "data": row["payload"],
            }
            try:
                publish_envelope(topic=row["topic"], event=envelope, key=row["aggregate_id"])
                conn.execute(
                    "UPDATE outbox_events SET published_at=now(), attempts=attempts+1, last_error=NULL WHERE event_id=%s",
                    (row["event_id"],),
                )
                published += 1
            except KafkaPublishError as error:
                conn.execute(
                    "UPDATE outbox_events SET attempts=attempts+1, last_error=%s WHERE event_id=%s",
                    (str(error)[:1000], row["event_id"]),
                )
                failed += 1
        conn.commit()
    return {"published": published, "failed": failed}
