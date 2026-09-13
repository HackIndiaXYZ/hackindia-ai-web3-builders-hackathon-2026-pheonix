"""
Live blockchain client — talks to a real deployed LandRegistryV2 contract via
web3.py, instead of the in-memory mock_chain.py.

This module exposes the EXACT SAME function signatures as mock_chain.py for
backwards compatibility in the frontend where possible, but now implements
the actual LandRegistryV2 flow.
"""

import os
import json
import time
from datetime import datetime, timezone
import abc

from web3 import Web3
from eth_account import Account

RPC_URL = os.environ.get("MST_RPC_URL")
CHAIN_ID = int(os.environ.get("MST_CHAIN_ID", "91562037"))
CONTRACT_ADDRESS = os.environ.get("MST_CONTRACT_ADDRESS")
WALLET_ADDRESS = os.environ.get("MST_WALLET_ADDRESS")
PRIVATE_KEY = os.environ.get("MST_PRIVATE_KEY")
KMS_KEY_ID = os.environ.get("KMS_KEY_ID")
DEPLOY_BLOCK = int(os.environ.get("DEPLOY_BLOCK", "0"))

_DEFAULT_ABI_PATH = os.path.join(
    os.path.dirname(__file__), "..", "contracts", "artifacts",
    "src", "LandRegistryV2.sol", "LandRegistryV2.json",
)
ABI_PATH = os.environ.get("CONTRACT_ABI_PATH", _DEFAULT_ABI_PATH)

def _load_abi():
    if not os.path.exists(ABI_PATH):
        raise RuntimeError(f"ABI file not found at {ABI_PATH}")
    with open(ABI_PATH) as f:
        data = json.load(f)
        if "abi" not in data:
            raise RuntimeError(f"Invalid ABI file at {ABI_PATH}")
        return data["abi"]

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
            raise ValueError("MST_PRIVATE_KEY must be provided for DevelopmentSigner")
        self.account = Account.from_key(private_key)

    def sign_transaction(self, tx_dict: dict):
        return self.account.sign_transaction(tx_dict)

    def get_address(self) -> str:
        return self.account.address

class ProductionSecureSigner(MSTSigner):
    def __init__(self, kms_key_id: str, wallet_address: str):
        if not kms_key_id or not wallet_address:
            raise ValueError("KMS_KEY_ID and MST_WALLET_ADDRESS must be provided for ProductionSecureSigner")
        self.kms_key_id = kms_key_id
        self.wallet_address = Web3.to_checksum_address(wallet_address)

    def sign_transaction(self, tx_dict: dict):
        raise NotImplementedError(
            f"Production HSM integration (KMS key {self.kms_key_id}) is mocked and not fully implemented."
        )

    def get_address(self) -> str:
        return self.wallet_address

def get_mst_signer() -> MSTSigner:
    if KMS_KEY_ID:
        return ProductionSecureSigner(KMS_KEY_ID, WALLET_ADDRESS)
    if PRIVATE_KEY:
        return DevelopmentSigner(PRIVATE_KEY)
    raise RuntimeError("Neither KMS_KEY_ID nor MST_PRIVATE_KEY is configured")

_w3 = None
_contract = None
_signer = None

def _require_configured():
    missing = [name for name, val in [
        ("MST_RPC_URL", RPC_URL), 
        ("MST_CONTRACT_ADDRESS", CONTRACT_ADDRESS),
        ("MST_WALLET_ADDRESS", WALLET_ADDRESS)
    ] if not val]

    if missing:
        raise RuntimeError(
            f"chain_client is missing required env vars: {', '.join(missing)}. "
            f"Set CHAIN_MODE=mock to use the offline demo chain instead."
        )

def _client():
    global _w3, _contract, _signer
    if _contract is not None:
        return _w3, _contract, _signer

    _require_configured()
    _w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not _w3.is_connected():
        raise RuntimeError(f"Could not connect to RPC at {RPC_URL}")
        
    actual_chain_id = _w3.eth.chain_id
    if actual_chain_id != CHAIN_ID:
        raise RuntimeError(f"Chain ID mismatch. Expected {CHAIN_ID}, got {actual_chain_id}")

    checksum_address = Web3.to_checksum_address(CONTRACT_ADDRESS)
    code = _w3.eth.get_code(checksum_address)
    if not code or code == b'\x00' or code == b'':
        raise RuntimeError(f"No contract bytecode found at {CONTRACT_ADDRESS}")

    abi = _load_abi()
    expected_methods = {"registerParcel", "initiateTransfer", "approveAsRegistrar", "acceptAsBuyer", "executeTransfer", "cancelTransfer", "expireTransfer", "setFrozen", "setCredential", "getTransfer", "getParcelOwners", "getTransferProposedOwners"}
    abi_methods = {item["name"] for item in abi if item.get("type") == "function"}
    missing_methods = expected_methods - abi_methods
    if missing_methods:
        raise RuntimeError(f"ABI is missing required methods: {missing_methods}")

    _contract = _w3.eth.contract(address=checksum_address, abi=abi)
    
    registrar = _contract.functions.registrar().call()
    if registrar.lower() != WALLET_ADDRESS.lower():
        raise RuntimeError(f"Contract registrar {registrar} does not match MST_WALLET_ADDRESS {WALLET_ADDRESS}")
        
    _signer = get_mst_signer()
    signer_addr = _signer.get_address()
    if signer_addr.lower() != WALLET_ADDRESS.lower():
        raise RuntimeError(f"Signer address {signer_addr} does not match MST_WALLET_ADDRESS {WALLET_ADDRESS}")
        
    return _w3, _contract, _signer

def name_to_address(name: str) -> str:
    digest = Web3.keccak(text=name.strip().lower())
    return Web3.to_checksum_address(digest[-20:])

def ulpin_to_hash(ulpin: str) -> bytes:
    if not ulpin: return b'\x00' * 32
    return Web3.keccak(text=ulpin)

def _doc_hash_bytes(doc_hash: str) -> bytes:
    if not doc_hash: return b'\x00' * 32
    if doc_hash.startswith("0x"):
        try:
            val = bytes.fromhex(doc_hash[2:])
            if len(val) == 32: return val
        except ValueError:
            pass
    return Web3.keccak(text=doc_hash or "0x0")

def _send(fn):
    w3, _, signer = _client()
    tx = fn.build_transaction({
        "from": signer.get_address(),
        "nonce": w3.eth.get_transaction_count(signer.get_address()),
        "chainId": w3.eth.chain_id,
        "maxPriorityFeePerGas": w3.to_wei("30", "gwei"),
        "maxFeePerGas": w3.eth.gas_price + w3.to_wei("30", "gwei"),
    })
    try:
        tx["gas"] = int(w3.eth.estimate_gas(tx) * 1.2)
    except Exception:
        tx["gas"] = 1_000_000

    signed = signer.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    return receipt

def _block_timestamp_iso(w3, block_number: int) -> str:
    ts = w3.eth.get_block(block_number)["timestamp"]
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def register_parcel(ulpin: str, owner: str) -> dict:
    w3, contract, _ = _client()
    owner_addr = name_to_address(owner)
    receipt = _send(contract.functions.registerParcel(
        ulpin_to_hash(ulpin),
        [owner_addr],
        [10000],
        [ulpin_to_hash(owner + "_cid")], # mock cid
        [1], # version
        1 # threshold
    ))
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

def initiate_transfer(ulpin: str, buyer: str, doc_hash: str, assessment_hash: str, expiry_timestamp: int):
    w3, contract, _ = _client()
    buyer_addr = name_to_address(buyer)
    proposed = [{
        "account": buyer_addr,
        "shareBps": 10000,
        "credentialId": ulpin_to_hash(buyer + "_cid"),
        "credentialVersion": 1
    }]
    receipt = _send(contract.functions.initiateTransfer(
        ulpin_to_hash(ulpin),
        buyer_addr,
        proposed,
        1,
        _doc_hash_bytes(doc_hash),
        _doc_hash_bytes(assessment_hash),
        expiry_timestamp
    ))
    events = contract.events.TransferInitiated().process_receipt(receipt)
    transfer_id = events[0]["args"]["transferId"] if events else None
    return receipt, transfer_id

def approve_as_registrar(transfer_id_bytes: bytes):
    w3, contract, _ = _client()
    return _send(contract.functions.approveAsRegistrar(transfer_id_bytes))

def execute_transfer(transfer_id_bytes: bytes):
    w3, contract, _ = _client()
    return _send(contract.functions.executeTransfer(transfer_id_bytes))

def set_credential(ulpin: str, account_addr: str, cid: bytes, version: int, status: int):
    w3, contract, _ = _client()
    return _send(contract.functions.setCredential(ulpin_to_hash(ulpin), Web3.to_checksum_address(account_addr), cid, version, status))

def set_frozen(ulpin: str, frozen: bool):
    w3, contract, _ = _client()
    return _send(contract.functions.setFrozen(ulpin_to_hash(ulpin), frozen))

def cancel_transfer(transfer_id_bytes: bytes, reason: str):
    w3, contract, _ = _client()
    return _send(contract.functions.cancelTransfer(transfer_id_bytes, Web3.keccak(text=reason)))

def register_transfer(ulpin: str, from_owner: str, to_owner: str, doc_hash: str, ai_verified: bool = True) -> dict:
    w3, contract, _ = _client()
    # In V2, we only initiate the transfer here if we can't complete it.
    expiry = int(time.time()) + 86400 * 7 # 7 days
    receipt_init, transfer_id = initiate_transfer(ulpin, to_owner, doc_hash, "0x0", expiry)
    
    return {
        "event_type": "TRANSFER",
        "ulpin": ulpin,
        "from": from_owner,
        "to": to_owner,
        "doc_hash": doc_hash,
        "ai_verified": bool(ai_verified),
        "tx_hash": receipt_init.transactionHash.hex(),
        "block_number": receipt_init.blockNumber,
        "timestamp": _block_timestamp_iso(w3, receipt_init.blockNumber),
        "v2_transfer_id": transfer_id.hex() if transfer_id else None
    }

def mint_certificate(ulpin: str, owner: str) -> dict:
    return {}

def get_history(ulpin: str) -> list:
    w3, contract, _ = _client()
    ulpin_hash = ulpin_to_hash(ulpin)
    latest = w3.eth.block_number
    history = []
    
    for ev in contract.events.ParcelRegistered().get_logs(from_block=DEPLOY_BLOCK, to_block=latest):
        if ev["args"]["parcelId"] == ulpin_hash:
            history.append({
                "event_type": "PARCEL_REGISTERED",
                "ulpin": ulpin,
                "tx_hash": ev["transactionHash"].hex(),
                "block_number": ev["blockNumber"],
                "timestamp": _block_timestamp_iso(w3, ev["blockNumber"]),
            })
            
    for ev in contract.events.TransferExecuted().get_logs(from_block=DEPLOY_BLOCK, to_block=latest):
        if ev["args"]["parcelId"] == ulpin_hash:
            history.append({
                "event_type": "TRANSFER",
                "ulpin": ulpin,
                "tx_hash": ev["transactionHash"].hex(),
                "block_number": ev["blockNumber"],
                "timestamp": _block_timestamp_iso(w3, ev["blockNumber"]),
            })

    history.sort(key=lambda e: e["block_number"])
    return history

def certificate_count() -> int:
    return 0

def get_all_activity(from_block=None, to_block="latest") -> list:
    w3, contract, _ = _client()
    
    start_block = DEPLOY_BLOCK if from_block is None else from_block
    latest = w3.eth.block_number if to_block == "latest" else to_block
    activity = []

    for ev in contract.events.ParcelRegistered().get_logs(from_block=start_block, to_block=latest):
        activity.append({
            "event_type": "PARCEL_REGISTERED",
            "ulpin_hash": ev["args"]["parcelId"].hex(),
            "tx_hash": ev["transactionHash"].hex(),
            "block_number": ev["blockNumber"],
            "timestamp": _block_timestamp_iso(w3, ev["blockNumber"]),
        })

    for ev in contract.events.TransferExecuted().get_logs(from_block=start_block, to_block=latest):
        activity.append({
            "event_type": "TRANSFER",
            "ulpin_hash": ev["args"]["parcelId"].hex(),
            "tx_hash": ev["transactionHash"].hex(),
            "block_number": ev["blockNumber"],
            "timestamp": _block_timestamp_iso(w3, ev["blockNumber"]),
        })

    activity.sort(key=lambda e: e["block_number"], reverse=True)
    return activity
