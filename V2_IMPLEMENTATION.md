# Land Registry V2 — Implementation Record

Last updated: 12 September 2026

## Delivered in this iteration

- Added V2 parcel projections: joint owners, percentage shares, an approval
  threshold, nominees, encumbrances, disputes, and parcel freeze state.
- Seeded `UP-0001-CLEAN` as a jointly owned parcel (50/30/20) requiring all
  three owner approvals. Legacy parcels transparently project to one active
  owner with a 1-of-1 policy.
- Added a transfer workflow projection with the states required for the demo:
  `OWNER_APPROVAL`, `REGISTRAR_REVIEW`, `BUYER_ACCEPTANCE`, and
  `READY_TO_COMMIT`. It records each party's approval and does not permit a
  registrar approval before the owner threshold is met.
- Added V2 endpoints:
  - `POST /api/v2/transfers`
  - `GET /api/v2/transfers/<transfer_id>`
  - `POST /api/v2/transfers/<transfer_id>/approve`
  - `GET /api/parcels/<ulpin>/title-health`
  - `POST /api/parcels/<ulpin>/freeze`
  - `GET /api/audit`
- Added audit events for V2 transfer creation/approvals and parcel
  freeze/unfreeze actions.
- Removed browser-controlled role selection. The demo server resolves a role
  from a small identity directory; production must replace it with authorized
  UIDAI/institutional authentication.
- Preserved the original fraud assessment and commit endpoints for backwards
  compatibility. They now reject frozen parcels and keep V2 ownership fields
  synchronized after legacy commits.

## Continued V2 delivery

- Added expiring, single-use EIP-712 wallet-link challenges. The backend
  recovers the signer from the typed-data signature and activates only the
  matching public wallet credential; private keys never reach the backend.
- Added per-recipient transfer notifications. Creating a transfer alerts all
  sellers; opening a succession case alerts the nominee.
- Added controlled succession cases: a nominee must already be registered,
  a case begins as `EVIDENCE_REQUIRED`, and only a registrar can set it to
  `VERIFIED`. Verification is not automatic inheritance.
- Added a privacy-safe public verification endpoint. It reports only title
  status, history count, title health and anchoring state — never owner names,
  wallet addresses or documents.
- Added an outbox projection when a transfer reaches `READY_TO_COMMIT`.
  This provides the exact handoff point for the future MST worker.
- Added the **Approval Workflow** UI. It lets the demo exercise the ordered
  co-owner → registrar → buyer authorization lock.
- Owner approvals now require a separate transaction-specific EIP-712
  `LAND_REGISTRY_TRANSFER_APPROVAL` signature. The signer, exact transfer,
  parcel, buyer, hashes, domain, nonce and expiry are verified before the
  approval is recorded; direct owner approval is rejected.
- The registrar submission endpoint now returns `202` and only transitions to
  `MST_SUBMITTED`. `backend/outbox_worker.py` is the only path that can move
  through `MST_PENDING_CONFIRMATION` to `COMPLETED` after a confirmed adapter
  receipt. API submission is never represented as blockchain completion.
- Added credential recovery states: a recovery request preserves ownership,
  revokes the prior credential only after registrar review, and requires a new
  wallet link. Added successor activation after a verified succession case and
  active nominee credential.
- Added `contracts/LandRegistryV2.sol`, an isolated V2 contract reference that
  enforces owner-share totals, threshold approvals, active credentials, freeze
  state, expiry, registrar approval and buyer acceptance on-chain.

Additional API endpoints:

- `POST /api/wallets/challenge`, `POST /api/wallets/verify`
- `GET /api/notifications`
- `POST /api/succession`, `POST /api/succession/<case_id>/verify`
- `GET /api/verification/<ulpin>`
- `POST /api/v2/transfers/<transfer_id>/submit`
- `POST /api/v2/transfers/<transfer_id>/approval-challenge`
- `POST /api/v2/transfers/approve-signature`
- `POST /api/credentials/recovery`, `POST /api/credentials/recovery/<id>/approve`
- `POST /api/succession/<case_id>/activate`

## Important architecture boundary

This repository still uses in-memory operational storage and the existing
mock/live chain adapter. `backend/v2_registry.py` is intentionally a repository
shaped projection, not a claim that PostgreSQL/outbox persistence is complete.
Before production, move transfers, approvals, audit events, nonces, document
metadata and outbox rows into PostgreSQL in one transaction; have a worker
submit only `READY_TO_COMMIT` records to MST and persist confirmation.

Private keys, raw Aadhaar values and document bodies must never be stored in
these records or placed on-chain. Store only registered public wallet
addresses and hashes/references.

## Demo identities

`registrar_noida2` (Registrar), `Rajesh Kumar` / `Suresh Kumar` / `Anita Singh`
(Owner), `buyer1` (Buyer), `bank1` (Bank), and `auditor1` (Auditor).

## Remaining production integrations

1. PostgreSQL/PostGIS repository and durable outbox worker persistence, plus
   MST event indexer/checkpoint replay.
2. HSM/institutional registrar signer and credential lifecycle persistence.
3. Smart-contract V2 invariants: multi-owner shares, threshold authorization,
   freeze, credential state and succession events.
4. Secure document storage, UIDAI-authorized authentication and institutional
   MFA integration.
5. Production map layer, title timeline, bank reports and auditor workspace.

## Final project-completion update

The repository now contains runnable demo equivalents for the remaining
product surfaces:

- `POST /api/v2/documents` stores private demo evidence, applies a size/type
  allow-list and returns an SHA-256 integrity hash. The storage directory is
  ignored by Git.
- `backend/schema_postgres.sql` defines the PostgreSQL/PostGIS operational
  model for users, roles, wallets, parcels, ownerships, transfers, signed
  approvals, documents, audit events and blockchain outbox records.
- `backend/blockchain/mst_client.py` is the explicit MST integration boundary;
  it refuses use until a deployment supplies an approved provider/signer.
- The **Cadastral Map** screen supports parcel exploration and routes to the
  title detail; **Verification & Audit** provides bank-safe verification and
  an auditor/registrar audit explorer.
- `.env.example` documents required deployment configuration without exposing
  any secret material.

The only items not executable inside this repository are systems requiring
external authority or infrastructure: an authorized UIDAI connection,
institutional MFA/HSM, a provisioned PostgreSQL/PostGIS instance, secure
object-storage account, and MST network/provider credentials. Their required
boundaries, schema and configuration are now present; provision those services
and replace the demo adapters before a production deployment.

## Security and workflow hardening update

An architecture audit is recorded in `docs/architecture.md`; companion
documents now cover authorization, wallet security, blockchain confirmation,
database consistency, succession/recovery, title history, deployment and the
threat model. `backend/test_v2_security.py` adds executable checks for valid
EIP-712 signer recovery, nonce replay rejection and registrar threshold
enforcement. The full pytest suite remains pending installation of the pinned
`pytest` dependency in this environment; frontend production builds and Python
syntax checks have been run successfully.

## Supabase/PostgreSQL migration update

The canonical database schema is now versioned at
`backend/migrations/001_v2_operational_schema.sql`; it enables PostGIS and
contains the operational tables requested for identities/roles/sessions,
wallets/credentials, parcel geometry/ownership, transfers/approvals/nonces,
documents, succession, notifications, audit, outbox and indexed blockchain
events. `backend/migrate.py` reads `DATABASE_URL` from the environment and
applies the migration without hardcoded credentials.

`backend/postgres_repository.py` provides the production transaction boundary
for owner approvals: it locks the transfer and nonce, verifies active
ownership credential, persists signature metadata, consumes the nonce, updates
the workflow, and writes an audit event atomically. It also inserts idempotent
outbox rows. The in-memory V2 registry remains the development adapter until a
Supabase service is provisioned and wired as the active repository.

Security middleware now removes wildcard CORS, supports an explicit
`ALLOWED_ORIGIN`, applies baseline CSP/HSTS/referrer/frame/content-type and
permissions headers, and limits requests per source per minute. Production
should replace the process-local limiter with a shared Redis/Supabase-backed
limiter and use secure HTTP-only cookie sessions or a managed IdP.

## Land intelligence phase update

`TitleTimelineService` and `OwnershipGraphService` now combine archival title
records, V2 workflow records and blockchain events into an explicit-source
timeline and ownership lineage graph. APIs are available at
`GET /api/parcels/<ulpin>/timeline` and
`GET /api/parcels/<ulpin>/ownership-graph`; the parcel detail UI renders a
filterable, expandable chain-of-title and current-owner lineage view.

New role-gated operational endpoints provide registrar queues, nominee data
and JSON title reports for banks/auditors/registrars:

- `GET /api/workspaces/registrar`
- `GET /api/workspaces/nominee`
- `GET /api/reports/parcel/<ulpin>`

The PostgreSQL activation plan is in `docs/next_phase_plan.md`. A live
`DATABASE_URL` and Supabase service are still required before the development
registry can be replaced as the active runtime store; forcing a partial switch
would break existing V2 APIs, so it is deliberately guarded as an incremental
migration rather than falsely claimed as live persistence.
