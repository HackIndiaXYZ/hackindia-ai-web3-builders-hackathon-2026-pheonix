# Integration Test Results

## Passed

- Backend focused regression suite: 9 passed.
- Python compilation for modified backend modules: passed.
- Frontend production build: passed with `npm install --legacy-peer-deps`.
- Live authentication context and API client bundle: built successfully.
- Auditor blockchain view: built successfully with live API imports.
- Live explorer parcel API integration: built successfully.
- Live audit, notification, citizen transfer, bank title search, registrar dashboard, and auditor dashboard integrations: built successfully.

## Environment notes

- Plain `npm install` is blocked by the existing peer mismatch between `react-map-gl@7.1.9` and `maplibre-gl@5.24.0`; validation used `--legacy-peer-deps`.
- Docker CLI is unavailable in the current environment.
- No browser/E2E runner was available during this pass.

## Remaining failures/gaps

- A repository-wide search still finds fixture/store consumers in several legacy portal screens; these are documented in `FRONTEND_LIVE_MIGRATION_REPORT.md`.
- No frontend automated test suite is configured.
- Backend identity remains demo-directory based by design; external Aadhaar/OTP and institutional MFA are integration boundaries, not implemented providers.
