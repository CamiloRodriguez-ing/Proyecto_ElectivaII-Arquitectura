import os
import time

import boto3

from shared.adapters.http_api_v2 import handler_for

COMMON_DIMENSIONS = {"year": "year_number", "month": "month_number", "tenant": "tenant_id"}
CUBES = {
    "requests": {
        "view": "mart.mv_cube_requests",
        "dimensions": {**COMMON_DIMENSIONS, "type": "request_type", "status": "status"},
        "default": "year,month,status",
        "measures": (
            "SUM(request_count) request_count, SUM(approved_count) approved_count, "
            "SUM(rejected_count) rejected_count, "
            "SUM(resolution_hours_sum)/NULLIF(SUM(resolution_hours_count),0) average_resolution_hours"
        ),
    },
    "equivalences": {
        "view": "mart.mv_cube_equivalences",
        "dimensions": {**COMMON_DIMENSIONS, "source_course": "source_course", "target_course": "target_course", "status": "status"},
        "default": "year,month,source_course,target_course,status",
        "measures": (
            "SUM(request_count) request_count, SUM(approved_count) approved_count, "
            "SUM(rejected_count) rejected_count, SUM(requested_credits) requested_credits, "
            "SUM(approved_credits) approved_credits"
        ),
    },
    "processing-times": {
        "view": "mart.mv_cube_processing",
        "dimensions": {**COMMON_DIMENSIONS, "reviewer_role": "reviewer_role", "decision": "decision"},
        "default": "year,month,reviewer_role,decision",
        "measures": (
            "SUM(review_count) review_count, "
            "SUM(response_hours_sum)/NULLIF(SUM(response_hours_count),0) average_response_hours"
        ),
    },
}


def lambda_handler(event, context):
    query = event.get("queryStringParameters") or {}
    cube_name = event.get("rawPath", "").rsplit("/", 1)[-1] or "requests"

    def prepare(_body, principal):
        return {"tenant_id": principal.tenant_id, "roles": set(principal.roles)}

    def execute(identity):
        cube = CUBES.get(cube_name)
        if not cube:
            raise ValueError("Unsupported analytics cube")
        allowed_dimensions = cube["dimensions"]
        dimensions = [item.strip() for item in query.get("dimensions", cube["default"]).split(",")]
        if not dimensions or any(item not in allowed_dimensions for item in dimensions):
            raise ValueError("Unsupported analytics dimension")
        columns = [allowed_dimensions[item] for item in dimensions]
        select_columns = ", ".join(columns)
        conditions = []
        parameters = []
        if "ADMINISTRATOR" not in identity["roles"]:
            conditions.append("tenant_id = :tenant")
            parameters.append({"name": "tenant", "value": identity["tenant_id"]})
        for name in allowed_dimensions:
            if name not in {"tenant", "year", "month"} and query.get(name):
                conditions.append(f"{allowed_dimensions[name]} = :{name}")
                parameters.append({"name": name, "value": query[name]})
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        sql = (
            f"SELECT {select_columns}, {cube['measures']} FROM {cube['view']} {where} AND grouping_id=0 " if where else
            f"SELECT {select_columns}, {cube['measures']} FROM {cube['view']} WHERE grouping_id=0 "
        ) + f"GROUP BY {select_columns} ORDER BY {select_columns} LIMIT 500"
        client = boto3.client("redshift-data")
        statement = client.execute_statement(
            WorkgroupName=os.environ["REDSHIFT_WORKGROUP"], Database=os.environ.get("REDSHIFT_DATABASE", "analytics"),
            Sql=sql, Parameters=parameters, ResultFormat="JSON",
        )
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            status = client.describe_statement(Id=statement["Id"])
            if status["Status"] == "FINISHED":
                result = client.get_statement_result(Id=statement["Id"])
                names = [column["name"] for column in result["ColumnMetadata"]]
                return [
                    {name: next(iter(value.values())) if value else None for name, value in zip(names, record)}
                    for record in result["Records"]
                ]
            if status["Status"] in {"FAILED", "ABORTED"}:
                raise RuntimeError(status.get("Error", "Analytics query failed"))
            time.sleep(0.2)
        raise RuntimeError("Analytics query timed out")

    return handler_for(execute, event, required_roles={"ANALYST", "ADMINISTRATOR"}, prepare_body=prepare)
