# Database

`backend/migrations/001_v2_operational_schema.sql` is the canonical,
versioned PostgreSQL/PostGIS operational schema. `backend/schema_postgres.sql`
is retained only as a compatibility pointer. Production workflow transitions
must run inside one database
transaction: approval, nonce consumption, audit event and outbox insertion
succeed or fail together. The current in-memory V2 repository exists only for
offline demo/test operation until a provisioned PostgreSQL service is supplied.

`PostgresV2Repository.record_owner_approval()` demonstrates the required
transaction boundary: `FOR UPDATE` locks the transfer and nonce, inserts the
approval, consumes the nonce, updates the state and creates the audit record
atomically. `queue_ready_transfer()` inserts the idempotent outbox event.
