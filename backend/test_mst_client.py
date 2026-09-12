"""Offline invariants for the MST title-record adapter."""

from blockchain.mst_client import MSTClient


def test_title_record_contains_hashes_only():
    client = MSTClient.__new__(MSTClient)
    record = client._record_payload({
        "event_type": "OWNERSHIP_TRANSFERRED",
        "transfer_id": "TR-TEST",
        "parcel_id": "UP-TEST",
        "previous_owner": "Previous Owner",
        "new_owner": "New Owner",
        "ownership_shares": [{"share_bps": 10000}],
        "registrar_id": "registrar",
        "approval_hash": "approval",
        "document_hashes": ["document"],
    })

    serialized = str(record)
    assert "Previous Owner" not in serialized
    assert "New Owner" not in serialized
    assert len(record["previous_owner_hash"]) == 64
    assert len(record["new_owner_hash"]) == 64
    assert len(record["record_hash"]) == 64


def test_unknown_event_type_is_rejected():
    client = MSTClient.__new__(MSTClient)
    try:
        client._record_payload({"event_type": "UNKNOWN", "parcel_id": "UP-TEST"})
        assert False, "unknown event type should be rejected"
    except ValueError as error:
        assert "unsupported MST event type" in str(error)