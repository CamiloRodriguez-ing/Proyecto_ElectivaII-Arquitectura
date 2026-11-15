from shared.adapters.http_api_v2 import handler_for
from shared.adapters.postgres_repository import get_request, list_requests


def lambda_handler(event, context):
    path_parameters = event.get("pathParameters") or {}
    query = event.get("queryStringParameters") or {}

    def prepare(_body, principal):
        return {
            "subject": principal.subject,
            "roles": set(principal.roles),
            "tenant_id": principal.tenant_id,
        }

    def execute(context_data):
        request_id = path_parameters.get("request_id")
        if request_id:
            return get_request(request_id=request_id, **context_data)
        return list_requests(limit=int(query.get("limit", "50")), **context_data)

    return handler_for(
        execute, event, required_roles={"STUDENT", "REVIEWER", "ANALYST", "ADMINISTRATOR"}, prepare_body=prepare
    )

