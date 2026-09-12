# Frontend Live Migration Report

## Migrated in this pass

- `frontend/src/context/AuthContext.jsx`: live backend sessions; no mockAuth dependency.
- `frontend/src/lib/api.js`: backend auth helpers and correct development port.
- `frontend/src/services/liveData.js`: shared parcel, transfer, notification, audit, workspace, blockchain services and DTO normalization.
- `frontend/src/pages/ExplorerPage.jsx`: live `/api/properties` parcel map data.
- `frontend/src/pages/auditor/AuditorBlockchain.jsx`: live `/api/chain/all` and `/api/ops/blockchain-health`; unsupported miner/gas/consensus rows removed.
- `frontend/src/pages/auditor/AuditorEvents.jsx`: live `/api/audit`.
- `frontend/src/pages/registrar/RegistrarAudit.jsx`: live `/api/audit`.
- `frontend/src/pages/citizen/Notifications.jsx`: live `/api/notifications`; no browser-local notification authority.
- `frontend/src/pages/citizen/Transfers.jsx`: live `/api/v2/transfers`.
- `frontend/src/pages/bank/BankTitleChecks.jsx`: live `/api/properties`; unsupported locality and title-health fixture values removed.
- `backend/postgres_v2_repository.py`: PostGIS boundary geometry is now included in parcel DTOs.
- `backend/app.py`: `GET /api/v2/transfers` added for authenticated transfer lists.

## Remaining isolated fixture tooling

Production portal pages no longer import the fixture JSON, `store.js`, or
`mockAuth.js`. Remaining fixture modules are isolated tooling only:
`lib/store.js`, `services/mockAuth.js`, `lib/mockAuth.js`, and
`scripts/verify-engine.js`. The synthetic sell-token module no longer imports
fixture data or writes browser state; it returns an explicit unsupported
response until a backend endpoint exists.

## Unsupported fields intentionally removed or not rendered

- MST miner, gas-used, consensus, and validator fields.
- Fixture-only locality, district, title number, land-use, synthetic prices, and synthetic severity.
- Notification mark-read mutation is not rendered because no backend mutation endpoint exists.

## Validation

- Frontend production build: passed using `npm install --legacy-peer-deps`.
- Backend focused regression suite: 110 passed, 2 skipped.
- Docker/E2E validation: unavailable in the current environment.
