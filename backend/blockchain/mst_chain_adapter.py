"""MST implementation of the public chain interface used by ``app.py``.

The application originally selected a legacy Polygon-contract client whenever
``CHAIN_MODE=live``.  The deployed configuration now uses MST Testnet, whose
hash-only transaction ledger is accessed through :class:`MSTClient`.  This
adapter preserves the small ``mock_chain`` interface so read and commit routes
can use the real MST network without knowing its transport details.
"""

from datetime import datetime, timezone

import config
from blockchain.mst_client import MSTClient


_client = None


def _mst():
    global _client
    if _client is None:
        _client = MSTClient()
        _client.connect()
    return _client


def _timestamp(value=None):
    return value or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _entry(event):
    event_type = event.get("event_type")
    return {
        "event_type": {
            "PARCEL_CREATED": "PARCEL_REGISTERED",
            "OWNERSHIP_TRANSFERRED": "TRANSFER",
            "OWNERSHIP_SPLIT": "TRANSFER",
            "OWNERSHIP_MERGED": "TRANSFER",
        }.get(event_type, event_type),
        "ulpin": event.get("parcel_id"),
        # The MST ledger intentionally contains identity hashes, not names.
        "from": event.get("previous_owner_hash"),
        "to": event.get("new_owner_hash"),
        "doc_hash": (event.get("document_hashes") or [None])[0],
        "tx_hash": event.get("tx_hash"),
        "block_number": event.get("block_number"),
        "timestamp": event.get("transfer_timestamp"),
        "record_hash": event.get("record_hash"),
    }


def register_parcel(ulpin, owner):
    submitted = _mst().submit_event({
        "event_type": "PARCEL_CREATED",
        "parcel_id": ulpin,
        "new_owner": owner,
        "registrar_id": "registrar",
    })
    return {
        "event_type": "PARCEL_REGISTERED", "ulpin": ulpin,
        "from": None, "to": owner, "doc_hash": None,
        "tx_hash": submitted["tx_hash"], "timestamp": _timestamp(),
        "record_hash": submitted["record"]["record_hash"],
    }


def register_transfer(ulpin, from_owner, to_owner, doc_hash, ai_verified=True):
    submitted = _mst().submit_event({
        "event_type": "OWNERSHIP_TRANSFERRED",
        "parcel_id": ulpin,
        "previous_owner": from_owner,
        "new_owner": to_owner,
        "document_hashes": [doc_hash],
        "approval_hash": "ai-verified" if ai_verified else "registrar-override",
        "registrar_id": "registrar",
    })
    return {
        "event_type": "TRANSFER", "ulpin": ulpin,
        "from": from_owner, "to": to_owner, "doc_hash": doc_hash,
        "ai_verified": bool(ai_verified), "tx_hash": submitted["tx_hash"],
        "timestamp": _timestamp(), "record_hash": submitted["record"]["record_hash"],
    }


def get_history(ulpin):
    """Read the durable MST index rather than replaying the whole chain.

    MST records are embedded in ordinary transactions and cannot be filtered
    with an RPC log topic. Scanning from genesis for each browser request is
    prohibitively slow, so the indexer is the authoritative read projection.
    """
    return _indexed_events("WHERE parcel_id=%s", (ulpin,))


def get_all_activity():
    return _indexed_events()


def _indexed_events(where="", params=()):
    if not config.DATABASE_URL:
        # Live mode requires PostgreSQL at startup; retain an empty, safe
        # response for isolated adapter tests rather than replaying genesis.
        return []
    try:
        import psycopg
        with psycopg.connect(config.DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT raw_event FROM blockchain_events " + where +
                    " ORDER BY block_number DESC, tx_hash DESC",
                    params,
                )
                return [_entry(row[0]) for row in cur.fetchall()]
    except Exception:
        # A blockchain history page must not generate an unbounded RPC scan if
        # the projection is temporarily unavailable. The API remains usable;
        # monitoring surfaces indexer health separately.
        return []


def certificate_count():
    # MST title records do not mint ERC-721 certificates.
    return 0


def mint_certificate(ulpin, owner):
    raise RuntimeError("MST Testnet uses immutable title records and does not support certificate minting")
