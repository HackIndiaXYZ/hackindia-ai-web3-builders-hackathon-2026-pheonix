-- Statuses are persisted with the parcel fixture so map colors survive a
-- process restart and are no longer inferred from browser-only mock data.
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS title_status TEXT NOT NULL DEFAULT 'VERIFIED';
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS risk_status TEXT NOT NULL DEFAULT 'LOW_RISK';
