"""Continuously drain the transactional outbox in the local Docker stack."""

import time

from functions.outbox_publisher.handler import lambda_handler

if __name__ == "__main__":
    while True:
        result = lambda_handler({}, None)
        time.sleep(0.25 if result.get("published") else 1.0)
