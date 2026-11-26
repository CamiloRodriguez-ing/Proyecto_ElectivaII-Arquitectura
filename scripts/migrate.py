"""Apply ordered SQL migrations to the operational PostgreSQL database."""

import os
from pathlib import Path

import psycopg


def main() -> None:
    dsn = os.environ["DATABASE_URL"]
    migration_dir = Path(__file__).resolve().parents[1] / "db" / "migrations"
    files = sorted(migration_dir.glob("*.sql"))
    with psycopg.connect(dsn, autocommit=True) as connection:
        connection.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations "
            "(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
        )
        applied = {row[0] for row in connection.execute("SELECT version FROM schema_migrations")}
        for path in files:
            if path.name in applied:
                continue
            with connection.transaction():
                connection.execute(path.read_text(encoding="utf-8"))
                connection.execute("INSERT INTO schema_migrations(version) VALUES (%s)", (path.name,))
            print(f"Applied {path.name}")


if __name__ == "__main__":
    main()
