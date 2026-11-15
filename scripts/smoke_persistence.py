"""Exercise the local PostgreSQL, S3, outbox, and Kafka persistence path."""

import base64
import json
import os
import urllib.request
from datetime import UTC, datetime
from uuid import uuid4

import boto3

from functions.analytics_ingest.handler import lambda_handler as ingest_analytics
from functions.outbox_publisher.handler import lambda_handler as publish_outbox
from shared.adapters.postgres_repository import (
    create_document_download,
    create_document_upload,
    create_request,
    evaluate_persisted_request,
    list_notifications,
    list_requests,
)
from shared.application.prepare_request import prepare_request


def main() -> None:
    suffix = uuid4().hex[:10]
    tenant_id = f"smoke-{suffix}"
    student_subject = f"student-{suffix}"
    pdf = b"%PDF-1.4\nlocal persistence smoke test\n%%EOF\n"

    upload = create_document_upload(
        {"name": "evidence.pdf", "mime_type": "application/pdf", "size_bytes": len(pdf)},
        tenant_id=tenant_id,
        owner_subject=student_subject,
    )
    internal_upload_url = upload["upload_url"].replace(
        os.environ["S3_PUBLIC_ENDPOINT_URL"], os.environ["S3_ENDPOINT_URL"], 1
    )
    request = urllib.request.Request(
        internal_upload_url, data=pdf, method="PUT", headers={"Content-Type": "application/pdf"}
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        assert response.status == 200

    prepared = prepare_request(
        {
            "tenant_id": tenant_id,
            "student": {
                "student_code": suffix,
                "name": "Local Smoke Student",
                "email": f"{suffix}@example.edu.co",
            },
            "type": "CREDIT_TRANSFER",
            "academic_data": {
                "source_course": "Calculus I",
                "target_course": "Differential Calculus",
                "source_credits": 3,
                "target_credits": 3,
            },
            "documents": [
                {
                    "document_id": upload["document_id"],
                    "name": "evidence.pdf",
                    "mime_type": "application/pdf",
                    "size_bytes": len(pdf),
                }
            ],
        }
    )
    created = create_request(
        prepared,
        owner_subject=student_subject,
        actor_roles={"STUDENT"},
        correlation_id=f"smoke-create-{suffix}",
    )
    assert created["status"] == "SUBMITTED"
    assert len(created["documents"]) == 1

    reviewed = evaluate_persisted_request(
        {
            "request_id": created["request_id"],
            "version": created["version"],
            "decision": "APPROVE",
            "observation": "Local integration verification",
        },
        tenant_id=tenant_id,
        actor_subject=f"reviewer-{suffix}",
        actor_roles={"REVIEWER"},
        correlation_id=f"smoke-review-{suffix}",
    )
    assert reviewed["request"]["status"] == "APPROVED"
    assert len(list_requests(tenant_id=tenant_id, subject=student_subject, roles={"STUDENT"})) == 1
    assert len(list_notifications(tenant_id=tenant_id, subject=student_subject, roles={"STUDENT"})) == 1

    download = create_document_download(
        document_id=upload["document_id"],
        tenant_id=tenant_id,
        subject=student_subject,
        roles={"STUDENT"},
    )
    internal_download_url = download["download_url"].replace(
        os.environ["S3_PUBLIC_ENDPOINT_URL"], os.environ["S3_ENDPOINT_URL"], 1
    )
    with urllib.request.urlopen(internal_download_url, timeout=10) as response:
        assert response.read() == pdf

    publication = publish_outbox({}, None)
    assert publication["failed"] == 0

    analytics_event_id = str(uuid4())
    analytics_envelope = {
        "event_id": analytics_event_id,
        "event_type": "request.submitted.v1",
        "occurred_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "aggregate_id": created["request_id"],
        "tenant_id": tenant_id,
        "actor": {"id": student_subject, "roles": ["STUDENT"]},
        "data": {"owner_hash_source": student_subject, "status": "SUBMITTED"},
    }
    encoded = base64.b64encode(json.dumps(analytics_envelope).encode()).decode()
    ingestion = ingest_analytics({"records": {"academic-requests-0": [{"value": encoded}]}}, None)
    assert ingestion == {"written": 1}
    s3 = boto3.client("s3", endpoint_url=os.environ["S3_ENDPOINT_URL"])
    objects = s3.list_objects_v2(Bucket=os.environ["ANALYTICS_BUCKET"], Prefix="raw/")["Contents"]
    analytics_key = next(item["Key"] for item in objects if analytics_event_id in item["Key"])
    raw_record = s3.get_object(Bucket=os.environ["ANALYTICS_BUCKET"], Key=analytics_key)["Body"].read()
    assert student_subject.encode() not in raw_record
    assert b"student_key" in raw_record

    print(
        json.dumps(
            {
                "request_id": created["request_id"],
                "document_id": upload["document_id"],
                "final_status": reviewed["request"]["status"],
                "outbox": publication,
                "analytics_ingestion": ingestion,
            }
        )
    )


if __name__ == "__main__":
    main()
