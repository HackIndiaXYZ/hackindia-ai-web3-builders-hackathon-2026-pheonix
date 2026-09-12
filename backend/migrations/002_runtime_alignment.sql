-- 002: reconcile the operational schema with the shapes the V2 API actually
-- returns, and add the columns the outbox worker needs to retry safely.
--
-- Migration 001 was written ahead of the runtime, so several things the API
-- emits today have nowhere to live: the seller list captured when a transfer
-- is created, the registrar's plain (unsigned) approval, the human-readable
-- IDs the frontend renders (AUD-…, NTF-…, OBX-…, CRD-…), credential recovery
-- cases, and the signing challenges whose single-use flag is a replay control.
-- Preserving the existing API responses byte-for-byte requires all of them.
--
-- Everything here is additive and idempotent: new nullable columns, new
-- tables, and constraint relaxations. No existing column changes meaning and
-- no data is rewritten, so this is safe to apply to a populated database.

-- ---------------------------------------------------------------- users ----
-- `identity_reference` is the case-folded key (UNIQUE on TEXT is
-- case-sensitive, so the display form cannot be the key without letting
-- "Rajesh Kumar" and "rajesh kumar" become two owners of the same parcel).
-- The presentation form still has to round-trip or the API would start
-- returning lowercased names.
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ------------------------------------------------------------- parcels ----
-- The V1 parcel catalogue is seeded from data/properties.json today, which
-- means a restart silently reverts every completed transfer. These columns let
-- the parcel record itself be durable.
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS survey_number TEXT;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS area_sqm NUMERIC;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS registration_office TEXT;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS last_registered_date DATE;
-- Not derivable from `ownerships`: on a joint parcel the registry still names
-- one holder of record (UP-0001 lists Rajesh Kumar while three people hold
-- shares), and that is the name V1 responses carry.
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS current_owner_user_id UUID REFERENCES users(id);
-- The chain is the authority for transfer history; this is the read model the
-- parcel endpoints render, kept as-is rather than normalised so V1 responses
-- are reproduced exactly.
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS transfer_history JSONB NOT NULL DEFAULT '[]';

-- ---------------------------------------------------------- credentials ----
-- The API returns credential identifiers of the form CRD-XXXXXXXXXXXX.
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS credential_ref TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS credentials_ref_key ON credentials(credential_ref);

-- ------------------------------------------------------------ transfers ----
-- The registrar's approval and the buyer's acceptance are session-authorised,
-- not wallet-signed, so neither can be represented in `transfer_approvals`
-- (whose crypto columns are mandatory for a reason).
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS registrar_user_id UUID REFERENCES users(id);
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS registrar_approved_at TIMESTAMPTZ;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS buyer_accepted_at TIMESTAMPTZ;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- The sellers are captured when the transfer is created and must not move
-- afterwards. Deriving them from `ownerships` at read time would rewrite the
-- history of every completed transfer the moment ownership changed — which is
-- precisely what completing that transfer does.
CREATE TABLE IF NOT EXISTS transfer_sellers (
  transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  position    SMALLINT NOT NULL,
  PRIMARY KEY (transfer_id, user_id)
);
CREATE INDEX IF NOT EXISTS transfer_sellers_order_idx ON transfer_sellers(transfer_id, position);

-- ---------------------------------------------------- transfer approvals ----
-- Two routes reach an owner approval: a wallet-signed EIP-712 approval, and a
-- session-authorised one. Rather than weaken the signed path by making its
-- columns optional for everyone, the method is recorded explicitly and a CHECK
-- enforces that anything *claiming* to be wallet-signed still carries a
-- consumed nonce, an address, a signature and the typed-data hash.
ALTER TABLE transfer_approvals ALTER COLUMN nonce DROP NOT NULL;
ALTER TABLE transfer_approvals ALTER COLUMN wallet_address DROP NOT NULL;
ALTER TABLE transfer_approvals ALTER COLUMN signature DROP NOT NULL;
ALTER TABLE transfer_approvals ALTER COLUMN typed_data_hash DROP NOT NULL;
ALTER TABLE transfer_approvals
  ADD COLUMN IF NOT EXISTS approval_method TEXT NOT NULL DEFAULT 'WALLET_SIGNATURE';
ALTER TABLE transfer_approvals ADD COLUMN IF NOT EXISTS actor_role TEXT NOT NULL DEFAULT 'OWNER';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transfer_approvals_method_ck') THEN
    ALTER TABLE transfer_approvals ADD CONSTRAINT transfer_approvals_method_ck CHECK (
      approval_method IN ('SESSION','WALLET_SIGNATURE')
      AND (approval_method <> 'WALLET_SIGNATURE' OR (
        nonce IS NOT NULL AND wallet_address IS NOT NULL
        AND signature IS NOT NULL AND typed_data_hash IS NOT NULL))
    );
  END IF;
END $$;

-- --------------------------------------------------------------- nonces ----
-- Challenge nonces are hex strings, not UUIDs, and `nonces.value` is UUID. A
-- separate, purpose-built table keeps the single-use guarantee without forcing
-- a format change on the existing column.
CREATE TABLE IF NOT EXISTS signing_challenges (
  id              TEXT PRIMARY KEY,
  purpose         TEXT NOT NULL,
  user_id         UUID REFERENCES users(id),
  parcel_id       TEXT REFERENCES parcels(ulpin),
  transfer_id     TEXT REFERENCES transfers(id),
  wallet_address  TEXT NOT NULL,
  nonce           TEXT NOT NULL,
  typed_data      JSONB NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  used_at         TIMESTAMPTZ,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL
);
-- A nonce is what makes a signature non-replayable, so it must be unique
-- across every challenge ever issued, not merely unique among live ones.
CREATE UNIQUE INDEX IF NOT EXISTS signing_challenges_nonce_key ON signing_challenges(nonce);
CREATE INDEX IF NOT EXISTS signing_challenges_user_idx ON signing_challenges(user_id, expires_at);

-- -------------------------------------------------------- succession ----
ALTER TABLE succession_cases ADD COLUMN IF NOT EXISTS evidence_reference TEXT;
ALTER TABLE succession_cases ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE succession_cases ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE succession_cases ADD COLUMN IF NOT EXISTS activated_by TEXT;
ALTER TABLE succession_cases ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Credential recovery had no table at all.
CREATE TABLE IF NOT EXISTS credential_recovery_cases (
  id                  TEXT PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id),
  parcel_id           TEXT REFERENCES parcels(ulpin),
  old_credential_id   UUID REFERENCES credentials(id),
  old_credential_ref  TEXT,
  status              TEXT NOT NULL,
  new_wallet_address  TEXT,
  approved_by         TEXT,
  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------- notifications ----
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_ref TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS parcel_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS transfer_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_ref_key ON notifications(notification_ref);
CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON notifications(user_id, created_at DESC);

-- --------------------------------------------------------- audit events ----
-- Not every actor is a provisioned user: the outbox worker writes audit rows
-- under its own name, and an audit trail that cannot record a non-human actor
-- is not an audit trail.
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS event_ref TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_label TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS parcel_id TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS transfer_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS audit_events_ref_key ON audit_events(event_ref);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at);

-- ------------------------------------------------------------- outbox ----
ALTER TABLE blockchain_outbox ADD COLUMN IF NOT EXISTS outbox_ref TEXT;
-- Exponential backoff needs somewhere to record when a failed row may be
-- retried; without it a claim query can only poll every row every tick.
ALTER TABLE blockchain_outbox ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now();
-- Which worker holds the row, for diagnosing a stuck claim.
ALTER TABLE blockchain_outbox ADD COLUMN IF NOT EXISTS claimed_by TEXT;
ALTER TABLE blockchain_outbox ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS blockchain_outbox_ref_key ON blockchain_outbox(outbox_ref);
-- The worker's claim query orders by (next_attempt_at) within a status.
CREATE INDEX IF NOT EXISTS outbox_claim_idx ON blockchain_outbox(status, next_attempt_at);
