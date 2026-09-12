"""Controlled migration runner for Supabase/PostgreSQL.

Applies every `migrations/NNN_*.sql` file in filename order, exactly once,
recording what ran in `schema_migrations`. Each migration gets its own
transaction so a failure half way through a sequence leaves the earlier ones
applied rather than silently rolling them back.

Usage:  DATABASE_URL=postgresql://... python migrate.py
"""

import sys
from pathlib import Path

import config

MIGRATIONS_DIR = Path(__file__).with_name("migrations")

_TRACKING_TABLE = """
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
)
"""


def _connect(database_url=None):
    try:
        import psycopg
    except ImportError as exc:  # pragma: no cover - environment issue
        raise RuntimeError("Install psycopg[binary] to run migrations") from exc
    database_url = database_url or config.DATABASE_URL
    if not database_url:
        raise RuntimeError("DATABASE_URL is required to run migrations")
    return psycopg.connect(database_url)


def discover():
    """Migration files in filename order. The NNN_ prefix defines the order."""
    return sorted(MIGRATIONS_DIR.glob("*.sql"), key=lambda p: p.name)


def applied_versions(conn):
    with conn.cursor() as cur:
        cur.execute(_TRACKING_TABLE)
        conn.commit()
        cur.execute("SELECT version FROM schema_migrations")
        return {row[0] for row in cur.fetchall()}


def run(database_url=None):
    migrations = discover()
    if not migrations:
        print(f"No migrations found in {MIGRATIONS_DIR}")
        return 0

    with _connect(database_url) as conn:
        done = applied_versions(conn)
        pending = [p for p in migrations if p.name not in done]

        if not pending:
            print(f"Database is up to date ({len(done)} migration(s) applied).")
            return 0

        for path in pending:
            sql = path.read_text(encoding="utf-8")
            # One transaction per migration: an earlier success is not undone
            # by a later failure, so a re-run picks up exactly where it stopped.
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.execute(sql)
                    cur.execute(
                        "INSERT INTO schema_migrations(version) VALUES (%s)",
                        (path.name,),
                    )
            print(f"applied {path.name}")

    print(f"Applied {len(pending)} migration(s).")
    return 0


if __name__ == "__main__":
    sys.exit(run())
