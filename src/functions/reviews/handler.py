from src.shared.adapters.http_api_v2 import handler_for
from src.shared.application.evaluate_request import evaluate_request


def lambda_handler(event, context):
    return handler_for(evaluate_request, event)
