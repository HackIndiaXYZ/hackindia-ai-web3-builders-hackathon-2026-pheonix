"""Integrity checks between operational title projections and MST proofs."""

import hashlib
import logging
from collections import Counter

log = logging.getLogger(__name__)


def _owner_hash(value):
    return hashlib.sha256(str(value or "").strip().lower().encode("utf-8")).hexdigest()


class TitleIntegrityService:
    def scan(self, parcel, chain_events, transfers=None, audit_events=None):
        transfers = transfers or []
        audit_events = audit_events or []
        parcel_id = parcel["ulpin"]
        relevant = [event for event in chain_events if event.get("parcel_id", event.get("ulpin")) == parcel_id]
        ownership_events = [event for event in relevant if event.get("event_type") in {"OWNERSHIP_TRANSFERRED", "TRANSFER"}]
        transfer_ids = {item.get("transfer_id") for item in transfers if item.get("parcel_id") == parcel_id}
        indexed_transfer_ids = [item.get("transfer_id") for item in ownership_events if item.get("transfer_id")]
        duplicate_tx = [tx for tx, count in Counter(item.get("tx_hash") for item in ownership_events).items() if tx and count > 1]
        duplicate_transfers = [transfer_id for transfer_id, count in Counter(indexed_transfer_ids).items() if count > 1]
        latest = ownership_events[-1] if ownership_events else None
        mismatch = bool(latest and latest.get("new_owner_hash") and latest["new_owner_hash"] != _owner_hash(parcel.get("current_owner")))
        missing_chain = bool(parcel.get("transfer_history")) and not ownership_events
        orphan_transfers = [transfer_id for transfer_id in indexed_transfer_ids if transfer_id not in transfer_ids]
        succession_events = [item for item in audit_events if item.get("action") in {"SUCCESSION_VERIFIED", "SUCCESSOR_ACTIVATED"}]
        invalid_succession = [item.get("transfer_id") or item.get("case_id") for item in succession_events if not item.get("parcel_id")]
        findings = {
            "missing_chain_records": missing_chain,
            "ownership_mismatch": mismatch,
            "orphan_transfers": orphan_transfers,
            "duplicate_transfers": duplicate_transfers + duplicate_tx,
            "invalid_succession_chains": invalid_succession,
        }
        deductions = (30 if missing_chain else 0) + (35 if mismatch else 0) + min(20, 5 * len(orphan_transfers)) + min(20, 5 * (len(duplicate_transfers) + len(duplicate_tx))) + min(15, 5 * len(invalid_succession))
        result = {"parcel_id": parcel_id, "status": "MATCHED" if deductions == 0 else "MISMATCH", "integrity_score": max(0, 100 - deductions), "findings": findings, "latest_chain_event": latest}
        log.info("title integrity scan complete", extra={"parcel_id": parcel_id, "status": result["status"], "integrity_score": result["integrity_score"]})
        return result