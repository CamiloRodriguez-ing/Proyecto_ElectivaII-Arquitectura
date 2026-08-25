from src.shared.adapters.http_api_v2 import handler_for
from src.shared.application.summarize_requests import summarize_requests


def lambda_handler(event, context):
    return handler_for(lambda body: summarize_requests(body.get("requests", [])), event)
