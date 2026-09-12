# Architecture audit

The Flask application preserves a legacy single-owner transfer API alongside a
V2 operational projection in `backend/v2_registry.py`. The legacy adapter is
`mock_chain.py` by default and `chain_client.py` for a deployed legacy
contract. V2 adds a separate `LandRegistryV2.sol` reference and an MST adapter
boundary, neither of which is configured by default.

Operational state belongs in PostgreSQL/PostGIS (`schema_postgres.sql`); final
ownership facts belong on MST. The V2 submission endpoint only queues an
outbox event. `outbox_worker.py` is the sole path that submits and confirms a
V2 ownership change. This prevents an HTTP submission from being shown as a
finalized transfer.

Current external-service limitations are explicit: no local PostgreSQL,
authorized UIDAI integration, HSM, or MST provider credentials are present.
Mock-chain confirmations are suitable only for development/testing.

## Supabase migration plan

1. Provision Supabase PostgreSQL and set the server-only `DATABASE_URL`.
2. Run `python backend/migrate.py`; its versioned migration enables PostGIS and
   creates users, roles, sessions, wallet/credential history, ownership,
   workflow, documents, audit, notification, outbox and blockchain-event tables.
3. Seed the demo identities and `UP-0001-CLEAN` through a controlled admin
   migration, then select `PostgresV2Repository` for production writes.
4. Run the outbox worker as a separate process with the protected MST signer.
5. Enable an indexer checkpoint after the deployed V2 contract is confirmed.
