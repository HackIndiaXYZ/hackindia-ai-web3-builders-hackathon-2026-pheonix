# Integration Test Results

## Passed

- Backend regression suite: 110 passed, 2 skipped.
- Frontend adapter suite: 3 passed.
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

- Remaining fixture references are isolated tooling only; see `FINAL_INTEGRATION_VERIFICATION.md`.
- Backend identity remains demo-directory based by design; external Aadhaar/OTP and institutional MFA are integration boundaries, not implemented providers.
