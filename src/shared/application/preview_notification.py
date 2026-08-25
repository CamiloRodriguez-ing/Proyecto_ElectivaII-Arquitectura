from typing import Any


def preview_notification(payload: dict[str, Any]) -> dict[str, str]:
    event = payload.get("event", {})
    recipient = payload.get("recipient", {})
    status = event.get("data", {}).get("new_status", "UPDATED")
    return {"channel": "EMAIL", "recipient": recipient.get("email", ""), "subject": f"Academic request {status.lower()}", "body": f"Your academic request status changed to {status}.", "event_type": event.get("event_type", "request.status_changed.v1")}
