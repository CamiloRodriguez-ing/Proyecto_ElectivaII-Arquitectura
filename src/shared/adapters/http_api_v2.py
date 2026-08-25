import json
import os
from datetime import datetime, timezone
from typing import Any, Callable
from uuid import uuid4

from src.shared.domain.errors import DomainError


def response(data: Any, status_code: int = 200, request_id: str = "", origin: str = "http://localhost:5173") -> dict[str, Any]:
    allowed_origin = _allowed_origin(origin)
    return {"statusCode": status_code, "headers": {"content-type": "application/json", "access-control-allow-origin": allowed_origin}, "body": json.dumps({"data": data, "meta": {"request_id": request_id, "api_version": "v1", "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}})}


def handler_for(use_case: Callable[[dict[str, Any]], Any], event: dict[str, Any], success_status: int = 200) -> dict[str, Any]:
    request_id = event.get("headers", {}).get("x-request-id", str(uuid4()))
    try:
        body = json.loads(event.get("body") or "{}")
        return response(use_case(body), success_status, request_id, event.get("headers", {}).get("origin", ""))
    except json.JSONDecodeError:
        error = DomainError("INVALID_JSON", "The request body must be valid JSON")
        return error_response(error, 400, request_id, event.get("headers", {}).get("origin", ""))
    except DomainError as error:
        status = 409 if error.code == "STATE_TRANSITION_NOT_ALLOWED" else 422
        return error_response(error, status, request_id, event.get("headers", {}).get("origin", ""))
    except ValueError as error:
        return error_response(DomainError("VALIDATION_ERROR", str(error)), 422, request_id, event.get("headers", {}).get("origin", ""))


def error_response(error: DomainError, status_code: int, request_id: str, origin: str = "") -> dict[str, Any]:
    allowed_origin = _allowed_origin(origin)
    return {"statusCode": status_code, "headers": {"content-type": "application/json", "access-control-allow-origin": allowed_origin}, "body": json.dumps({"error": {"code": error.code, "message": error.message, "details": error.details}, "meta": {"request_id": request_id, "api_version": "v1"}})}


def _allowed_origin(origin: str) -> str:
    configured_origin = os.environ.get("FRONTEND_ORIGIN", "")
    if configured_origin == "*":
        return "*"
    if origin and origin == configured_origin:
        return origin
    return origin if origin in {"http://localhost:5173", "http://127.0.0.1:5173"} else "http://localhost:5173"
