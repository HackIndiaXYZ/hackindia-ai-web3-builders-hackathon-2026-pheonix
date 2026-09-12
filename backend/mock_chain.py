"""
Simulates the LandRegistry smart contract's registerTransfer()/getHistory()
behavior in-memory, so the demo works end-to-end without needing a live
testnet RPC connection (this sandbox has no network access to Polygon Amoy).

EXTENSION POINT: when you have network access (i.e., on your own machine
during the hackathon), replace the body of `register_transfer()` and
`get_history()` with real web3.py calls against the deployed contract in
../contracts/LandRegistry.sol. The function signatures below are deliberately
shaped to match what the real contract calls will look like, so swapping the
implementation shouldn't require changing any calling code in app.py.
"""

import hashlib
import time

_CHAIN_LOG = []  # in-memory stand-in for on-chain events
_CERTIFICATE_LOG = []

# Arbitrary starting height, purely so the demo's block numbers look like a
# real chain's rather than starting at 1.
_GENESIS_BLOCK = 1_000_000


def _fake_tx_hash(payload: str) -> str:
    return "0x" + hashlib.sha256((payload + str(time.time())).encode()).hexdigest()[:40]


def _next_block_number() -> int:
    """
    One simulated block per event. Every write appends to exactly one of the
    two logs, so this stays strictly monotonic and never collides — which the
    Blockchain Explorer relies on, since it sorts the merged feed by block
    number to establish ordering.
    """
    return _GENESIS_BLOCK + len(_CHAIN_LOG) + len(_CERTIFICATE_LOG)


def register_transfer(ulpin: str, from_owner: str, to_owner: str, doc_hash: str,
                      ai_verified: bool = True) -> dict:
    """
    Mimics calling LandRegistry.registerTransfer() on-chain.

    `ai_verified` mirrors the contract's `aiVerified` argument: true only when
    the fraud engine cleared the transfer on its own, false when a registrar
    authorized it despite flags. app.py derives this from the recorded
    assessment (see assessment_store.authorize_commit) rather than assuming it.
    """
    tx_hash = _fake_tx_hash(f"{ulpin}{from_owner}{to_owner}{doc_hash}")
    entry = {
        "event_type": "TRANSFER",
        "ulpin": ulpin,
        "from": from_owner,
        "to": to_owner,
        "doc_hash": doc_hash,
        "ai_verified": ai_verified,
        "tx_hash": tx_hash,
        "block_number": _next_block_number(),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    _CHAIN_LOG.append(entry)
    return entry


def register_parcel(ulpin: str, owner: str) -> dict:
    """
    Mimics calling LandRegistry.registerParcel() on-chain — the genesis event
    for a brand-new parcel entering the registry for the first time.
    """
    tx_hash = _fake_tx_hash(f"register-{ulpin}-{owner}")
    entry = {
        "event_type": "PARCEL_REGISTERED",
        "ulpin": ulpin,
        "from": None,
        "to": owner,
        "doc_hash": None,
        "tx_hash": tx_hash,
        "block_number": _next_block_number(),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    _CHAIN_LOG.append(entry)
    return entry


def get_history(ulpin: str) -> list:
    """Mimics calling LandRegistry.getHistory() on-chain."""
    return [e for e in _CHAIN_LOG if e["ulpin"] == ulpin]


_CERTIFICATES_BY_PARCEL = {}


def mint_certificate(ulpin: str, owner: str) -> dict:
    """
    Mimics calling LandRegistry.mintCertificate() on-chain — the Sharp Economy
    track tie-in (see contracts/LandRegistry.sol for the real contract function).
    Certificates are non-transferable by design (soulbound-style): they attest
    "this parcel had a clean, verified transfer as of this block," tied to the
    owner at mint time, not a tradeable asset.

    Re-minting for the same parcel and owner returns the existing certificate
    rather than issuing a duplicate — the contract enforces the same rule, so
    minting twice must not silently produce two "clean title" tokens for one
    parcel.
    """
    existing = _CERTIFICATES_BY_PARCEL.get((ulpin, owner))
    if existing:
        return {**existing, "already_minted": True}

    token_id = len(_CERTIFICATE_LOG) + 1
    tx_hash = _fake_tx_hash(f"cert-{ulpin}-{owner}-{token_id}")
    cert = {
        "token_id": token_id,
        "ulpin": ulpin,
        "owner": owner,
        "tx_hash": tx_hash,
        "block_number": _next_block_number(),
        "minted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    _CERTIFICATE_LOG.append(cert)
    _CERTIFICATES_BY_PARCEL[(ulpin, owner)] = cert
    return cert


def certificate_count() -> int:
    return len(_CERTIFICATE_LOG)


def get_all_activity() -> list:
    """
    Full on-chain event feed across every parcel — this is the data source
    for the Blockchain Explorer page. In the real system this would be an
    indexer subscribed to contract events (see the "on-chain event indexer"
    component in the CTO architecture doc's Monitoring layer), not an
    in-memory list — but the shape of the data is the same either way.
    """
    activity = list(_CHAIN_LOG)
    for c in _CERTIFICATE_LOG:
        activity.append({
            "event_type": "CERTIFICATE_MINTED",
            "ulpin": c["ulpin"],
            "from": None,
            "to": c["owner"],
            "doc_hash": None,
            "tx_hash": c["tx_hash"],
            "block_number": c["block_number"],
            "timestamp": c["minted_at"],
            "token_id": c["token_id"],
        })
    activity.sort(key=lambda e: e["block_number"], reverse=True)
    return activity


def reset():
    """Clears the simulated chain. Used by tests and the demo-reset flow."""
    _CHAIN_LOG.clear()
    _CERTIFICATE_LOG.clear()
    _CERTIFICATES_BY_PARCEL.clear()
