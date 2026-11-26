"""Create the deterministic OLAP demo dataset through the transactional outbox."""

import json

from shared.adapters.demo_seed import seed_demo

if __name__ == "__main__":
    print(json.dumps(seed_demo()))
