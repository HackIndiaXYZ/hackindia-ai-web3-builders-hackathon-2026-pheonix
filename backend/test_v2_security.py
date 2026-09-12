"""Security invariants for the V2 workflow and EIP-712 authorization."""

from eth_account import Account
from eth_account.messages import encode_typed_data
from v2_registry import V2Registry

def _sign(challenge, account):
    return Account.sign_message(encode_typed_data(full_message=challenge["typed_data"]), account.key).signature.hex()

def _parcel():
    return {"ulpin": "UP-TEST", "current_owner": "Rajesh Kumar", "owners": [{"name": "Rajesh Kumar", "share_percent": 100, "credential_status": "ACTIVE"}], "ownership_policy": {"required_approvals": 1, "total_owners": 1}, "frozen": False}

def test_wallet_link_uses_real_signature_and_cannot_replay():
    registry, account = V2Registry(), Account.create()
    challenge = registry.create_challenge("Rajesh Kumar", "UP-TEST", account.address)
    wallet = registry.link_wallet(challenge["challenge_id"], _sign(challenge, account))
    assert wallet["key_status"] == "ACTIVE"
    try:
        registry.link_wallet(challenge["challenge_id"], _sign(challenge, account)); assert False
    except ValueError:
        pass

def test_transfer_signature_is_bound_to_exact_challenge_and_consumed():
    registry, account = V2Registry(), Account.create()
    link = registry.create_challenge("Rajesh Kumar", "UP-TEST", account.address)
    registry.link_wallet(link["challenge_id"], _sign(link, account))
    transfer = registry.create_transfer(_parcel(), "buyer1", "document-a", "assessment-a", "Rajesh Kumar")
    approval = registry.create_transfer_approval_challenge(transfer["transfer_id"], "Rajesh Kumar")
    updated = registry.approve_with_signature(approval["challenge_id"], _sign(approval, account))
    assert updated["status"] == "REGISTRAR_REVIEW"
    try:
        registry.approve_with_signature(approval["challenge_id"], _sign(approval, account)); assert False
    except ValueError:
        pass

def test_registrar_cannot_bypass_owner_threshold():
    registry = V2Registry(); transfer = registry.create_transfer(_parcel(), "buyer1", "document-a", "assessment-a", "Rajesh Kumar")
    try:
        registry.approve(transfer["transfer_id"], "registrar_noida2", "REGISTRAR"); assert False
    except ValueError:
        pass
