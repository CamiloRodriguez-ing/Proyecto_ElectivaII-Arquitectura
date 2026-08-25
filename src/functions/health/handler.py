from src.shared.adapters.http_api_v2 import response


def lambda_handler(event, context):
    request_id = event.get("headers", {}).get("x-request-id", "local")
    origin = event.get("headers", {}).get("origin", "")
    return response({"service": "academic-requests-api", "status": "ok", "version": "v1"}, request_id=request_id, origin=origin)
