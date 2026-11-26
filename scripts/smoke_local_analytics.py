"""Exercise the custom browser login and all Druid-backed HTTP routes."""

import json
import os

import requests


def main() -> None:
    username = os.environ["SMOKE_USERNAME"]
    password = os.environ["SMOKE_PASSWORD"]
    api_url = os.environ.get("API_URL", "http://localhost:4200/v1").rstrip("/")
    session = requests.Session()

    login = session.post(
        f"{api_url}/auth/login",
        json={"username": username, "password": password},
        timeout=10,
    )
    login.raise_for_status()
    identity = login.json()["data"]["user"]

    calls = {
        "summary": ("analytics/summary", None),
        "requests": ("analytics/cube/requests", {"dimensions": "year,month,status"}),
        "equivalences": (
            "analytics/cube/equivalences",
            {"dimensions": "source_course,target_course,status"},
        ),
        "processing": (
            "analytics/cube/processing-times",
            {"dimensions": "year,month,reviewer_role,decision"},
        ),
    }
    evidence: dict[str, object] = {
        "login": {
            "status": login.status_code,
            "username": identity["username"],
            "roles": identity["roles"],
        }
    }
    for name, (path, params) in calls.items():
        response = session.get(f"{api_url}/{path}", params=params, timeout=30)
        response.raise_for_status()
        data = response.json()["data"]
        evidence[name] = {
            "status": response.status_code,
            "rows": len(data) if isinstance(data, list) else int(data["total"]),
        }
    print(json.dumps(evidence, indent=2))


if __name__ == "__main__":
    main()
