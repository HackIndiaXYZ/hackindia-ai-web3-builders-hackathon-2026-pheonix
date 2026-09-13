# Live MST Transfer Verification

This document verifies the end-to-end processing of a live transfer on the MST testnet, ensuring it strictly adheres to the PostgreSQL + Live MST production mandate.

## Verification Checklist

### 1. Creation & Owner Approval (EIP-712)
- [x] **Wallet Link**: User successfully linked a simulated external wallet (ethers.js), receiving a `credential_ref`. No private key was stored in the backend.
- [x] **V2 Transfer Initiation**: A transfer was created under `OWNER_APPROVAL`.
- [x] **Approval Challenge**: The `/api/v2/transfers/<transfer_id>/approval-challenge` returned a valid EIP-712 payload.
- [x] **Approval Signature**: The frontend signed the payload locally using `ethers.js` and successfully submitted it to `/api/v2/transfers/approve-signature`.
- [x] **Transfer Lock State**: `OWNER_APPROVAL` successfully transitioned to `REGISTRAR_REVIEW`, `BUYER_ACCEPTANCE`, and finally `READY_TO_COMMIT`.

### 2. Outbox Daemon & MST Submission
- [x] **Outbox Submit**: The Registrar clicked "Submit", placing the transfer into `MST_SUBMITTED` state and storing the transfer in `blockchain_outbox`.
- [x] **Worker Claim**: `outbox_worker_daemon.py` claimed the pending row and locked it as `PROCESSING`.
- [x] **Live MST Tx**: The worker invoked `submit_event` using `MSTClient`, sending a secure, zero-value data transaction to the Live MST Ledger.
- [x] **Tx Hash Storage**: The transaction hash was immediately stored in `blockchain_outbox` prior to awaiting finality (`MST_PENDING_CONFIRMATION`), ensuring idempotency against worker crashes.

### 3. Finalization via Indexer Sync
- [x] **Confirmation Wait**: The Outbox Worker polled the MST provider until block confirmations > 0.
- [x] **Indexer Replay**: `MSTIndexer` successfully parsed the event and wrote it to the PostgreSQL `blockchain_events` table.
- [x] **Finality Gate**: `confirm_finality()` in `PostgresV2Repository` verified that a matching row existed in `blockchain_events` before updating ownership.
- [x] **Ownership Transferred**: The `ownerships` table was updated exclusively by PostgreSQL after immutable chain inclusion was mathematically confirmed.

## Conclusion
The live integration confirms that no in-memory storage or mock adapters are active. The Outbox Daemon successfully bridged the SQL state machine with the Live MST Blockchain securely.
