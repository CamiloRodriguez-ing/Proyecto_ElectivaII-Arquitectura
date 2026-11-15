from shared.adapters.http_api_v2 import handler_for
from shared.adapters.postgres_repository import create_document_upload


def lambda_handler(event, context):
    def prepare(body, principal):
        return {**body, "_tenant_id": principal.tenant_id, "_subject": principal.subject}

    def execute(body):
        return create_document_upload(
            body, tenant_id=body.pop("_tenant_id"), owner_subject=body.pop("_subject")
        )

    return handler_for(
        execute, event, success_status=201, required_roles={"STUDENT", "ADMINISTRATOR"}, prepare_body=prepare
    )

