from typing import Any

from shared.adapters.demo_seed import seed_demo


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    return seed_demo()
