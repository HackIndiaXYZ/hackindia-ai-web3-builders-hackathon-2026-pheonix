"""Derived parcel intelligence from existing title, audit, and risk records."""

import logging
from datetime import date, datetime, timedelta

log = logging.getLogger(__name__)


class ParcelIntelligenceService:
    def build(self, parcel, audit_events=None):
        audit_events = audit_events or []
        history = parcel.get("transfer_history", [])
        dates = []
        for item in history:
            try:
                dates.append(datetime.fromisoformat(str(item.get("date")).replace("Z", "+00:00")).date())
            except (TypeError, ValueError):
                continue
        today = date.today()
        ownership_age_days = (today - max(dates)).days if dates else None
        recent_cutoff = today - timedelta(days=365)
        parcel_audit = [item for item in audit_events if item.get("parcel_id") == parcel["ulpin"]]
        freeze_history = [item for item in parcel_audit if item.get("action") in {"PARCEL_FROZEN", "PARCEL_UNFROZEN"}]
        dispute_history = parcel.get("disputes", [])
        encumbrance_history = parcel.get("encumbrances", [])
        result = {
            "parcel_id": parcel["ulpin"],
            "ownership_age_days": ownership_age_days,
            "transfer_frequency_last_year": sum(1 for item in dates if item >= recent_cutoff),
            "dispute_history": dispute_history,
            "freeze_history": freeze_history,
            "encumbrance_history": encumbrance_history,
            "title_health_score": max(0, 100 - 20 * len(dispute_history) - 10 * len(encumbrance_history) - (30 if parcel.get("frozen") else 0)),
        }
        log.info("parcel intelligence built", extra={"parcel_id": parcel["ulpin"], "title_health_score": result["title_health_score"]})
        return result