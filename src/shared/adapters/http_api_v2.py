import json
import os
from datetime import datetime, timezone
from typing import Any, Callable
from uuid import uuid4

from shared.domain.errors import DomainError
from shared.adapters.kafka_events import KafkaPublishError
from shared.security.keycloak import AuthenticationError, AuthorizationError, Principal, require_any_role


def response(data: Any, status_code: int = 200, request_id: str = "", origin: str = "http://localhost:5173") -> dict[str, Any]:
    allowed_origin = _allowed_origin(origin)
    return {"statusCode": status_code, "headers": {"content-type": "application/json", "access-control-allow-origin": allowed_origin}, "body": json.dumps({"data": data, "meta": {"request_id": request_id, "api_version": "v1", "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}})}


def handler_for(
    use_case: Callable[[dict[str, Any]], Any],
    event: dict[str, Any],
    success_status: int = 200,
    required_roles: set[str] | None = None,
    prepare_body: Callable[[dict[str, Any], Principal], dict[str, Any]] | None = None,
    after_success: Callable[[dict[str, Any], dict[str, Any], Principal, str], None] | None = None,
) -> dict[str, Any]:
    headers = {key.lower(): value for key, value in event.get("headers", {}).items()}
    request_id = headers.get("x-request-id", str(uuid4()))
    origin = headers.get("origin", "")
    try:
        principal = require_any_role(event, required_roles) if required_roles else None
        body = json.loads(event.get("body") or "{}")
        if prepare_body and principal:
            body = prepare_body(body, principal)
        result = use_case(body)
        if after_success and principal:
            after_success(body, result, principal, request_id)
        return response(result, success_status, request_id, origin)
    except AuthenticationError as error:
        return error_response(DomainError("UNAUTHENTICATED", str(error)), 401, request_id, origin)
    except AuthorizationError as error:
        return error_response(DomainError("FORBIDDEN", str(error)), 403, request_id, origin)
    except json.JSONDecodeError:
        error = DomainError("INVALID_JSON", "The request body must be valid JSON")
        return error_response(error, 400, request_id, origin)
    except DomainError as error:
        status = 409 if error.code == "STATE_TRANSITION_NOT_ALLOWED" else 422
        return error_response(error, status, request_id, origin)
    except ValueError as error:
        return error_response(DomainError("VALIDATION_ERROR", str(error)), 422, request_id, origin)
    except KafkaPublishError:
        return error_response(
            DomainError("EVENT_PUBLISH_UNAVAILABLE", "The operation could not publish its event; retry later"),
            503,
            request_id,
            origin,
        )


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
