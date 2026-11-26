"""Deterministic local/dev data set used by the OLAP demonstration."""

import json
import os
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid5

from shared.adapters.postgres_repository import connection

DATASET_VERSION = "olap-demo-v1"
NAMESPACE = UUID("2bd3d30d-0e56-4a6f-8c15-f25d247708b2")
TENANTS = ("sistemas", "minas", "electronica")
COURSE_PAIRS = (
    ("CALCULO-I", "MATEMATICAS-I", 4, 4),
    ("PROGRAMACION-I", "FUNDAMENTOS-PROGRAMACION", 3, 3),
    ("FISICA-I", "FISICA-MECANICA", 4, 4),
    ("BASES-DATOS", "SISTEMAS-DATOS", 3, 3),
    ("ESTADISTICA", "PROBABILIDAD-ESTADISTICA", 3, 4),
    ("ETICA", "ETICA-PROFESIONAL", 2, 2),
)
OUTCOMES = ("APPROVED", "APPROVED", "REJECTED", "CHANGES_REQUESTED", "SUBMITTED")


def stable_id(kind: str, index: int, suffix: str = "") -> UUID:
    return uuid5(NAMESPACE, f"{DATASET_VERSION}:{kind}:{index}:{suffix}")


def month_start(index: int) -> datetime:
    absolute_month = (2025 * 12 + 11) + index
    return datetime(absolute_month // 12, absolute_month % 12 + 1, 1, 9, tzinfo=UTC)


def event_payload(
    index: int,
    tenant: str,
    submitted: datetime,
    course: tuple[str, str, int, int],
) -> dict[str, Any]:
    source, target, source_credits, target_credits = course
    return {
        "request_id": str(stable_id("request", index)),
        "tenant_id": tenant,
        "type": "CREDIT_TRANSFER",
        "status": "SUBMITTED",
        "source_course": source,
        "target_course": target,
        "source_credits": source_credits,
        "target_credits": target_credits,
        "owner_hash_source": f"demo-student-{index:03d}",
        "submitted_at": submitted.isoformat().replace("+00:00", "Z"),
    }


def insert_outbox(
    conn: Any,
    *,
    event_id: UUID,
    request_id: UUID,
    topic: str,
    event_type: str,
    tenant: str,
    actor: str,
    roles: list[str],
    payload: dict[str, Any],
    occurred_at: datetime,
) -> None:
    conn.execute(
        """
        INSERT INTO outbox_events
          (event_id, aggregate_type, aggregate_id, topic, event_type, schema_version,
           correlation_id, actor_subject, actor_roles, tenant_id, payload, occurred_at)
        VALUES (%s, 'request', %s, %s, %s, 2, %s, %s, %s::jsonb, %s, %s::jsonb, %s)
        ON CONFLICT (event_id) DO NOTHING
        """,
        (
            event_id,
            str(request_id),
            topic,
            event_type,
            f"{DATASET_VERSION}-{event_id}",
            actor,
            json.dumps(roles),
            tenant,
            json.dumps(payload),
            occurred_at,
        ),
    )


def seed_demo() -> dict[str, Any]:
    """Insert the idempotent demo data and its v2 outbox events."""
    environment = os.environ.get("APP_ENV", "").lower()
    if environment not in {"local", "dev"}:
        raise RuntimeError("Demo seed is restricted to APP_ENV=local or APP_ENV=dev")

    with connection() as conn, conn.transaction():
        for index in range(300):
            request_id = stable_id("request", index)
            tenant = TENANTS[index % len(TENANTS)]
            course = COURSE_PAIRS[index % len(COURSE_PAIRS)]
            submitted = month_start(index // 25) + timedelta(days=index % 25, hours=index % 8)
            outcome = OUTCOMES[index % len(OUTCOMES)]
            review_steps: list[tuple[str, str, str, datetime]] = []
            if outcome == "APPROVED" and index % 10 == 0:
                review_steps.append(
                    ("REQUEST_CHANGES", "SUBMITTED", "CHANGES_REQUESTED", submitted + timedelta(hours=12))
                )
                review_steps.append(
                    ("APPROVE", "CHANGES_REQUESTED", "APPROVED", submitted + timedelta(hours=48))
                )
            elif outcome != "SUBMITTED":
                decision = {
                    "APPROVED": "APPROVE",
                    "REJECTED": "REJECT",
                    "CHANGES_REQUESTED": "REQUEST_CHANGES",
                }[outcome]
                review_steps.append(
                    (decision, "SUBMITTED", outcome, submitted + timedelta(hours=18 + index % 72))
                )

            academic_data = {
                "source_course": course[0],
                "target_course": course[1],
                "source_credits": course[2],
                "target_credits": course[3],
            }
            resolved_at = review_steps[-1][3] if outcome in {"APPROVED", "REJECTED"} else None
            conn.execute(
                """
                INSERT INTO academic_requests
                  (request_id, tenant_id, owner_subject, request_type, status, student,
                   academic_data, version, created_at, updated_at, resolved_at, idempotency_key)
                VALUES (%s,%s,%s,'CREDIT_TRANSFER',%s,%s::jsonb,%s::jsonb,%s,%s,%s,%s,%s)
                ON CONFLICT (request_id) DO NOTHING
                """,
                (
                    request_id,
                    tenant,
                    f"demo-student-{index:03d}",
                    outcome,
                    json.dumps(
                        {
                            "student_code": f"DEMO-{index:03d}",
                            "name": f"Synthetic Student {index:03d}",
                            "email": f"demo-{index:03d}@example.invalid",
                        }
                    ),
                    json.dumps(academic_data),
                    1 + len(review_steps),
                    submitted,
                    review_steps[-1][3] if review_steps else submitted,
                    resolved_at,
                    f"{DATASET_VERSION}-{index:03d}",
                ),
            )
            insert_outbox(
                conn,
                event_id=stable_id("submission-event", index),
                request_id=request_id,
                topic="academic-requests",
                event_type="request.submitted.v2",
                tenant=tenant,
                actor=f"demo-student-{index:03d}",
                roles=["STUDENT"],
                payload=event_payload(index, tenant, submitted, course),
                occurred_at=submitted,
            )

            for review_index, (decision, previous, new_status, occurred) in enumerate(review_steps):
                review_id = stable_id("review", index, str(review_index))
                reviewer_role = "ADMINISTRATOR" if (index + review_index) % 7 == 0 else "REVIEWER"
                conn.execute(
                    """
                    INSERT INTO request_reviews
                      (review_id, request_id, tenant_id, decision, observation, actor_subject,
                       actor_role, previous_status, new_status, created_at)
                    VALUES (%s,%s,%s,%s,'Synthetic demo decision',%s,%s,%s,%s,%s)
                    ON CONFLICT (review_id) DO NOTHING
                    """,
                    (
                        review_id,
                        request_id,
                        tenant,
                        decision,
                        f"demo-reviewer-{(index + review_index) % 9}",
                        reviewer_role,
                        previous,
                        new_status,
                        occurred,
                    ),
                )
                review_payload = {
                    **event_payload(index, tenant, submitted, course),
                    "previous_status": previous,
                    "new_status": new_status,
                    "decision": decision,
                    "reviewer_role": reviewer_role,
                    "occurred_at": occurred.isoformat().replace("+00:00", "Z"),
                }
                review_payload.pop("status")
                review_payload.pop("owner_hash_source")
                insert_outbox(
                    conn,
                    event_id=stable_id("review-event", index, str(review_index)),
                    request_id=request_id,
                    topic="academic-reviews",
                    event_type="request.status_changed.v2",
                    tenant=tenant,
                    actor=f"demo-reviewer-{(index + review_index) % 9}",
                    roles=[reviewer_role],
                    payload=review_payload,
                    occurred_at=occurred,
                )

    return {"dataset_version": DATASET_VERSION, "requests": 300, "reviews": 270}
