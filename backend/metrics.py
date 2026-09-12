"""Prometheus exposition for operational, outbox, and blockchain metrics."""

import logging
import os

log = logging.getLogger(__name__)


def _query(database_url):
    values = {
        "land_registry_transfers_total": 0,
        "land_registry_approvals_total": 0,
        "land_registry_successions_total": 0,
        "land_registry_recoveries_total": 0,
        "land_registry_outbox_backlog": 0,
        "land_registry_failed_blockchain_transactions": 0,
        "land_registry_integrity_failures_total": 0,
        "land_registry_notification_failures_total": 0,
        "land_registry_indexer_lag_blocks": 0,
        "land_registry_blockchain_confirmation_latency_seconds": 0,
    }
    if not database_url:
        return values
    try:
        import psycopg
        with psycopg.connect(database_url, connect_timeout=3) as connection:
            with connection.cursor() as cursor:
                queries = {
                    "land_registry_transfers_total": "SELECT count(*) FROM transfers",
                    "land_registry_approvals_total": "SELECT count(*) FROM transfer_approvals",
                    "land_registry_successions_total": "SELECT count(*) FROM succession_cases",
                    "land_registry_recoveries_total": "SELECT count(*) FROM credential_recovery_cases",
                    "land_registry_outbox_backlog": "SELECT count(*) FROM blockchain_outbox WHERE status NOT IN ('CONFIRMED','FAILED')",
                    "land_registry_failed_blockchain_transactions": "SELECT count(*) FROM blockchain_outbox WHERE status='FAILED'",
                    "land_registry_integrity_failures_total": "SELECT count(*) FROM audit_events WHERE action='TITLE_INTEGRITY_FAILURE' OR result='FAILURE'",
                    "land_registry_notification_failures_total": "SELECT count(*) FROM audit_events WHERE action='NOTIFICATION_FAILED'",
                }
                for metric, query in queries.items():
                    cursor.execute(query)
                    values[metric] = cursor.fetchone()[0] or 0
                cursor.execute("SELECT greatest(0, (SELECT coalesce(max(block_number),0) FROM blockchain_events) - (SELECT coalesce(max(last_block),0) FROM mst_indexer_checkpoints))")
                values["land_registry_indexer_lag_blocks"] = cursor.fetchone()[0] or 0
                cursor.execute("SELECT coalesce(avg(extract(epoch from (confirmed_at-submitted_at))),0) FROM blockchain_outbox WHERE confirmed_at IS NOT NULL AND submitted_at IS NOT NULL")
                values["land_registry_blockchain_confirmation_latency_seconds"] = float(cursor.fetchone()[0] or 0)
    except Exception:
        log.exception("metrics database collection failed")
    return values


def render(database_url=None):
    values = _query(database_url or os.environ.get("DATABASE_URL"))
    lines = ["# HELP land_registry_info Land Registry runtime information", "# TYPE land_registry_info gauge", 'land_registry_info{service="land-registry"} 1']
    for name, value in values.items():
        lines.extend([f"# TYPE {name} gauge", f"{name} {value}"])
    return "\n".join(lines) + "\n"