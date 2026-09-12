# Mock Elimination Report

## Migrated sources

- Shared authentication uses backend sessions.
- Explorer parcel data uses `/api/properties`.
- Auditor and registrar audit pages use `/api/audit`.
- Notifications use `/api/notifications`.
- Citizen transfer list uses `/api/v2/transfers`.
- Blockchain auditor view uses `/api/chain/all` and blockchain health.
- Bank title search uses live parcels and no longer renders unsupported fixture fields.

## Remaining isolated fixture tooling

The remaining fixture modules are isolated tooling only: `lib/store.js`,
`services/mockAuth.js`, `lib/mockAuth.js`, and `scripts/verify-engine.js`.
No production portal page imports them. The synthetic sell-token module no
longer imports fixture data or writes browser state; it returns an explicit
unsupported response until a backend endpoint exists.

Unsupported fields are not fabricated: MST miner/gas/consensus, synthetic locality/district/title numbers, synthetic prices, and synthetic notification severity are excluded from migrated views.
