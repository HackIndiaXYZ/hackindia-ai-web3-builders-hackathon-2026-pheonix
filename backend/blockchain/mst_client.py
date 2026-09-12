"""MST Testnet adapter for hash-only immutable title records.

The MST Python SDK exposes provider and signer primitives, but no title-ledger
contract API. Each record is encoded as canonical JSON in a zero-value
transaction sent from the registrar wallet to itself. The payload contains
hashes only; PostgreSQL remains the operational source of ownership data.
"""

import hashlib
import json
import logging
import os
from datetime import datetime, timezone

log = logging.getLogger(__name__)


EVENT_TYPES = {
    "PARCEL_CREATED", "OWNERSHIP_TRANSFERRED", "OWNERSHIP_SPLIT",
    "OWNERSHIP_MERGED", "PARCEL_FROZEN", "PARCEL_UNFROZEN",
    "SUCCESSION_VERIFIED", "CREDENTIAL_RECOVERED",
}


def _hash(value):
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()


def _owner_hash(value):
    return _hash(str(value).strip().lower())


def _canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def _tx_hash(value):
    text = value.hex() if hasattr(value, "hex") else str(value)
    return text if text.startswith("0x") else "0x" + text


class MSTClient:
    def __init__(self, rpc_url=None, chain_id=None, wallet_address=None, private_key=None):
        self.rpc_url = rpc_url or os.environ.get("MST_RPC_URL")
        self.chain_id = int(chain_id or os.environ.get("MST_CHAIN_ID", "91562037"))
        self.wallet_address = wallet_address or os.environ.get("MST_WALLET_ADDRESS")
        self.private_key = private_key or os.environ.get("MST_PRIVATE_KEY")
        missing = [name for name, value in (
            ("MST_RPC_URL", self.rpc_url),
            ("MST_WALLET_ADDRESS", self.wallet_address),
            ("MST_PRIVATE_KEY", self.private_key),
        ) if not value]
        if missing:
            raise RuntimeError(f"MST client is missing required configuration: {', '.join(missing)}")
        try:
            from mst_blockchain_sdk.core.client import Client
            from web3 import Web3
            from web3.middleware import ExtraDataToPOAMiddleware
        except ImportError as exc:
            raise RuntimeError("Install mst-sdk-python to enable MST Testnet") from exc
        self._sdk = Client(network="testnet", private_key=self.private_key)
        self._sdk.provider.rpc_url = self.rpc_url
        self._sdk.provider.web3 = Web3(Web3.HTTPProvider(self.rpc_url))
        self._sdk.provider.web3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        actual_chain_id = self._sdk.provider.web3.eth.chain_id
        if actual_chain_id != self.chain_id:
            raise RuntimeError("MST_RPC_URL chain ID does not match MST_CHAIN_ID")
        if self._sdk.signer.get_address().lower() != self.wallet_address.lower():
            raise RuntimeError("MST_WALLET_ADDRESS does not match MST_PRIVATE_KEY")

    def connect(self):
        block = self._sdk.provider.get_block_number()
        log.info("MST connectivity check succeeded", extra={"chain_id": self.chain_id, "latest_block": block})
        return block

    def _record_payload(self, payload):
        event_type = payload.get("event_type")
        if event_type not in EVENT_TYPES:
            raise ValueError(f"unsupported MST event type: {event_type!r}")
        record = {
            "schema": "land-registry-title-v1",
            "event_type": event_type,
            "transfer_id": payload.get("transfer_id"),
            "parcel_id": payload["parcel_id"],
            "previous_owner_hash": _owner_hash(payload.get("previous_owner", "")),
            "new_owner_hash": _owner_hash(payload.get("new_owner", "")),
            "ownership_shares": payload.get("ownership_shares", []),
            "transfer_timestamp": payload.get("transfer_timestamp") or datetime.now(timezone.utc).isoformat(),
            "registrar_id": _hash(payload.get("registrar_id", "outbox-worker")),
            "approval_hash": _hash(payload.get("approval_hash", "")),
            "document_hashes": [_hash(item) for item in payload.get("document_hashes", [])],
        }
        record["record_hash"] = _hash(_canonical_json(record))
        return record

    def submit_event(self, payload):
        record = self._record_payload(payload)
        calldata = "0x" + _canonical_json(record).encode("utf-8").hex()
        transaction = {
            "to": self.wallet_address,
            "value": 0,
            "data": calldata,
            "from": self.wallet_address,
            "chainId": self.chain_id,
        }
        transaction["gas"] = self._sdk.provider.estimate_gas(transaction)
        transaction.pop("from")
        tx_hash = _tx_hash(self._sdk.signer.send_transaction(transaction))
        log.info("MST immutable event submitted", extra={"tx_hash": tx_hash, "event_type": record["event_type"], "parcel_id": record["parcel_id"]})
        return {"tx_hash": tx_hash, "record": record}

    def query_transaction(self, tx_hash):
        return self._sdk.provider.web3.eth.get_transaction(tx_hash)

    def query_block(self, block_number):
        return self._sdk.provider.web3.eth.get_block(block_number)

    def query_ledger_state(self):
        return {"chain_id": self.chain_id, "latest_block": self._sdk.provider.get_block_number()}

    def verify_confirmation(self, tx_hash, confirmations=1):
        receipt = self._sdk.provider.wait_for_transaction(_tx_hash(tx_hash))
        latest = self._sdk.provider.get_block_number()
        block_number = int(receipt["blockNumber"])
        result = {
            "confirmed": receipt["status"] == 1 and latest - block_number + 1 >= confirmations,
            "confirmation_status": "CONFIRMED" if receipt["status"] == 1 else "FAILED",
            "block_number": block_number,
            "confirmations": max(0, latest - block_number + 1),
        }
        log.info("MST transaction confirmation checked", extra={"tx_hash": _tx_hash(tx_hash), "confirmed": result["confirmed"], "block_number": block_number, "confirmations": result["confirmations"]})
        return result

    def get_events(self, parcel_id=None, from_block=0, to_block="latest"):
        latest = self._sdk.provider.get_block_number() if to_block == "latest" else to_block
        events = []
        for block_number in range(from_block, latest + 1):
            block = self.query_block(block_number)
            for tx_hash in block["transactions"]:
                tx = self.query_transaction(tx_hash)
                tx_input = tx["input"].hex() if hasattr(tx["input"], "hex") else tx["input"]
                if not tx_input.startswith("0x"):
                    tx_input = "0x" + tx_input
                if tx["to"] and tx["to"].lower() == self.wallet_address.lower() and tx_input.startswith("0x7b"):
                    try:
                        record = json.loads(bytes.fromhex(tx_input[2:]).decode("utf-8"))
                    except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
                        continue
                    if parcel_id is None or record.get("parcel_id") == parcel_id:
                        events.append({"tx_hash": _tx_hash(tx_hash), "block_number": block_number, **record})
        return events


MSTChainClient = MSTClient
