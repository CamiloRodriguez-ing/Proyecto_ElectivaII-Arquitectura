"""Small HTTP adapter that runs the Lambda handlers unchanged in Docker."""

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from importlib import import_module
from typing import Any
from urllib.parse import urlsplit
from uuid import uuid4

from functions.keycloak_authorizer.handler import lambda_handler as authorize


ROUTES = {
    ("GET", "/v1/health"): ("GET /v1/health", "functions.health.handler"),
    ("POST", "/v1/requests/validate"): (
        "POST /v1/requests/validate",
        "functions.validate_request.handler",
    ),
    ("POST", "/v1/requests/prepare"): (
        "POST /v1/requests/prepare",
        "functions.prepare_request.handler",
    ),
    ("POST", "/v1/reviews/evaluate"): (
        "POST /v1/reviews/evaluate",
        "functions.evaluate_review.handler",
    ),
    ("POST", "/v1/notifications/preview"): (
        "POST /v1/notifications/preview",
        "functions.preview_notification.handler",
    ),
    ("POST", "/v1/analytics/summary"): (
        "POST /v1/analytics/summary",
        "functions.analytics_summary.handler",
    ),
}


class ApiHandler(BaseHTTPRequestHandler):
    server_version = "AcademicRequestsLocal/1.0"

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors_headers()
        self.send_header("content-length", "0")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        self._dispatch()

    def do_POST(self) -> None:  # noqa: N802
        self._dispatch()

    def _dispatch(self) -> None:
        path = urlsplit(self.path).path.rstrip("/") or "/"
        route = ROUTES.get((self.command, path))
        if route is None:
            self._json_response(404, {"error": {"code": "NOT_FOUND", "message": "Route not found"}})
            return

        route_key, module_name = route
        headers = {key.lower(): value for key, value in self.headers.items()}
        length = int(headers.get("content-length", "0"))
        body = self.rfile.read(length).decode("utf-8") if length else ""
        event: dict[str, Any] = {
            "version": "2.0",
            "routeKey": route_key,
            "rawPath": path,
            "headers": headers,
            "body": body,
            "requestContext": {
                "http": {"method": self.command, "path": path},
                "requestId": headers.get("x-request-id", str(uuid4())),
            },
        }

        if route_key != "GET /v1/health":
            if not headers.get("authorization"):
                self._json_response(
                    401,
                    {"error": {"code": "UNAUTHENTICATED", "message": "A bearer access token is required"}},
                )
                return
            authorization = authorize(event, None)
            if not authorization.get("isAuthorized"):
                self._json_response(
                    403,
                    {"error": {"code": "FORBIDDEN", "message": "The token or role is not allowed"}},
                )
                return
            event["requestContext"]["authorizer"] = {"lambda": authorization.get("context", {})}

        handler = import_module(module_name).lambda_handler
        result = handler(event, None)
        response_headers = result.get("headers", {})
        response_body = result.get("body", "")
        encoded = response_body.encode("utf-8")
        self.send_response(int(result.get("statusCode", 200)))
        for key, value in response_headers.items():
            self.send_header(key, value)
        self.send_header("content-length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _json_response(self, status: int, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self._cors_headers()
        self.send_header("content-length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _cors_headers(self) -> None:
        origin = self.headers.get("origin", "")
        configured = os.environ.get("FRONTEND_ORIGIN", "http://localhost:4200")
        allowed = "*" if configured == "*" else configured
        if configured != "*" and origin == configured:
            allowed = origin
        self.send_header("access-control-allow-origin", allowed)
        self.send_header("access-control-allow-methods", "GET,POST,OPTIONS")
        self.send_header("access-control-allow-headers", "Content-Type,X-Request-Id,Authorization")

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"{self.address_string()} - {fmt % args}", flush=True)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    print(f"Local API listening on 0.0.0.0:{port}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), ApiHandler).serve_forever()
