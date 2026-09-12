# Mock Dependency Report

| Source | Used by | Live replacement |
|---|---|---|
| `frontend/src/data/land-registry-ui-mock-data.json` | Explorer, citizen, registrar, bank, auditor pages | `/api/properties`, parcel detail, workspace, report, timeline, and verification APIs |
| `frontend/src/services/mockAuth.js` | Portal authentication and workspace switching | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` |
| `frontend/src/lib/store.js` | Transfers, notifications, audit, nonce/local session state | `/api/v2/transfers`, `/api/notifications`, `/api/audit`, server-side EIP-712 challenges and Redis/PostgreSQL sessions |
| `frontend/src/pages/auditor/AuditorBlockchain.jsx` hardcoded blocks | Auditor blockchain page | `/api/chain/all`, `/api/ops/blockchain-health`, indexed MST events |
| `frontend/src/pages/*` direct fixture imports | Most portal dashboards and tables | Shared live data adapter to be wired into existing components |
| `frontend/src/App.legacy.jsx` local token/session | Legacy route only | Current `AuthContext` and backend sessions |

## Current status

The shared `AuthContext` now uses the backend session API. The remaining fixture and localStorage consumers are not yet removed; they must be migrated page-by-page through a shared live data adapter without changing the existing UX.
