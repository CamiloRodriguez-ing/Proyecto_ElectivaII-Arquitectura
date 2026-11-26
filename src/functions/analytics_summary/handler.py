from shared.adapters.druid import summary_for_tenant
from shared.adapters.http_api_v2 import handler_for


def lambda_handler(event, context):
    def prepare(_body, principal):
        return {"tenant_id": None if "ADMINISTRATOR" in principal.roles else principal.tenant_id}

    def execute(identity):
        return summary_for_tenant(identity["tenant_id"])

    return handler_for(
        execute,
        event,
        required_roles={"ANALYST", "ADMINISTRATOR"},
        prepare_body=prepare,
    )
