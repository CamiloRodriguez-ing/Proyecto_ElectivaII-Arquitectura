from src.shared.adapters.http_api_v2 import handler_for
from src.shared.application.preview_notification import preview_notification


def lambda_handler(event, context):
    return handler_for(preview_notification, event)
