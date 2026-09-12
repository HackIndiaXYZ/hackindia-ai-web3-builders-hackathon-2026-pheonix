"""Operational health snapshot for MST, the outbox, and the indexer."""

import logging
import os
from datetime import datetime, timezone

log = logging.getLogger(__name__)


class BlockchainHealthService:
    def __init__(self, database_url=None, mst_client=None):
        self.database_url = database_url or os.environ.get("DATABASE_URL")
        self.mst_client = mst_client

    def _database_snapshot(self):
        if not self.database_url:
            return {"configured": False, "ok": True, "mode": "memory"}
        try:
            import psycopg
            with psycopg.connect(self.database_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT count(*) FROM blockchain_outbox WHERE status IN ('PENDING','SUBMITTED','MST_SUBMITTED','MST_PENDING_CONFIRMATION')")
                    pending = cur.fetchone()[0]
                    cur.execute("SELECT count(*) FROM blockchain_outbox WHERE status IN ('FAILED','MST_FAILED')")
                    failed = cur.fetchone()[0]
                    cur.execute("SELECT avg(EXTRACT(EPOCH FROM (confirmed_at - submitted_at))) FROM blockchain_outbox WHERE submitted_at IS NOT NULL AND confirmed_at IS NOT NULL")
                    latency = cur.fetchone()[0]
                    cur.execute("SELECT checkpoint_name, last_block, updated_at FROM mst_indexer_checkpoints ORDER BY updated_at DESC")
                    checkpoints = [{"name": row[0], "last_block": row[1], "updated_at": row[2].isoformat() if row[2] else None} for row in cur.fetchall()]
            return {"configured": True, "ok": True, "pending_transactions": pending, "failed_submissions": failed, "confirmation_latency_seconds": float(latency) if latency is not None else None, "replay": checkpoints}
        except Exception as exc:
            log.exception("blockchain health database snapshot failed")
            return {"configured": True, "ok": False, "error": exc.__class__.__name__}

    def snapshot(self):
        started = datetime.now(timezone.utc)
        mst = {"configured": bool(self.mst_client), "ok": False}
        if self.mst_client:
            try:
                mst["latest_block"] = self.mst_client.connect()
                mst["chain_id"] = self.mst_client.chain_id
                mst["ok"] = True
            except Exception as exc:
                log.exception("MST health check failed")
                mst["error"] = exc.__class__.__name__
        database = self._database_snapshot()
        snapshot = {"status": "ok" if mst["ok"] and database["ok"] else "degraded", "mst": mst, "database": database, "checked_at": started.isoformat()}
        log.info("blockchain health snapshot complete", extra={"mst_ok": mst["ok"], "database_ok": database["ok"]})
        return snapshot