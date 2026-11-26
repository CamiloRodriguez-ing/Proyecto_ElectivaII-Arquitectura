import json
import os
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any
from uuid import uuid4

from shared.domain.enums import RequestStatus, ReviewDecision
from shared.domain.errors import DomainError
from shared.domain.rules import next_status


def persistence_enabled() -> bool:
    return os.environ.get("PERSISTENCE_ENABLED", "false").lower() == "true"


@lru_cache(maxsize=1)
def _connection_kwargs() -> dict[str, Any]:
    dsn = os.environ.get("DATABASE_URL")
    if dsn:
        return {"conninfo": dsn}
    secret_arn = os.environ.get("DATABASE_SECRET_ARN")
    if not secret_arn:
        raise RuntimeError("DATABASE_URL or DATABASE_SECRET_ARN is required")
    import boto3

    secret = json.loads(
        boto3.client("secretsmanager").get_secret_value(SecretId=secret_arn)["SecretString"]
    )
    return {
        "host": os.environ["DATABASE_HOST"],
        "port": int(os.environ.get("DATABASE_PORT", "5432")),
        "dbname": os.environ.get("DATABASE_NAME", "academic_requests"),
        "user": secret["username"],
        "password": secret["password"],
        "sslmode": os.environ.get("DATABASE_SSLMODE", "require"),
    }


@contextmanager
def connection() -> Iterator[Any]:
    import psycopg
    from psycopg.rows import dict_row

    kwargs = _connection_kwargs()
    if "conninfo" in kwargs:
        conn = psycopg.connect(kwargs["conninfo"], row_factory=dict_row)
    else:
        conn = psycopg.connect(**kwargs, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()


def _now() -> datetime:
    return datetime.now(UTC)


def _serialize_request(row: dict[str, Any], documents: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    return {
        "request_id": str(row["request_id"]),
        "tenant_id": row["tenant_id"],
        "type": row["request_type"],
        "status": row["status"],
        "student": row["student"],
        "academic_data": row["academic_data"],
        "documents": documents or [],
        "observations": row.get("observations", []),
        "version": row["version"],
        "created_at": row["created_at"].isoformat().replace("+00:00", "Z"),
        "updated_at": row["updated_at"].isoformat().replace("+00:00", "Z"),
    }


def _document_payload(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "document_id": str(row["document_id"]),
        "name": row["original_name"],
        "mime_type": row["mime_type"],
        "size_bytes": row["size_bytes"],
        "checksum_sha256": row.get("checksum_sha256"),
        "upload_status": row["upload_status"],
    }


def create_request(
    prepared: dict[str, Any], *, owner_subject: str, actor_roles: set[str] | frozenset[str], correlation_id: str
) -> dict[str, Any]:
    event_id = uuid4()
    document_ids = [document.get("document_id") for document in prepared.get("documents", []) if document.get("document_id")]
    if document_ids:
        _verify_uploaded_documents(document_ids, prepared["tenant_id"], owner_subject)
    with connection() as conn, conn.transaction():
        row = conn.execute(
                """
                INSERT INTO academic_requests
                    (request_id, tenant_id, owner_subject, request_type, status, student,
                     academic_data, version, created_at, updated_at, idempotency_key)
                VALUES (%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s,%s,%s,%s)
                ON CONFLICT (tenant_id, owner_subject, idempotency_key) DO NOTHING
                RETURNING *
                """,
                (
                    prepared["request_id"], prepared["tenant_id"], owner_subject, prepared["type"],
                    prepared["status"], json.dumps(prepared["student"]), json.dumps(prepared["academic_data"]),
                    prepared["version"], prepared["created_at"], prepared["updated_at"], correlation_id,
                ),
            ).fetchone()
        if not row:
            existing = conn.execute(
                "SELECT * FROM academic_requests WHERE tenant_id=%s AND owner_subject=%s AND idempotency_key=%s",
                (prepared["tenant_id"], owner_subject, correlation_id),
            ).fetchone()
            return _serialize_request(existing, _documents(conn, str(existing["request_id"])))

        if document_ids:
            updated = conn.execute(
                """
                UPDATE request_documents SET request_id=%s, upload_status='ATTACHED'
                WHERE document_id = ANY(%s::uuid[]) AND tenant_id=%s AND owner_subject=%s AND request_id IS NULL
                RETURNING *
                """,
                (prepared["request_id"], document_ids, prepared["tenant_id"], owner_subject),
            ).fetchall()
            if len(updated) != len(document_ids):
                raise DomainError("INVALID_DOCUMENT", "One or more documents are unavailable")

        _insert_outbox(
            conn, event_id=event_id, topic=os.environ.get("KAFKA_TOPIC_REQUESTS", "academic-requests"),
            event_type="request.submitted.v2", aggregate_id=prepared["request_id"], correlation_id=correlation_id,
            actor_subject=owner_subject, actor_roles=actor_roles, tenant_id=prepared["tenant_id"],
            schema_version=2,
            payload={
                "request_id": prepared["request_id"], "tenant_id": prepared["tenant_id"],
                "type": prepared["type"], "status": prepared["status"],
                "source_course": prepared["academic_data"].get("source_course"),
                "target_course": prepared["academic_data"].get("target_course"),
                "source_credits": prepared["academic_data"].get("source_credits"),
                "target_credits": prepared["academic_data"].get("target_credits"),
                "owner_hash_source": owner_subject, "submitted_at": prepared["created_at"],
            },
        )
        return _serialize_request(row, [_document_payload(item) for item in updated] if document_ids else [])


def list_requests(*, tenant_id: str, subject: str, roles: set[str] | frozenset[str], limit: int = 50) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 100))
    params: list[Any] = [tenant_id]
    where = "tenant_id=%s"
    if "STUDENT" in roles and "ADMINISTRATOR" not in roles:
        where += " AND owner_subject=%s"
        params.append(subject)
    params.append(limit)
    with connection() as conn:
        rows = conn.execute(
            f"SELECT * FROM academic_requests WHERE {where} ORDER BY created_at DESC LIMIT %s", params
        ).fetchall()
        return [_serialize_request(row, _documents(conn, str(row["request_id"]))) for row in rows]


def get_request(*, request_id: str, tenant_id: str, subject: str, roles: set[str] | frozenset[str]) -> dict[str, Any]:
    with connection() as conn:
        row = conn.execute(
            "SELECT * FROM academic_requests WHERE request_id=%s AND tenant_id=%s", (request_id, tenant_id)
        ).fetchone()
        if not row or ("STUDENT" in roles and "ADMINISTRATOR" not in roles and row["owner_subject"] != subject):
            raise DomainError("NOT_FOUND", "Academic request was not found")
        reviews = conn.execute(
            "SELECT observation FROM request_reviews WHERE request_id=%s ORDER BY created_at", (request_id,)
        ).fetchall()
        row = {**row, "observations": [item["observation"] for item in reviews]}
        return _serialize_request(row, _documents(conn, request_id))


def evaluate_persisted_request(
    payload: dict[str, Any], *, tenant_id: str, actor_subject: str,
    actor_roles: set[str] | frozenset[str], correlation_id: str,
) -> dict[str, Any]:
    request_id = payload.get("request_id") or payload.get("request", {}).get("request_id")
    evaluation = payload.get("evaluation", payload)
    observation = str(evaluation.get("observation", "")).strip()
    if not request_id or not observation:
        raise DomainError("VALIDATION_ERROR", "request_id and observation are required")
    try:
        decision = ReviewDecision(evaluation["decision"])
    except (KeyError, ValueError) as error:
        raise DomainError("VALIDATION_ERROR", "A valid decision is required") from error

    now = _now()
    event_id, review_id, notification_id = uuid4(), uuid4(), uuid4()
    with connection() as conn, conn.transaction():
        current = conn.execute(
            "SELECT * FROM academic_requests WHERE request_id=%s AND tenant_id=%s FOR UPDATE",
            (request_id, tenant_id),
        ).fetchone()
        if not current:
            raise DomainError("NOT_FOUND", "Academic request was not found")
        expected_version = payload.get("version") or payload.get("request", {}).get("version")
        if expected_version is not None and int(expected_version) != current["version"]:
            raise DomainError("VERSION_CONFLICT", "The request was changed by another reviewer")
        previous = RequestStatus(current["status"])
        new_status = next_status(previous, decision)
        updated = conn.execute(
            """
            UPDATE academic_requests SET status=%s, version=version+1, updated_at=%s,
                resolved_at=CASE WHEN %s IN ('APPROVED','REJECTED') THEN %s ELSE resolved_at END
            WHERE request_id=%s AND version=%s RETURNING *
            """,
            (new_status.value, now, new_status.value, now, request_id, current["version"]),
        ).fetchone()
        if not updated:
            raise DomainError("VERSION_CONFLICT", "The request was changed by another reviewer")
        actor_role = min(actor_roles)
        conn.execute(
            """INSERT INTO request_reviews
               (review_id, request_id, tenant_id, decision, observation, actor_subject, actor_role,
                previous_status, new_status, created_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (review_id, request_id, tenant_id, decision.value, observation, actor_subject, actor_role,
             previous.value, new_status.value, now),
        )
        subject = f"Academic request {new_status.value.lower()}"
        body = f"Your academic request status changed to {new_status.value}."
        conn.execute(
            """INSERT INTO notifications
               (notification_id, request_id, tenant_id, recipient_subject, recipient_email, status,
                subject, body, source_event_id, created_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (notification_id, request_id, tenant_id, current["owner_subject"], current["student"]["email"],
             new_status.value, subject, body, event_id, now),
        )
        event_payload = {
            "request_id": str(request_id), "tenant_id": tenant_id, "previous_status": previous.value,
            "new_status": new_status.value, "decision": decision.value, "reviewer_role": actor_role,
            "occurred_at": now.isoformat(), "submitted_at": current["created_at"].isoformat(),
            "type": current["request_type"],
            "source_course": current["academic_data"].get("source_course"),
            "target_course": current["academic_data"].get("target_course"),
            "source_credits": current["academic_data"].get("source_credits"),
            "target_credits": current["academic_data"].get("target_credits"),
        }
        _insert_outbox(
            conn, event_id=event_id, topic=os.environ.get("KAFKA_TOPIC_REVIEWS", "academic-reviews"),
            event_type="request.status_changed.v2", aggregate_id=str(request_id), correlation_id=correlation_id,
            actor_subject=actor_subject, actor_roles=actor_roles, tenant_id=tenant_id, payload=event_payload,
            schema_version=2,
        )
        request_payload = _serialize_request(
            {**updated, "observations": [observation]}, _documents(conn, str(request_id))
        )
        return {
            "request": request_payload,
            "event": {
                "event_id": str(event_id), "event_type": "request.status_changed.v2",
                "aggregate_type": "request", "aggregate_id": str(request_id),
                "occurred_at": now.isoformat().replace("+00:00", "Z"), "schema_version": 2,
                "data": {"previous_status": previous.value, "new_status": new_status.value},
            },
        }


def create_document_upload(
    payload: dict[str, Any], *, tenant_id: str, owner_subject: str
) -> dict[str, Any]:
    import re

    import boto3

    name = str(payload.get("name", "")).strip()
    mime_type = str(payload.get("mime_type", "")).lower()
    size = int(payload.get("size_bytes", 0))
    if not name or mime_type != "application/pdf" or not 0 < size <= 10_000_000:
        raise DomainError("INVALID_DOCUMENT", "Only PDF documents up to 10 MB are accepted")
    document_id = uuid4()
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", name)[:160]
    object_key = f"{tenant_id}/{owner_subject}/{document_id}/{safe_name}"
    with connection() as conn, conn.transaction():
        conn.execute(
            """INSERT INTO request_documents
               (document_id, tenant_id, owner_subject, object_key, original_name, mime_type,
                size_bytes, checksum_sha256, upload_status)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'PENDING')""",
            (document_id, tenant_id, owner_subject, object_key, name, mime_type, size, payload.get("checksum_sha256")),
        )
    endpoint = os.environ.get("S3_ENDPOINT_URL")
    client = boto3.client("s3", endpoint_url=endpoint) if endpoint else boto3.client("s3")
    bucket = os.environ["DOCUMENT_BUCKET"]
    upload_url = client.generate_presigned_url(
        "put_object", Params={"Bucket": bucket, "Key": object_key, "ContentType": mime_type}, ExpiresIn=300
    )
    public_endpoint = os.environ.get("S3_PUBLIC_ENDPOINT_URL")
    if endpoint and public_endpoint:
        upload_url = upload_url.replace(endpoint.rstrip("/"), public_endpoint.rstrip("/"), 1)
    return {"document_id": str(document_id), "upload_url": upload_url, "expires_in": 300}


def create_document_download(
    *, document_id: str, tenant_id: str, subject: str, roles: set[str] | frozenset[str]
) -> dict[str, Any]:
    with connection() as conn:
        row = conn.execute(
            "SELECT d.* FROM request_documents d WHERE d.document_id=%s AND d.tenant_id=%s",
            (document_id, tenant_id),
        ).fetchone()
        if not row or ("STUDENT" in roles and "ADMINISTRATOR" not in roles and row["owner_subject"] != subject):
            raise DomainError("NOT_FOUND", "Document was not found")
    import boto3

    endpoint = os.environ.get("S3_ENDPOINT_URL")
    client = boto3.client("s3", endpoint_url=endpoint) if endpoint else boto3.client("s3")
    url = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": os.environ["DOCUMENT_BUCKET"], "Key": row["object_key"]},
        ExpiresIn=300,
    )
    public_endpoint = os.environ.get("S3_PUBLIC_ENDPOINT_URL")
    if endpoint and public_endpoint:
        url = url.replace(endpoint.rstrip("/"), public_endpoint.rstrip("/"), 1)
    return {"document_id": document_id, "download_url": url, "expires_in": 300}


def list_notifications(*, tenant_id: str, subject: str, roles: set[str] | frozenset[str]) -> list[dict[str, Any]]:
    params: list[Any] = [tenant_id]
    where = "tenant_id=%s"
    if "ADMINISTRATOR" not in roles and "REVIEWER" not in roles:
        where += " AND recipient_subject=%s"
        params.append(subject)
    with connection() as conn:
        rows = conn.execute(
            f"SELECT * FROM notifications WHERE {where} ORDER BY created_at DESC LIMIT 100", params
        ).fetchall()
        return [
            {
                "id": str(row["notification_id"]), "request_id": str(row["request_id"]),
                "status": row["status"], "recipient_email": row["recipient_email"],
                "date": row["created_at"].isoformat(), "subject": row["subject"], "body": row["body"],
                "event_id": str(row["source_event_id"]), "isRead": row["is_read"],
            }
            for row in rows
        ]


def mark_notification_read(*, notification_id: str, tenant_id: str, subject: str, roles: set[str] | frozenset[str]) -> dict[str, Any]:
    params: list[Any] = [notification_id, tenant_id]
    owner_clause = ""
    if "ADMINISTRATOR" not in roles and "REVIEWER" not in roles:
        owner_clause = " AND recipient_subject=%s"
        params.append(subject)
    with connection() as conn, conn.transaction():
        row = conn.execute(
            f"UPDATE notifications SET is_read=true, read_at=now() "
            f"WHERE notification_id=%s AND tenant_id=%s{owner_clause} RETURNING notification_id",
            params,
        ).fetchone()
        if not row:
            raise DomainError("NOT_FOUND", "Notification was not found")
    return {"success": True, "notification_id": notification_id}


def _documents(conn: Any, request_id: str) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT * FROM request_documents WHERE request_id=%s ORDER BY created_at", (request_id,)).fetchall()
    return [_document_payload(row) for row in rows]


def _verify_uploaded_documents(document_ids: list[str], tenant_id: str, owner_subject: str) -> None:
    import boto3

    with connection() as conn:
        rows = conn.execute(
            "SELECT * FROM request_documents WHERE document_id=ANY(%s::uuid[]) AND tenant_id=%s AND owner_subject=%s AND request_id IS NULL",
            (document_ids, tenant_id, owner_subject),
        ).fetchall()
    if len(rows) != len(document_ids):
        raise DomainError("INVALID_DOCUMENT", "One or more documents are unavailable")
    endpoint = os.environ.get("S3_ENDPOINT_URL")
    client = boto3.client("s3", endpoint_url=endpoint) if endpoint else boto3.client("s3")
    bucket = os.environ["DOCUMENT_BUCKET"]
    for row in rows:
        try:
            metadata = client.head_object(Bucket=bucket, Key=row["object_key"])
        except Exception as error:
            raise DomainError("DOCUMENT_NOT_UPLOADED", f"Document {row['original_name']} has not been uploaded") from error
        if int(metadata["ContentLength"]) != row["size_bytes"]:
            raise DomainError("DOCUMENT_SIZE_MISMATCH", f"Document {row['original_name']} size does not match")
    with connection() as conn, conn.transaction():
        conn.execute(
            "UPDATE request_documents SET upload_status='UPLOADED' WHERE document_id=ANY(%s::uuid[])",
            (document_ids,),
        )


def _insert_outbox(
    conn: Any, *, event_id: Any, topic: str, event_type: str, aggregate_id: str, correlation_id: str,
    actor_subject: str, actor_roles: set[str] | frozenset[str], tenant_id: str, payload: dict[str, Any],
    schema_version: int = 1,
) -> None:
    conn.execute(
        """INSERT INTO outbox_events
           (event_id, aggregate_type, aggregate_id, topic, event_type, correlation_id,
            actor_subject, actor_roles, tenant_id, payload, schema_version)
           VALUES (%s,'request',%s,%s,%s,%s,%s,%s::jsonb,%s,%s::jsonb,%s)""",
        (event_id, aggregate_id, topic, event_type, correlation_id, actor_subject,
         json.dumps(sorted(actor_roles)), tenant_id, json.dumps(payload), schema_version),
    )
