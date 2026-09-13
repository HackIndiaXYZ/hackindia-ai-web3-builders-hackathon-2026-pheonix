import pytest
from chain_client import DevelopmentSigner, ProductionSecureSigner, _doc_hash_bytes
from eth_account import Account

def test_development_signer():
    acct = Account.create()
    signer = DevelopmentSigner(acct.key.hex())
    assert signer.get_address() == acct.address

def test_development_signer_missing_key():
    with pytest.raises(ValueError):
        DevelopmentSigner("")

def test_production_signer_mock():
    signer = ProductionSecureSigner("alias/test", "0x239823947A7eB3AF9D584b7556ACb7d996E2BCaF")
    assert signer.get_address() == "0x239823947A7eB3AF9D584b7556ACb7d996E2BCaF"
    with pytest.raises(NotImplementedError) as exc:
        signer.sign_transaction({})
    assert "mocked and not fully implemented" in str(exc.value)

def test_production_signer_missing_config():
    with pytest.raises(ValueError):
        ProductionSecureSigner("", "")

def test_doc_hash_bytes():
    h = _doc_hash_bytes("test")
    assert len(h) == 32
    h2 = _doc_hash_bytes("0x" + "1" * 64)
    assert h2 == bytes.fromhex("1" * 64)