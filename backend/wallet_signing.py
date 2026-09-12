"""EIP-712 messages for wallet linking and transfer authorization.

Only public addresses and signatures enter this module. Private keys stay in a
wallet. The message purpose is part of both the primary type and payload so a
wallet-link signature cannot be replayed as a transfer approval.
"""

import hashlib
import os
from datetime import datetime, timezone

from eth_account import Account
from eth_account.messages import encode_typed_data

DOMAIN = {
    "name": "LandRegistryV2",
    "version": "2",
    "chainId": int(os.environ.get("WALLET_CHAIN_ID", "31337")),
    "verifyingContract": os.environ.get("LAND_REGISTRY_CONTRACT", "0x0000000000000000000000000000000000000000"),
}


def internal_user_id(username: str) -> str:
    """A non-PII deterministic internal reference for typed messages."""
    return "0x" + hashlib.sha256(username.strip().lower().encode()).hexdigest()


def unix_seconds(value: str) -> int:
    return int(datetime.fromisoformat(value).astimezone(timezone.utc).timestamp())


def wallet_link_typed_data(challenge: dict) -> dict:
    return {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"}, {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"}, {"name": "verifyingContract", "type": "address"},
            ],
            "WalletLink": [
                {"name": "userId", "type": "bytes32"}, {"name": "wallet", "type": "address"},
                {"name": "purpose", "type": "string"}, {"name": "nonce", "type": "bytes32"},
                {"name": "issuedAt", "type": "uint256"}, {"name": "expiry", "type": "uint256"},
            ],
        },
        "primaryType": "WalletLink", "domain": DOMAIN,
        "message": {"userId": internal_user_id(challenge["user"]), "wallet": challenge["wallet_address"],
                    "purpose": "LAND_REGISTRY_WALLET_LINK", "nonce": "0x" + challenge["nonce"],
                    "issuedAt": unix_seconds(challenge["issued_at"]), "expiry": unix_seconds(challenge["expires_at"])},
    }


def transfer_approval_typed_data(challenge: dict) -> dict:
    return {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"}, {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"}, {"name": "verifyingContract", "type": "address"},
            ],
            "TransferApproval": [
                {"name": "transferId", "type": "string"}, {"name": "parcelId", "type": "string"},
                {"name": "sellerWallet", "type": "address"}, {"name": "buyer", "type": "string"},
                {"name": "documentHash", "type": "bytes32"}, {"name": "assessmentHash", "type": "bytes32"},
                {"name": "purpose", "type": "string"}, {"name": "nonce", "type": "bytes32"}, {"name": "expiry", "type": "uint256"},
            ],
        },
        "primaryType": "TransferApproval", "domain": DOMAIN,
        "message": {"transferId": challenge["transfer_id"], "parcelId": challenge["parcel_id"],
                    "sellerWallet": challenge["wallet_address"], "buyer": challenge["buyer"],
                    "documentHash": _bytes32(challenge["document_hash"]), "assessmentHash": _bytes32(challenge["assessment_hash"]),
                    "purpose": "LAND_REGISTRY_TRANSFER_APPROVAL", "nonce": "0x" + challenge["nonce"],
                    "expiry": unix_seconds(challenge["expires_at"])},
    }


def recover(typed_data: dict, signature: str) -> str:
    return Account.recover_message(encode_typed_data(full_message=typed_data), signature=signature)


def _bytes32(value: str) -> str:
    raw = value.removeprefix("0x")
    if len(raw) == 64:
        return "0x" + raw
    return "0x" + hashlib.sha256(value.encode()).hexdigest()
