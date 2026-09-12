"""Replayable MST-to-PostgreSQL event indexer."""

import json
import logging
import os

from .mst_client import MSTClient

log = logging.getLogger(__name__)


class MSTIndexer:
    def __init__(self, database_url=None, client=None, worker_id="mst-indexer"):
        self.database_url = database_url or os.environ.get("DATABASE_URL")
        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required for MST indexing")
        self.client = client or MSTClient()
        self.worker_id = worker_id

    def _connect(self):
        try:
            import psycopg
        except ImportError as exc:
            raise RuntimeError("Install psycopg[binary] to enable MST indexing") from exc
        return psycopg.connect(self.database_url)

    def replay(self, from_block=None, to_block="latest"):
        """Index all title records from a checkpoint, or an explicit block range."""
        log.info("MST indexer replay started", extra={"worker_id": self.worker_id, "from_block": from_block, "to_block": to_block})
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT last_block FROM mst_indexer_checkpoints "
                    "WHERE checkpoint_name=%s FOR UPDATE",
                    (self.worker_id,),
                )
                checkpoint = cur.fetchone()
                start = from_block if from_block is not None else ((checkpoint[0] + 1) if checkpoint else 0)
                events = self.client.get_events(from_block=start, to_block=to_block)
                highest = start - 1
                for event in events:
                    highest = max(highest, int(event["block_number"]))
                    cur.execute(
                        """
                        INSERT INTO blockchain_events
                            (event_id, tx_hash, block_number, event_name, parcel_id,
                             transfer_id, event_timestamp, raw_event)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
                        ON CONFLICT(event_id) DO NOTHING
                        """,
                        (
                            f"{event['tx_hash']}:{event.get('event_type')}",
                            event["tx_hash"],
                            event["block_number"],
                            event["event_type"],
                            event.get("parcel_id"),
                            event.get("transfer_id"),
                            event.get("transfer_timestamp"),
                            json.dumps(event, sort_keys=True),
                        ),
                    )
                cur.execute(
                    """
                    INSERT INTO mst_indexer_checkpoints(checkpoint_name,last_block)
                    VALUES (%s,%s)
                    ON CONFLICT(checkpoint_name) DO UPDATE SET last_block=EXCLUDED.last_block,
                                                               updated_at=now()
                    """,
                    (self.worker_id, max(highest, start - 1)),
                )
            conn.commit()
        log.info("MST indexer replay completed", extra={"worker_id": self.worker_id, "event_count": len(events), "last_block": max(highest, start - 1)})
        return len(events)