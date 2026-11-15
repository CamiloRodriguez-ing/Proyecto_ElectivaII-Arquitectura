from pathlib import Path

from shared.adapters.postgres_repository import connection


def lambda_handler(event, context):
    path = Path(__file__).resolve().parents[2] / "migrations" / "001_operational.sql"
    sql = path.read_text(encoding="utf-8")
    with connection() as conn:
        conn.execute(sql)
        conn.commit()
    return {"migration": "001_operational.sql", "status": "applied"}
