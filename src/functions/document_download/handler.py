from shared.adapters.http_api_v2 import handler_for
from shared.adapters.postgres_repository import create_document_download


def lambda_handler(event, context):
    document_id = (event.get("pathParameters") or {}).get("document_id", "")

    def prepare(_body, principal):
        return {"tenant_id": principal.tenant_id, "subject": principal.subject, "roles": set(principal.roles)}

    return handler_for(
        lambda identity: create_document_download(document_id=document_id, **identity),
        event,
        required_roles={"STUDENT", "REVIEWER", "ADMINISTRATOR"},
        prepare_body=prepare,
    )
