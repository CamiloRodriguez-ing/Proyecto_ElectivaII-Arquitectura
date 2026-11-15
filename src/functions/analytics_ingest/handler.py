import base64
import hashlib
import json
import os
from datetime import datetime

import boto3

ANALYTICS_DATA_FIELDS = {
    "request_id",
    "type",
    "status",
    "source_course",
    "target_course",
    "source_credits",
    "target_credits",
    "created_at",
    "previous_status",
    "new_status",
    "decision",
    "reviewer_role",
    "occurred_at",
    "submitted_at",
}


def _pseudonym(value: str) -> str:
    salt = os.environ["ANALYTICS_PSEUDONYM_SALT"]
    return hashlib.sha256(f"{salt}:{value}".encode()).hexdigest()


def lambda_handler(event, context):
    endpoint = os.environ.get("S3_ENDPOINT_URL")
    s3 = boto3.client("s3", endpoint_url=endpoint) if endpoint else boto3.client("s3")
    bucket = os.environ["ANALYTICS_BUCKET"]
    written = 0
    for records in event.get("records", {}).values():
        for record in records:
            payload = json.loads(base64.b64decode(record["value"]).decode("utf-8"))
            event_id = str(payload["event_id"])
            occurred = datetime.fromisoformat(payload["occurred_at"])
            actor = payload.get("actor", {})
            source_data = payload.get("data", {})
            data = {key: source_data[key] for key in ANALYTICS_DATA_FIELDS if key in source_data}
            if "owner_hash_source" in source_data:
                data["student_key"] = _pseudonym(str(source_data["owner_hash_source"]))
            analytics_record = {
                "event_id": event_id,
                "event_type": payload["event_type"],
                "occurred_at": payload["occurred_at"],
                "aggregate_id": payload.get("aggregate_id"),
                "tenant_id": payload.get("tenant_id"),
                "schema_version": payload.get("schema_version", 1),
                "actor": {"id_hash": _pseudonym(str(actor.get("id", ""))), "roles": actor.get("roles", [])},
                "data": data,
            }
            key = (
                f"raw/event_type={payload['event_type']}/year={occurred:%Y}/month={occurred:%m}/"
                f"day={occurred:%d}/hour={occurred:%H}/{event_id}.json"
            )
            s3.put_object(
                Bucket=bucket,
                Key=key,
                Body=json.dumps(analytics_record, separators=(",", ":")).encode(),
                ContentType="application/json",
                ServerSideEncryption="AES256",
            )
            written += 1
    return {"written": written}
