# System Contract Audit

## Current execution paths

- Authentication: portal pages -> `AuthContext` -> backend `/api/auth/login` after the live-auth integration. The backend remains demo-directory based and accepts username/role, not email/password.
- Parcel reads: portal pages currently use UI fixtures; backend exposes `/api/properties` and `/api/properties/<ulpin>` backed by PostgreSQL in production.
- V2 transfers: backend API -> `PostgresV2Repository` -> PostgreSQL -> outbox -> MST. Several portal pages still do not call this path.
- Timeline/integrity: backend services consume PostgreSQL projections and indexed blockchain events. Frontend pages still commonly use fixture history.
- Audit/notifications: backend has `/api/audit`, `/api/audit/search`, and `/api/notifications`; frontend portal pages currently use localStorage/mock fixtures.
- Blockchain: backend exposes `/api/chain/all`, `/api/verification/<ulpin>`, `/api/ops/blockchain-health`, and `/metrics`; the auditor blockchain page renders hardcoded block rows.

## Contract status

| Area | Status | Main mismatch |
|---|---|---|
| Auth | PARTIAL | Frontend role forms expect badge/email/password; backend accepts username/role. |
| Parcels | PARTIAL | Frontend expects title/locality/district/history objects; API returns ULPIN/current owner/transfer history. |
| Transfers | PARTIAL | Frontend expects `request_id` and fixture statuses; API returns `transfer_id` and workflow statuses. |
| Notifications | PARTIAL | Frontend expects title/severity/action; API returns event type/message/read. |
| Audit | PARTIAL | Frontend expects actor ID/details/role; API returns actor/detail/result. |
| Blockchain | BROKEN in auditor portal | UI uses hardcoded blocks instead of `/api/chain/all` or health data. |
| Timeline | PARTIAL | Backend has transaction/block/confirmation fields, but fixture-driven pages do not consume them. |
| Metrics | PARTIAL | Backend `/metrics` exists; no portal view consumes it. |

## Database alignment gaps

- UI-only fields such as title number, locality, district, land use, risk summaries, and mortgage presentation are not consistently present in the operational API.
- PostgreSQL is authoritative for V2 workflow state, but frontend reads do not consistently use the repository-backed endpoints.
- Backend transfer DTOs need stable `created_at`, owner IDs, and normalized status metadata for the portal contract.

## Blockchain alignment gaps

- MST indexed events contain transaction hash, block number, event type, timestamp, and hash-only ownership proof.
- Some frontend screens still expect miner, gas, consensus, and block-dashboard fields that are not part of the MST title-record contract.
- Verification and timeline APIs expose proof data, but fixture pages do not render it.
