import time
import logging
import os
import psycopg

from app import config
from blockchain.mst_client import MSTClient
from blockchain.mst_indexer import MSTIndexer

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
log = logging.getLogger("indexer_worker")

def run_worker():
    if not config.DATABASE_URL:
        log.warning("DATABASE_URL is not set. Indexer worker requires PostgreSQL.")
        return

    mst = None
    if config.MST_RPC_URL and config.MST_WALLET_ADDRESS and config.MST_PRIVATE_KEY:
        mst = MSTClient()
        log.info("MST Client configured for indexer worker.")
    else:
        log.error("Live MST configuration missing. Production requires live MST.")
        return

    log.info("Starting blockchain indexer worker...")
    indexer = MSTIndexer(client=mst, worker_id="mst-indexer-daemon")
    
    while True:
        try:
            log.info("Polling for new blocks...")
            count = indexer.replay()
            if count > 0:
                log.info(f"Indexed {count} new events.")
        except Exception as e:
            log.exception("Unexpected error in indexer loop.")
        time.sleep(10)

if __name__ == "__main__":
    run_worker()
