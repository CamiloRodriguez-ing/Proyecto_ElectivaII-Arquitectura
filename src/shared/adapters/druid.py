import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from shared.domain.errors import DomainError


class DruidClient:
    """Small Druid SQL adapter shared by local Docker and AWS Lambda."""

    def __init__(self, endpoint: str | None = None, timeout: float | None = None) -> None:
        self.endpoint = endpoint or os.environ.get("DRUID_SQL_URL", "http://druid-router:8888/druid/v2/sql")
        self.timeout = timeout or float(os.environ.get("DRUID_QUERY_TIMEOUT_SECONDS", "15"))

    def execute(self, sql: str, parameters: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
        payload = json.dumps(
            {
                "query": sql,
                "parameters": parameters or [],
                "resultFormat": "object",
                "header": False,
                "context": {"sqlQueryId": "academic-analytics-api"},
            },
            separators=(",", ":"),
        ).encode("utf-8")
        request = Request(
            self.endpoint,
            data=payload,
            headers={"content-type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                result = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:500]
            raise DomainError("ANALYTICS_UNAVAILABLE", f"Druid rejected the analytical query: {detail}") from error
        except (URLError, TimeoutError, json.JSONDecodeError) as error:
            raise DomainError("ANALYTICS_UNAVAILABLE", "The analytical store is temporarily unavailable") from error
        if not isinstance(result, list):
            raise DomainError("ANALYTICS_UNAVAILABLE", "Druid returned an invalid analytical response")
        return result


def sql_parameter(value: str | int) -> dict[str, Any]:
    return {"type": "BIGINT" if isinstance(value, int) else "VARCHAR", "value": value}


def current_requests_cte(where: str = "") -> str:
    predicate = f" AND {where}" if where else ""
    return f"""
WITH current_requests AS (
  SELECT
    request_id,
    tenant_id,
    LATEST_BY(request_type, __time) AS request_type,
    LATEST_BY(COALESCE(new_status, status), __time) AS status,
    LATEST_BY(source_course, __time) AS source_course,
    LATEST_BY(target_course, __time) AS target_course,
    LATEST_BY(source_credits, __time) AS source_credits,
    LATEST_BY(target_credits, __time) AS target_credits,
    LATEST_BY(submitted_at, __time) AS submitted_at,
    MAX(CASE WHEN COALESCE(new_status, status) IN ('APPROVED','REJECTED')
             THEN TIMESTAMP_TO_MILLIS(__time) ELSE NULL END) AS resolved_at_ms,
    COUNT(DISTINCT CASE WHEN new_status = 'CHANGES_REQUESTED' THEN event_id ELSE NULL END)
      AS changes_requested_count
  FROM "academic_events"
  WHERE event_type IN ('request.submitted.v2','request.status_changed.v2'){predicate}
  GROUP BY request_id, tenant_id
)
""".strip()


def summary_for_tenant(tenant_id: str | None, client: DruidClient | None = None) -> dict[str, Any]:
    druid = client or DruidClient()
    where = "tenant_id = ?" if tenant_id else ""
    parameters = [sql_parameter(tenant_id)] if tenant_id else []
    cte = current_requests_cte(where)
    totals = druid.execute(
        f"""{cte}
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
  SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
  SUM(changes_requested_count) AS changes_requested,
  AVG(CASE WHEN resolved_at_ms IS NOT NULL
      THEN (resolved_at_ms - TIMESTAMP_TO_MILLIS(TIME_PARSE(submitted_at))) / 3600000.0
      ELSE NULL END) AS average_resolution_hours
FROM current_requests""",
        parameters,
    )
    by_status = druid.execute(
        f"{cte}\nSELECT status, COUNT(*) AS request_count FROM current_requests GROUP BY status ORDER BY status",
        parameters,
    )
    by_type = druid.execute(
        f"{cte}\nSELECT request_type, COUNT(*) AS request_count FROM current_requests "
        "GROUP BY request_type ORDER BY request_type",
        parameters,
    )
    row = totals[0] if totals else {}
    total = int(row.get("total") or 0)
    approved = int(row.get("approved") or 0)
    rejected = int(row.get("rejected") or 0)
    decisions = approved + rejected
    average = row.get("average_resolution_hours")
    return {
        "total": total,
        "by_type": {str(item["request_type"]): int(item["request_count"]) for item in by_type},
        "by_status": {str(item["status"]): int(item["request_count"]) for item in by_status},
        "approval_percentage": round(approved / decisions * 100, 2) if decisions else 0,
        "rejection_percentage": round(rejected / decisions * 100, 2) if decisions else 0,
        "average_resolution_hours": round(float(average), 2) if average is not None else None,
        "changes_requested": int(row.get("changes_requested") or 0),
    }


COMMON_DIMENSIONS = {
    "year": ("EXTRACT(YEAR FROM TIME_PARSE(submitted_at))", "year"),
    "month": ("EXTRACT(MONTH FROM TIME_PARSE(submitted_at))", "month"),
    "tenant": ("tenant_id", "tenant"),
}

CUBES: dict[str, dict[str, Any]] = {
    "requests": {
        "dimensions": {
            **COMMON_DIMENSIONS,
            "type": ("request_type", "type"),
            "status": ("status", "status"),
        },
        "default": ("year", "month", "status"),
        "source": "current_requests",
        "measures": """
COUNT(*) AS request_count,
SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_count,
SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count,
AVG(CASE WHEN resolved_at_ms IS NOT NULL
    THEN (resolved_at_ms - TIMESTAMP_TO_MILLIS(TIME_PARSE(submitted_at))) / 3600000.0
    ELSE NULL END) AS average_resolution_hours
""".strip(),
    },
    "equivalences": {
        "dimensions": {
            **COMMON_DIMENSIONS,
            "source_course": ("source_course", "source_course"),
            "target_course": ("target_course", "target_course"),
            "status": ("status", "status"),
        },
        "default": ("year", "month", "source_course", "target_course", "status"),
        "source": "current_requests",
        "base_condition": "request_type = 'CREDIT_TRANSFER'",
        "measures": """
COUNT(*) AS request_count,
SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_count,
SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count,
SUM(source_credits) AS requested_credits,
SUM(CASE WHEN status = 'APPROVED' THEN target_credits ELSE 0 END) AS approved_credits
""".strip(),
    },
    "processing-times": {
        "dimensions": {
            "year": ("EXTRACT(YEAR FROM __time)", "year"),
            "month": ("EXTRACT(MONTH FROM __time)", "month"),
            "tenant": ("tenant_id", "tenant"),
            "reviewer_role": ("reviewer_role", "reviewer_role"),
            "decision": ("decision", "decision"),
        },
        "default": ("year", "month", "reviewer_role", "decision"),
        "source": '"academic_events"',
        "base_condition": "event_type = 'request.status_changed.v2'",
        "measures": """
COUNT(DISTINCT event_id) AS review_count,
AVG((TIMESTAMP_TO_MILLIS(__time) - TIMESTAMP_TO_MILLIS(TIME_PARSE(submitted_at))) / 3600000.0)
    AS average_response_hours
""".strip(),
    },
}


def cube_rows(
    cube_name: str,
    *,
    dimensions: list[str] | None,
    filters: dict[str, str],
    tenant_id: str | None,
    client: DruidClient | None = None,
) -> list[dict[str, Any]]:
    """Execute one of the three documented cubes using allow-listed SQL fragments."""
    cube = CUBES.get(cube_name)
    if not cube:
        raise DomainError("VALIDATION_ERROR", "Unsupported analytics cube")

    selected = dimensions or list(cube["default"])
    allowed = cube["dimensions"]
    if not selected or len(selected) != len(set(selected)) or any(item not in allowed for item in selected):
        raise DomainError("VALIDATION_ERROR", "Unsupported analytics dimension")

    select_dimensions = [f'{allowed[item][0]} AS "{allowed[item][1]}"' for item in selected]
    group_dimensions = [allowed[item][0] for item in selected]
    conditions: list[str] = []
    parameters: list[dict[str, Any]] = []
    if cube.get("base_condition"):
        conditions.append(cube["base_condition"])
    if tenant_id:
        conditions.append("tenant_id = ?")
        parameters.append(sql_parameter(tenant_id))
    for name, value in filters.items():
        if name not in allowed or name == "tenant":
            raise DomainError("VALIDATION_ERROR", f"Unsupported analytics filter: {name}")
        expression = allowed[name][0]
        if name in {"year", "month"}:
            try:
                typed_value: str | int = int(value)
            except ValueError as error:
                raise DomainError("VALIDATION_ERROR", f"Filter {name} must be an integer") from error
        else:
            typed_value = value
        conditions.append(f"{expression} = ?")
        parameters.append(sql_parameter(typed_value))

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    cte = current_requests_cte() if cube["source"] == "current_requests" else ""
    query = f"""{cte}
SELECT {", ".join(select_dimensions)}, {cube["measures"]}
FROM {cube["source"]}
{where}
GROUP BY {", ".join(group_dimensions)}
ORDER BY {", ".join(group_dimensions)}
LIMIT 500""".strip()
    return (client or DruidClient()).execute(query, parameters)
