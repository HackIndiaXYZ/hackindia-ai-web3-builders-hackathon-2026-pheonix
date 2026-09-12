# Frontend Backend Contract Report

## Canonical live endpoints

| Screen group | Target API | Auth | Status before migration |
|---|---|---|---|
| Public explorer | `GET /api/properties` | Public | PARTIAL: fixture-driven |
| Parcel detail | `GET /api/properties/<ulpin>` | Public | PARTIAL |
| Timeline | `GET /api/parcels/<ulpin>/timeline` | Public | PARTIAL |
| Ownership graph | `GET /api/parcels/<ulpin>/ownership-graph` | Public | PARTIAL |
| Integrity/insights | `GET /api/parcels/<ulpin>/integrity`, `/insights` | Public | PARTIAL |
| Verification | `GET /api/verification/<ulpin>` | Public | PARTIAL |
| Transfers | `/api/v2/transfers*` | Role protected | BROKEN in fixture pages |
| Notifications | `GET /api/notifications` | Authenticated | BROKEN in fixture pages |
| Audit | `/api/audit`, `/api/audit/search` | Auditor/registrar | BROKEN in fixture pages |
| Registrar workspace | `GET /api/workspaces/registrar` | Registrar | PARTIAL |
| Nominee workspace | `GET /api/workspaces/nominee` | Nominee/buyer | PARTIAL |
| Bank report | `GET /api/reports/parcel/<ulpin>` | Bank/auditor/registrar | PARTIAL |
| Blockchain | `/api/chain/all`, `/api/ops/blockchain-health` | Public/role protected | BROKEN in auditor page |

## Field reconciliation

| Frontend field | Backend field | Database source | MST source | Transformation | Status |
|---|---|---|---|---|---|
| `request_id` | `transfer_id` | `transfers.id` | `raw_event.transfer_id` | Normalize API `transfer_id` to UI request identifier | TRANSFORMED |
| `ulpin` | `ulpin` / `parcel_id` | `parcels.ulpin` | `blockchain_events.parcel_id` | None | MATCHED |
| `owners[].share_percent` | `owners[].share_percent` | `ownerships.share_bps / 100` | `ownership_shares` | Convert basis points to percent | TRANSFORMED |
| `history` | `transfer_history` plus timeline events | `parcels.transfer_history`, `audit_events` | `blockchain_events` | Normalize event names and proof metadata | TRANSFORMED |
| `title_health_score` | `title_health.score` / insights score | disputes, encumbrances, frozen | None | Use backend score | TRANSFORMED |
| `tx_hash` | `tx_hash` / `blockchain_tx` | `blockchain_events.tx_hash` | MST transaction hash | None | MATCHED |
| `block_number` | `block_number` | `blockchain_events.block_number` | MST block | None | MATCHED |
| `miner`, `gasUsed`, `consensus` | Unsupported | None | Not exposed by MST title adapter | Do not render | UNSUPPORTED_BY_MST |
| `notification.title` | `event_type` | `notifications.event_type` | None | Presentational label only | TRANSFORMED |
| `notification.severity` | No canonical field | None | None | Must not infer critical meaning | MISSING_BACKEND |
| `audit.actor_id` | `actor` / `actor_label` | `audit_events.actor_label` | None | Normalize actor | TRANSFORMED |
| `audit.details` | `detail` / `metadata` | `audit_events.metadata` | None | JSON stringify for table | TRANSFORMED |
| `district`, `locality`, `title_number`, `land_use` | Not consistently exposed | Not present in current operational parcel schema | None | Remove from live display or add schema later | MISSING_BACKEND |

## Authentication

The backend is authoritative for roles. The frontend must store only the opaque session token and returned username/role metadata. Email/password, Aadhaar, OTP, and DigiLocker remain identity-provider boundaries, not client-side mock logic.
