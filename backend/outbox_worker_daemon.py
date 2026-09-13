import time
import logging
import os
from datetime import datetime, timezone
import psycopg
import json

from app import config, v2, PROPERTIES
import chain_client
from blockchain.mst_indexer import MSTIndexer

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
log = logging.getLogger("outbox_worker")

def run_worker():
    if not config.DATABASE_URL:
        log.warning("DATABASE_URL is not set. Outbox worker requires PostgreSQL.")
        return

    if config.MST_RPC_URL and config.MST_WALLET_ADDRESS and (config.MST_PRIVATE_KEY or config.KMS_KEY_ID):
        try:
            chain_client._require_configured()
            log.info("MST Client configured for outbox worker.")
        except Exception as e:
            log.error(f"Live MST configuration error: {e}")
            return
    else:
        log.error("Live MST configuration missing. Production requires live MST.")
        return

    log.info("Starting durable outbox worker...")
    
    while True:
        try:
            process_outbox_item()
        except Exception as e:
            log.exception("Unexpected error in worker loop.")
        time.sleep(5)

def process_outbox_item():
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

    outbox_details = next((x for x in v2.list_outbox() if x["outbox_id"] == outbox_id), None)
    if not outbox_details:
        return

    tx_hash = outbox_details.get("tx_hash")
    
    try:
        prop = PROPERTIES.get(transfer["parcel_id"])
        if not prop or prop.get("frozen"):
            raise ValueError("Parcel unavailable or frozen")
            
        if not tx_hash:
            log.info(f"Submitting MST transaction for transfer {transfer_id}...")
            # For the demo, the backend initiates the transfer. 
            # In a real environment, the owner and buyer would have to approve.
            # To simulate completion without them for the hackathon outbox, 
            # we just call register_transfer which initiates it.
            
            # Here we can use the chain_client to initiate it. 
            entry = chain_client.register_transfer(
                transfer["parcel_id"], 
                prop["current_owner"], 
                transfer["buyer"], 
                transfer["document_hash"], 
                ai_verified=False
            )
            tx_hash = entry["tx_hash"]
            
            # Record tx_hash in database immediately (MST_SUBMITTED)
            v2.confirm_commit(transfer_id, tx_hash, "outbox-worker")
            log.info(f"MST transaction submitted: {tx_hash}")

        # Reconcile / wait for confirmation
        log.info(f"Waiting for confirmation of tx {tx_hash}...")
        w3, _, _ = chain_client._client()
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt.status != 1:
            raise RuntimeError(f"MST transaction {tx_hash} failed confirmation.")
            
        # Run indexer to ensure event is in postgres
        indexer = MSTIndexer(worker_id="outbox-indexer-sync")
        indexer.replay(from_block=receipt.blockNumber, to_block=receipt.blockNumber)
        
        # Verify that the event actually made it to blockchain_events
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
