# Updated Architecture

```text
Vedant portal UX
      |
Shared frontend API/data adapters
      |
Flask routes and role authorization
      |
PostgresV2Repository + PostgreSQL/PostGIS + Redis
      |
Durable outbox worker
      |
MST immutable hash-only title records
```

The browser must not own transfers, approvals, notifications, audit events,
nonces, or authoritative sessions. Browser localStorage may contain only an
opaque session token and non-authoritative UI preferences. Mock fixture data is
restricted to tests and explicit offline development.

Unsupported MST concepts such as miner, gas, and consensus are not part of the
contract and must not be fabricated in the auditor portal.
