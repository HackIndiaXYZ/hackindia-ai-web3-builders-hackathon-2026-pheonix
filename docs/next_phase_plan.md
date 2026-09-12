# Next production phase plan

## Correctness issue before activation

`PostgresV2Repository` currently implements the critical atomic owner approval
and outbox transitions, but not every V2 read/write used by Flask. Replacing
the active `V2Registry` wholesale would make existing succession, notification
and workflow endpoints fail. The activation path is therefore incremental:

1. Apply the migration and seed Supabase.
2. Route transactional transfer approval/outbox writes through PostgreSQL.
3. Port workflow reads, notifications, succession and credential reads.
4. Enable `V2_STORAGE=postgres` only after parity tests pass.

## This iteration

- Build title timeline and ownership graph service contracts.
- Add read APIs and role-specific workspaces.
- Add report JSON exports.
- Add storage and UIDAI-authorized identity interfaces.
- Keep the V2 in-memory registry as the documented development adapter.
