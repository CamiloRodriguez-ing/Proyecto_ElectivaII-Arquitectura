import base64
import json

from botocore.exceptions import ClientError

from functions.analytics_ingest import handler


def event_for(payload: dict) -> dict:
    value = base64.b64encode(json.dumps(payload).encode()).decode()
    return {"records": {"academic-requests-0": [{"value": value}]}}


def test_archive_is_pseudonymized_and_create_only(monkeypatch):
    calls = []

    class S3:
        def put_object(self, **kwargs):
            calls.append(kwargs)

    monkeypatch.setattr(handler.boto3, "client", lambda *args, **kwargs: S3())
    monkeypatch.setenv("ANALYTICS_BUCKET", "archive")
    monkeypatch.setenv("ANALYTICS_PSEUDONYM_SALT", "test-private-salt")
    result = handler.lambda_handler(
        event_for(
            {
                "event_id": "event-1",
                "event_type": "request.submitted.v2",
                "occurred_at": "2026-01-02T03:04:05Z",
                "schema_version": 2,
                "tenant_id": "sistemas",
                "actor": {"id": "student-1", "roles": ["STUDENT"]},
                "data": {
                    "request_id": "request-1",
                    "owner_hash_source": "student-1",
                    "email": "must-not-be-archived@example.invalid",
                },
            }
        ),
        None,
    )

    assert result == {"written": 1, "duplicates": 0}
    assert calls[0]["IfNoneMatch"] == "*"
    archived = json.loads(calls[0]["Body"])
    assert archived["actor"]["id_hash"] != "student-1"
    assert archived["data"]["student_key"] == archived["actor"]["id_hash"]
    assert "email" not in archived["data"]


def test_archive_treats_existing_event_as_idempotent(monkeypatch):
    class S3:
        def put_object(self, **kwargs):
            raise ClientError(
                {
                    "Error": {"Code": "PreconditionFailed", "Message": "exists"},
                    "ResponseMetadata": {"HTTPStatusCode": 412},
                },
                "PutObject",
            )

    monkeypatch.setattr(handler.boto3, "client", lambda *args, **kwargs: S3())
    monkeypatch.setenv("ANALYTICS_BUCKET", "archive")
    monkeypatch.setenv("ANALYTICS_PSEUDONYM_SALT", "test-private-salt")
    result = handler.lambda_handler(
        event_for(
            {
                "event_id": "event-1",
                "event_type": "request.submitted.v2",
                "occurred_at": "2026-01-02T03:04:05Z",
                "actor": {"id": "student-1", "roles": ["STUDENT"]},
                "data": {"request_id": "request-1"},
            }
        ),
        None,
    )

    assert result == {"written": 0, "duplicates": 1}
