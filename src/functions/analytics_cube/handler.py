from shared.adapters.druid import cube_rows
from shared.adapters.http_api_v2 import handler_for


def lambda_handler(event, context):
    query = event.get("queryStringParameters") or {}
    cube_name = event.get("rawPath", "").rsplit("/", 1)[-1] or "requests"

    def prepare(_body, principal):
        dimensions_value = query.get("dimensions", "")
        dimensions = [item.strip() for item in dimensions_value.split(",") if item.strip()]
        filters = {
            name: str(query[name])
            for name in query
            if name != "dimensions"
        }
        return {
            "tenant_id": None if "ADMINISTRATOR" in principal.roles else principal.tenant_id,
            "dimensions": dimensions or None,
            "filters": filters,
        }

    def execute(options):
        return cube_rows(cube_name, **options)

    return handler_for(
        execute,
        event,
        required_roles={"ANALYST", "ADMINISTRATOR"},
        prepare_body=prepare,
    )
