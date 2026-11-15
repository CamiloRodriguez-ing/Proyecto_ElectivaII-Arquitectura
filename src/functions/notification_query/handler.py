from shared.adapters.http_api_v2 import handler_for
from shared.adapters.postgres_repository import list_notifications, mark_notification_read


def lambda_handler(event, context):
    path_parameters = event.get("pathParameters") or {}

    def prepare(_body, principal):
        return {"tenant_id": principal.tenant_id, "subject": principal.subject, "roles": set(principal.roles)}

    def execute(context_data):
        notification_id = path_parameters.get("notification_id")
        if notification_id:
            return mark_notification_read(notification_id=notification_id, **context_data)
        return list_notifications(**context_data)

    return handler_for(
        execute,
        event,
        required_roles={"STUDENT", "REVIEWER", "NOTIFICATION_SERVICE", "ADMINISTRATOR"},
        prepare_body=prepare,
    )
