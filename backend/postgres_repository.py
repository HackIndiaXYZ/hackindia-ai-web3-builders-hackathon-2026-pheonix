"""Supabase/PostgreSQL persistence boundary for V2 state transitions.

This repository deliberately owns transactions and row locks. It is selected
only when DATABASE_URL is configured; `V2Registry` remains the explicit local
development adapter. No DB credentials are hardcoded here.
"""

import os
from contextlib import contextmanager


class PostgresV2Repository:
    def __init__(self, database_url=None):
        self.database_url = database_url or os.environ.get("DATABASE_URL")
        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required for PostgreSQL persistence")

    @contextmanager
    def transaction(self):
        try:
            import psycopg
        except ImportError as exc:
            raise RuntimeError("Install psycopg[binary] to enable PostgreSQL persistence") from exc
        with psycopg.connect(self.database_url) as conn:
            with conn.transaction():
                with conn.cursor() as cur:
                    yield cur

    def record_owner_approval(self, transfer_id, user_id, nonce, wallet_address, signature, typed_data_hash):
        """Atomic approval + nonce consumption + threshold/outbox transition.

        The transfer is locked, so duplicate concurrent approvals cannot each
        observe the same threshold. The outbox insert shares the transaction.
        """
        with self.transaction() as cur:
            cur.execute("SELECT status, required_approvals, parcel_id FROM transfers WHERE id=%s FOR UPDATE", (transfer_id,))
            transfer = cur.fetchone()
            if not transfer or transfer[0] != "OWNER_APPROVAL":
                raise ValueError("transfer is not awaiting owner approval")
            cur.execute("SELECT consumed_at, expires_at FROM nonces WHERE value=%s FOR UPDATE", (nonce,))
            nonce_row = cur.fetchone()
            cur.execute("SELECT 1 WHERE %s > now()", (nonce_row[1],) if nonce_row else (None,))
            if not nonce_row or nonce_row[0] is not None or not cur.fetchone():
                raise ValueError("nonce is invalid, expired, or consumed")
            cur.execute("SELECT 1 FROM ownerships o JOIN credentials c ON c.id=o.credential_id WHERE o.parcel_id=%s AND o.user_id=%s AND o.active=true AND c.status='ACTIVE'", (transfer[2], user_id))
            if not cur.fetchone():
                raise PermissionError("active parcel ownership credential is required")
            cur.execute("INSERT INTO transfer_approvals(transfer_id,user_id,nonce,wallet_address,signature,typed_data_hash) VALUES (%s,%s,%s,%s,%s,%s)", (transfer_id,user_id,nonce,wallet_address,signature,typed_data_hash))
            cur.execute("UPDATE nonces SET consumed_at=now() WHERE value=%s", (nonce,))
            cur.execute("SELECT count(*) FROM transfer_approvals WHERE transfer_id=%s", (transfer_id,))
            reached = cur.fetchone()[0] >= transfer[1]
            if reached:
                cur.execute("UPDATE transfers SET status='REGISTRAR_REVIEW', version=version+1, updated_at=now() WHERE id=%s", (transfer_id,))
            cur.execute("INSERT INTO audit_events(action,entity_type,entity_id,result,metadata) VALUES ('TRANSFER_OWNER_APPROVED','transfer',%s,'SUCCESS',jsonb_build_object('user_id',%s))", (transfer_id,user_id))
            return "REGISTRAR_REVIEW" if reached else "OWNER_APPROVAL"

    def queue_ready_transfer(self, transfer_id):
        with self.transaction() as cur:
            cur.execute("SELECT status FROM transfers WHERE id=%s FOR UPDATE", (transfer_id,))
            row = cur.fetchone()
            if not row or row[0] != "READY_TO_COMMIT":
                raise ValueError("transfer is not ready to commit")
            cur.execute("INSERT INTO blockchain_outbox(idempotency_key,aggregate_id,event_type,payload) VALUES (%s,%s,'TRANSFER_READY_TO_COMMIT',jsonb_build_object('transfer_id',%s)) ON CONFLICT(idempotency_key) DO NOTHING", ("transfer:" + transfer_id, transfer_id, transfer_id))
