import time
import logging
import os
from datetime import datetime, timezone
import psycopg
import json

from app import config, v2, PROPERTIES
from blockchain.mst_client import MSTClient
from blockchain.mst_indexer import MSTIndexer

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
log = logging.getLogger("outbox_worker")

def run_worker():
    if not config.DATABASE_URL:
        log.warning("DATABASE_URL is not set. Outbox worker requires PostgreSQL.")
        return

    mst = None
    if config.MST_RPC_URL and config.MST_WALLET_ADDRESS and config.MST_PRIVATE_KEY:
        mst = MSTClient()
        log.info("MST Client configured for outbox worker.")
    else:
        log.error("Live MST configuration missing. Production requires live MST.")
        return

    log.info("Starting durable outbox worker...")
    
    # We will poll for outbox items that are SUBMITTED or MST_FAILED (for retry)
    # Actually, next_outbox_item claims SUBMITTED or stalled PROCESSING.
    # We need to make sure we also pick up MST_PENDING_CONFIRMATION if stalled?
    
    while True:
        try:
            process_outbox_item(mst)
        except Exception as e:
            log.exception("Unexpected error in worker loop.")
        time.sleep(5)

def process_outbox_item(mst):
    # Claim the next available item. It claims SUBMITTED or stalled PROCESSING.
    item = v2.next_outbox_item(status="SUBMITTED", worker_id="outbox-worker")
    if not item:
        return

    outbox_id = item["outbox_id"]
    transfer_id = item["transfer_id"]
    
    log.info(f"Processing outbox item {outbox_id} for transfer {transfer_id}")
    
    transfer = v2.get_transfer(transfer_id)
    if not transfer:
        log.error(f"Transfer {transfer_id} not found.")
        return

    # Check if this item already has a tx_hash (i.e. crash after submission)
    # We need to look up the tx_hash from the outbox item in the DB.
    # v2.list_outbox() can give us the details.
    outbox_details = next((x for x in v2.list_outbox() if x["outbox_id"] == outbox_id), None)
    if not outbox_details:
        return

    tx_hash = outbox_details.get("tx_hash")
    
    try:
        if not tx_hash:
            # We need to submit to MST
            prop = PROPERTIES.get(transfer["parcel_id"])
            if not prop or prop.get("frozen"):
                raise ValueError("Parcel unavailable or frozen")
            
            payload = {
                "event_type": "OWNERSHIP_TRANSFERRED",
                "transfer_id": transfer["transfer_id"],
                "parcel_id": transfer["parcel_id"],
                "previous_owner": prop["current_owner"],
                "new_owner": transfer["buyer"],
                "ownership_shares": [{"share_bps": 10000}],
                "registrar_id": (transfer.get("registrar_approval") or {}).get("actor", "outbox-worker"),
                "approval_hash": transfer["assessment_hash"],
                "document_hashes": [transfer["document_hash"]],
            }
            log.info(f"Submitting MST transaction for transfer {transfer_id}...")
            submitted = mst.submit_event(payload)
            tx_hash = submitted["tx_hash"]
            
            # Record tx_hash in database immediately (MST_SUBMITTED)
            v2.confirm_commit(transfer_id, tx_hash, "outbox-worker")
            log.info(f"MST transaction submitted: {tx_hash}")

        # Reconcile / wait for confirmation
        log.info(f"Waiting for confirmation of tx {tx_hash}...")
        confirmation = mst.verify_confirmation(tx_hash, confirmations=1)
        
        if not confirmation["confirmed"]:
            raise RuntimeError(f"MST transaction {tx_hash} failed confirmation.")
            
        # Instead of just completing, run indexer to ensure event is in postgres
        indexer = MSTIndexer(client=mst, worker_id="outbox-indexer-sync")
        indexer.replay(from_block=confirmation["block_number"], to_block=confirmation["block_number"])
        
        # Now verify that the event actually made it to blockchain_events
        with psycopg.connect(config.DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT event_id FROM blockchain_events WHERE tx_hash=%s", (tx_hash,))
                if not cur.fetchone():
                    raise RuntimeError("Event not found in blockchain_events despite confirmation.")
                    
        # Finalize the transfer
        completed = v2.confirm_finality(transfer_id, "outbox-worker")
        log.info(f"Transfer {transfer_id} finalized successfully.")
        
    except Exception as exc:
        log.exception(f"Outbox processing failed for transfer {transfer_id}")
        v2.fail_transfer(transfer_id, exc)

if __name__ == "__main__":
    run_worker()
