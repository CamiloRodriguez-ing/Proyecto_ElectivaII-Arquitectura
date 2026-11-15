import os
import time
from pathlib import Path

import boto3


def _wait(client, statement_id: str) -> None:
    while True:
        state = client.describe_statement(Id=statement_id)
        if state["Status"] == "FINISHED":
            return
        if state["Status"] in {"FAILED", "ABORTED"}:
            raise RuntimeError(state.get("Error", "Warehouse statement failed"))
        time.sleep(1)


def lambda_handler(event, context):
    sql = (Path(__file__).resolve().parents[2] / "migrations" / "002_warehouse.sql").read_text(encoding="utf-8")
    client = boto3.client("redshift-data")
    response = client.batch_execute_statement(
        WorkgroupName=os.environ["REDSHIFT_WORKGROUP"], Database=os.environ.get("REDSHIFT_DATABASE", "analytics"),
        Sqls=[statement.strip() for statement in sql.split(";") if statement.strip()],
    )
    _wait(client, response["Id"])
    return {"migration": "002_warehouse.sql", "status": "applied"}

