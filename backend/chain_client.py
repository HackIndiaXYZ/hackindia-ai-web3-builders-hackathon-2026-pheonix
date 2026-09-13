"""
Live blockchain client — talks to a real deployed LandRegistry contract via
web3.py, instead of the in-memory mock_chain.py.

This module deliberately exposes the EXACT SAME function signatures as
mock_chain.py (register_parcel, register_transfer, mint_certificate,
get_history, get_all_activity, certificate_count) so app.py can switch
between them with a single import — see the CHAIN_MODE toggle in app.py.

REQUIRED ENVIRONMENT VARIABLES (set these before running with CHAIN_MODE=live):
  AMOY_RPC_URL       - RPC endpoint for Polygon Amoy testnet (e.g. from Alchemy/Infura)
  PRIVATE_KEY        - private key of the registrar wallet (needs a small amount
                        of test MATIC from a faucet to pay gas)
  CONTRACT_ADDRESS   - address LandRegistry.sol was deployed to (from `npm run deploy:amoy`)
  CONTRACT_ABI_PATH  - path to the compiled ABI JSON (defaults to the standard
                        Hardhat artifacts location, see _load_abi() below)
  DEPLOY_BLOCK       - block number the contract was deployed at (optional but
                        strongly recommended — without it, get_all_activity()
                        has to scan from block 0, which is slow/rate-limited on
                        public RPC endpoints)

IMPORTANT CAVEAT — name_to_address():
This demo has no real per-citizen wallet system (that's out of scope — see
ADR-6 in the CTO architecture docs: a real deployment uses Aadhaar-linked
eSign, not wallet addresses, as the identity anchor). Since the contract's
`address` type needs an actual Ethereum address and our seed data just has
plain name strings ("Rajesh Kumar"), name_to_address() deterministically
derives a pseudo-address from a name hash purely so the demo can drive real
on-chain calls without hand-assigning wallets to every seeded property. This
is NOT a real identity binding — every distinct name maps to a distinct fake
address, but there's no way to prove a real person controls it. Treat it as a
placeholder, not a security model.
"""

import os
import json
import time
from datetime import datetime, timezone

from web3 import Web3
from eth_account import Account

RPC_URL = os.environ.get("AMOY_RPC_URL")
PRIVATE_KEY = os.environ.get("PRIVATE_KEY")
CONTRACT_ADDRESS = os.environ.get("CONTRACT_ADDRESS")
DEPLOY_BLOCK = int(os.environ.get("DEPLOY_BLOCK", "0"))
KMS_KEY_ID = os.environ.get("KMS_KEY_ID")
WALLET_ADDRESS = os.environ.get("WALLET_ADDRESS")

_DEFAULT_ABI_PATH = os.path.join(
    os.path.dirname(__file__), "..", "contracts", "artifacts",
    "contracts", "LandRegistry.sol", "LandRegistry.json",
)
ABI_PATH = os.environ.get("CONTRACT_ABI_PATH", _DEFAULT_ABI_PATH)


def _load_abi():
    with open(ABI_PATH) as f:
        return json.load(f)["abi"]


def _require_configured():
    if KMS_KEY_ID:
        missing = [name for name, val in [
            ("AMOY_RPC_URL", RPC_URL), ("CONTRACT_ADDRESS", CONTRACT_ADDRESS),
            ("WALLET_ADDRESS", WALLET_ADDRESS)
        ] if not val]
    else:
        missing = [name for name, val in [
            ("AMOY_RPC_URL", RPC_URL), ("PRIVATE_KEY", PRIVATE_KEY),
            ("CONTRACT_ADDRESS", CONTRACT_ADDRESS),
        ] if not val]

    if missing:
        raise RuntimeError(
            f"chain_client is missing required env vars: {', '.join(missing)}. "
            f"Set CHAIN_MODE=mock to use the offline demo chain instead."
        )

import abc

class MSTSigner(abc.ABC):
    @abc.abstractmethod
    def sign_transaction(self, tx_dict: dict):
        pass

    @abc.abstractmethod
    def get_address(self) -> str:
        pass

class DevelopmentSigner(MSTSigner):
    def __init__(self, private_key: str):
        if not private_key:
            raise ValueError("PRIVATE_KEY must be provided for DevelopmentSigner")
        self.account = Account.from_key(private_key)

    def sign_transaction(self, tx_dict: dict):
        return self.account.sign_transaction(tx_dict)

    def get_address(self) -> str:
        return self.account.address

class ProductionSecureSigner(MSTSigner):
    def __init__(self, kms_key_id: str, wallet_address: str):
        if not kms_key_id or not wallet_address:
            raise ValueError("KMS_KEY_ID and WALLET_ADDRESS must be provided for ProductionSecureSigner")
        self.kms_key_id = kms_key_id
        self.wallet_address = Web3.to_checksum_address(wallet_address)

    def sign_transaction(self, tx_dict: dict):
        # Mock HSM integration for production
        raise NotImplementedError(
            f"Production HSM integration (KMS key {self.kms_key_id}) is mocked and not fully implemented."
        )

    def get_address(self) -> str:
        return self.wallet_address

def get_mst_signer() -> MSTSigner:
    if KMS_KEY_ID:
        return ProductionSecureSigner(KMS_KEY_ID, WALLET_ADDRESS)
    return DevelopmentSigner(PRIVATE_KEY)

_w3 = None
_contract = None
_signer = None


def _client():
    """Lazily initializes the web3 connection on first real use, rather than
    at import time — so importing this module doesn't crash a mock-mode run
    that never calls into it."""
    global _w3, _contract, _signer
    if _contract is not None:
        return _w3, _contract, _signer

    _require_configured()
    _w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not _w3.is_connected():
        raise RuntimeError(f"Could not connect to RPC at {RPC_URL}")

    _contract = _w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=_load_abi())
    _signer = get_mst_signer()
    return _w3, _contract, _signer


def ulpin_to_hash(ulpin: str) -> bytes:
    return Web3.keccak(text=ulpin)


def name_to_address(name: str) -> str:
    """See the module-level caveat above — this is a demo placeholder, not a
    real identity binding."""
    digest = Web3.keccak(text=name.strip().lower())
    return Web3.to_checksum_address(digest[-20:])


def _doc_hash_bytes(doc_hash: str) -> bytes:
    """Normalizes an arbitrary doc_hash string (the app generates these as
    short random hex strings, not necessarily 32 bytes) into a proper
    bytes32 by hashing it — the contract's docHash field just needs to be a
    stable, unique 32-byte value tied to this specific document reference."""
    return Web3.keccak(text=doc_hash or "0x0")


def _send(fn):
    """Signs and sends a state-changing contract call, waits for the receipt.
    Uses EIP-1559 style gas fields, which Polygon Amoy supports."""
    w3, _, signer = _client()
    tx = fn.build_transaction({
        "from": signer.get_address(),
        "nonce": w3.eth.get_transaction_count(signer.get_address()),
        "chainId": w3.eth.chain_id,
        "maxPriorityFeePerGas": w3.to_wei("30", "gwei"),
        "maxFeePerGas": w3.eth.gas_price + w3.to_wei("30", "gwei"),
    })
    # Estimate gas separately so we don't hardcode a limit that might be too
    # low for a given call (e.g. mintCertificate's array push cost grows
    # slightly with history length).
    try:
        tx["gas"] = int(w3.eth.estimate_gas(tx) * 1.2)
    except Exception:
        tx["gas"] = 300_000  # conservative fallback if estimation itself fails

    signed = signer.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    return receipt


def _block_timestamp_iso(w3, block_number: int) -> str:
    ts = w3.eth.get_block(block_number)["timestamp"]
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ------------------------------------------------------------- writes ----

def register_parcel(ulpin: str, owner: str) -> dict:
    w3, contract, _ = _client()
    receipt = _send(contract.functions.registerParcel(ulpin_to_hash(ulpin), name_to_address(owner)))
    events = contract.events.ParcelRegistered().process_receipt(receipt)
    return {
        "event_type": "PARCEL_REGISTERED",
        "ulpin": ulpin,
        "from": None,
        "to": owner,
        "doc_hash": None,
        "tx_hash": receipt.transactionHash.hex(),
        "block_number": receipt.blockNumber,
        "timestamp": _block_timestamp_iso(w3, receipt.blockNumber),
    }


def register_transfer(ulpin: str, from_owner: str, to_owner: str, doc_hash: str,
                      ai_verified: bool = True) -> dict:
    """
    Writes a transfer to the contract.

    `ai_verified` is passed through to the contract's `aiVerified` field, which
    LandRegistry.sol defines as "whether the off-chain fraud engine cleared
    this transfer," with false representing a registrar override. This used to
    be hardcoded to True on every call, which meant the chain attested that
    every transfer had passed verification — including ones that hadn't. The
    value now comes from the recorded assessment (assessment_store), so the
    event log tells the truth about who authorized what.
    """
    w3, contract, _ = _client()
    receipt = _send(contract.functions.registerTransfer(
        ulpin_to_hash(ulpin), name_to_address(to_owner),
        _doc_hash_bytes(doc_hash), bool(ai_verified),
    ))
    return {
        "event_type": "TRANSFER",
        "ulpin": ulpin,
        "from": from_owner,
        "to": to_owner,
        "doc_hash": doc_hash,
        "ai_verified": bool(ai_verified),
        "tx_hash": receipt.transactionHash.hex(),
        "block_number": receipt.blockNumber,
        "timestamp": _block_timestamp_iso(w3, receipt.blockNumber),
    }


def mint_certificate(ulpin: str, owner: str) -> dict:
    w3, contract, _ = _client()
    receipt = _send(contract.functions.mintCertificate(ulpin_to_hash(ulpin)))
    events = contract.events.CertificateMinted().process_receipt(receipt)
    token_id = events[0]["args"]["tokenId"] if events else None
    return {
        "token_id": token_id,
        "ulpin": ulpin,
        "owner": owner,
        "tx_hash": receipt.transactionHash.hex(),
        "block_number": receipt.blockNumber,
        "minted_at": _block_timestamp_iso(w3, receipt.blockNumber),
    }


# -------------------------------------------------------------- reads ----

def get_history(ulpin: str) -> list:
    """
    Queries this parcel's events, rather than calling the contract's
    getHistory() view function directly — events carry the tx_hash and
    block_number the frontend displays, which the raw struct returned by
    getHistory() does not.

    Includes the ParcelRegistered genesis event as well as transfers, so the
    parcel detail page shows the same chain-of-custody in live mode as it does
    in mock mode. Callers that specifically need transfers (e.g. the
    certificate gate) filter on event_type == "TRANSFER".
    """
    w3, contract, _ = _client()
    ulpin_hash = ulpin_to_hash(ulpin)
    latest = w3.eth.block_number
    history = []

    for ev in contract.events.ParcelRegistered().get_logs(
        from_block=DEPLOY_BLOCK, to_block=latest,
        argument_filters={"ulpinHash": ulpin_hash},
    ):
        history.append({
            "event_type": "PARCEL_REGISTERED",
            "ulpin": ulpin,
            "from": None,
            "to": ev["args"]["initialOwner"],
            "doc_hash": None,
            "tx_hash": ev["transactionHash"].hex(),
            "block_number": ev["blockNumber"],
            "timestamp": _block_timestamp_iso(w3, ev["blockNumber"]),
        })

    for ev in contract.events.TransferRegistered().get_logs(
        from_block=DEPLOY_BLOCK, to_block=latest,
        argument_filters={"ulpinHash": ulpin_hash},
    ):
        history.append({
            "event_type": "TRANSFER",
            "ulpin": ulpin,
            "from": ev["args"]["fromOwner"],
            "to": ev["args"]["toOwner"],
            "doc_hash": ev["args"]["docHash"].hex(),
            "ai_verified": ev["args"]["aiVerified"],
            "tx_hash": ev["transactionHash"].hex(),
            "block_number": ev["blockNumber"],
            "timestamp": _block_timestamp_iso(w3, ev["blockNumber"]),
        })

    history.sort(key=lambda e: e["block_number"])
    return history


def certificate_count() -> int:
    _, contract, _ = _client()
    return contract.functions.certificateCounter().call()


def get_all_activity() -> list:
    """
    Pulls every ParcelRegistered, TransferRegistered, and CertificateMinted
    event emitted by the contract from DEPLOY_BLOCK to the current block, and
    merges them into one chronological feed — this is the real equivalent of
    mock_chain.get_all_activity(), now backed by actual on-chain event logs
    instead of an in-memory list.

    In a production system this would run continuously in a background
    indexer (see "on-chain event indexer" in the CTO architecture doc's
    Monitoring layer) and cache results in a database, rather than querying
    the RPC live on every dashboard load — fine for a hackathon demo's event
    volume, not fine at real scale.
    """
    w3, contract, _ = _client()
    latest = w3.eth.block_number

    activity = []

    for ev in contract.events.ParcelRegistered().get_logs(from_block=DEPLOY_BLOCK, to_block=latest):
        activity.append({
            "event_type": "PARCEL_REGISTERED",
            "ulpin": None,  # ULPIN isn't recoverable from its hash — see note below
            "ulpin_hash": ev["args"]["ulpinHash"].hex(),
            "from": None,
            "to": ev["args"]["initialOwner"],
            "doc_hash": None,
            "tx_hash": ev["transactionHash"].hex(),
            "block_number": ev["blockNumber"],
            "timestamp": _block_timestamp_iso(w3, ev["blockNumber"]),
        })

    for ev in contract.events.TransferRegistered().get_logs(from_block=DEPLOY_BLOCK, to_block=latest):
        activity.append({
            "event_type": "TRANSFER",
            "ulpin": None,
            "ulpin_hash": ev["args"]["ulpinHash"].hex(),
            "from": ev["args"]["fromOwner"],
            "to": ev["args"]["toOwner"],
            "doc_hash": ev["args"]["docHash"].hex(),
            "ai_verified": ev["args"]["aiVerified"],
            "tx_hash": ev["transactionHash"].hex(),
            "block_number": ev["blockNumber"],
            "timestamp": _block_timestamp_iso(w3, ev["blockNumber"]),
        })

    for ev in contract.events.CertificateMinted().get_logs(from_block=DEPLOY_BLOCK, to_block=latest):
        activity.append({
            "event_type": "CERTIFICATE_MINTED",
            "ulpin": None,
            "ulpin_hash": ev["args"]["ulpinHash"].hex(),
            "from": None,
            "to": ev["args"]["owner"],
            "doc_hash": None,
            "tx_hash": ev["transactionHash"].hex(),
            "block_number": ev["blockNumber"],
            "token_id": ev["args"]["tokenId"],
            "timestamp": _block_timestamp_iso(w3, ev["blockNumber"]),
        })

    activity.sort(key=lambda e: e["block_number"], reverse=True)
    return activity
