"""Create isolated Keycloak and Druid databases before their EC2 hosts start."""

import json
import os

import boto3
import psycopg
from psycopg import sql


def _secret(secret_arn: str) -> dict[str, str]:
    value = boto3.client("secretsmanager").get_secret_value(SecretId=secret_arn)["SecretString"]
    return json.loads(value)


def lambda_handler(event, context):
    master = _secret(os.environ["DATABASE_SECRET_ARN"])
    services = {
        "keycloak": _secret(os.environ["KEYCLOAK_DATABASE_SECRET_ARN"]),
        "druid": _secret(os.environ["DRUID_DATABASE_SECRET_ARN"]),
    }
    connection = psycopg.connect(
        host=os.environ["PLATFORM_DATABASE_HOST"],
        port=5432,
        dbname="postgres",
        user=master["username"],
        password=master["password"],
        sslmode="require",
        autocommit=True,
    )
    try:
        for database_name, credentials in services.items():
            role_exists = connection.execute(
                "SELECT 1 FROM pg_roles WHERE rolname=%s", (credentials["username"],)
            ).fetchone()
            if not role_exists:
                connection.execute(
                    sql.SQL("CREATE ROLE {} LOGIN PASSWORD %s").format(
                        sql.Identifier(credentials["username"])
                    ),
                    (credentials["password"],),
                )
            database_exists = connection.execute(
                "SELECT 1 FROM pg_database WHERE datname=%s", (database_name,)
            ).fetchone()
            if not database_exists:
                connection.execute(
                    sql.SQL("CREATE DATABASE {} OWNER {}").format(
                        sql.Identifier(database_name), sql.Identifier(credentials["username"])
                    )
                )
    finally:
        connection.close()
    return {"databases": sorted(services), "status": "ready"}
