# Updated Architecture - Land Registry V2

This document details the final transition from the demonstration architecture to the V2 production architecture. 

## High-Level Workflow

The transition fully replaces in-memory demonstration storage and mock blockchain simulations with a robust, production-grade Postgres + Live MST Blockchain setup. 

```mermaid
graph TD
    UI[Frontend (React)]
    API[Flask API]
    PG[(PostgreSQL + PostGIS)]
    OB[Durable Outbox]
    IDX[MST Indexer]
    MST[Live MST Blockchain]
    
    UI -->|Create Transfer, Approve| API
    API -->|Write State| PG
    API -->|Queue Event| OB
    OB -->|Submit Transaction| MST
    MST -->|Confirm| OB
    IDX -->|Replay Blocks| MST
    IDX -->|Write Event| PG
    OB -->|Verify Event & Update Ownership| PG
```

## Non-Negotiable Constraints Met
1. **Live MST & Postgres Only**: Mocks and in-memory stores are completely bypassed when `DATABASE_URL` is set.
2. **Zero Plaintext Private Keys**: The backend introduces the `MSTSigner` abstraction (`DevelopmentSigner` for environment variables, `ProductionSecureSigner` for KMS). 
3. **Frontend Independence**: The frontend signs `EIP-712` payloads directly using `ethers.js` acting as an internal simulated wallet. No secret key material is ever transmitted.
4. **Registrar Separation**: Registrars approve and initiate the V2 Outbox flow; they never sign on behalf of the owner.
5. **Durable Finality**: Finality is achieved entirely through the `outbox_worker_daemon.py` and `indexer_worker_daemon.py`. Ownership changes occur *only* after `MSTIndexer` confirms the event and writes it to `blockchain_events`.

## Component Details
### 1. `PostgresV2Repository`
Acts as the single source of truth for the workflow state machine: `DRAFT -> OWNER_APPROVAL -> REGISTRAR_REVIEW -> READY_TO_COMMIT -> MST_SUBMITTED -> MST_PENDING_CONFIRMATION -> COMPLETED`.

### 2. Outbox & Indexer Daemons
- **Outbox Worker**: Polling `blockchain_outbox`, idempotently submits to MST, stores the `tx_hash`, waits for confirmation, runs the indexer for the block, and verifies finality before updating PostgreSQL ownerships.
- **Indexer Worker**: Continually polls for new blocks and syncs them to `blockchain_events` to ensure no events are missed.

### 3. EIP-712 Wallet Signatures
Both wallet linking and transfer approvals utilize typed signatures. Challenges are stored in `signing_challenges`, linked to `credentials`, and recovered cleanly to authenticate identity without passwords.
