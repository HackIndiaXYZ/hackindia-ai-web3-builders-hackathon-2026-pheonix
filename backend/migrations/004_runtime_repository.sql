-- Runtime repository constraints used by the PostgreSQL V2 adapter.
ALTER TABLE blockchain_outbox ADD COLUMN IF NOT EXISTS claimed_by TEXT;
ALTER TABLE blockchain_outbox ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE blockchain_outbox ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE blockchain_outbox ADD COLUMN IF NOT EXISTS failure_reason TEXT;
CREATE INDEX IF NOT EXISTS outbox_claim_ready_idx ON blockchain_outbox(status, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS blockchain_events_parcel_block_idx ON blockchain_events(parcel_id, block_number);