from collections import Counter
from typing import Any


def summarize_requests(requests: list[dict[str, Any]]) -> dict[str, Any]:
    if len(requests) > 100:
        raise ValueError("The request collection cannot contain more than 100 items")
    statuses = Counter(request.get("status") for request in requests)
    types = Counter(request.get("type") for request in requests)
    resolved = [request for request in requests if request.get("status") in {"APPROVED", "REJECTED"}]
    approved = statuses["APPROVED"]
    rejected = statuses["REJECTED"]
    decisions = approved + rejected
    return {"total": len(requests), "by_type": dict(types), "by_status": dict(statuses), "approval_percentage": round(approved / decisions * 100, 2) if decisions else 0, "rejection_percentage": round(rejected / decisions * 100, 2) if decisions else 0, "average_resolution_hours": None if not resolved else 0, "changes_requested": statuses["CHANGES_REQUESTED"]}
