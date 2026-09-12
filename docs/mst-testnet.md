# MST Testnet Integration

## Audit

The legacy `mock_chain.py` and `chain_client.py` adapters remain available for
the original demo API. V2 transfers are created and approved operationally,
then queued in the outbox. `process_v2_outbox_once()` is the only V2 path that
submits a blockchain transaction. The existing PostgreSQL schema stores the
outbox and indexed blockchain events; migration `003_mst_indexer.sql` adds the
replay checkpoint.

## Immutable record

`MSTClient` uses `mst-sdk-python` provider and signer primitives. Because the
published SDK does not expose a title-ledger contract, each title event is a
zero-value self-transaction whose calldata is canonical JSON. The record has
the `land-registry-title-v1` schema and contains only hashes for owners,
registrar, approvals and documents. PostgreSQL remains the operational store.

Supported event types are `PARCEL_CREATED`, `OWNERSHIP_TRANSFERRED`,
`OWNERSHIP_SPLIT`, `OWNERSHIP_MERGED`, `PARCEL_FROZEN`, `PARCEL_UNFROZEN`,
`SUCCESSION_VERIFIED`, and `CREDENTIAL_RECOVERED`.

## Configuration

Set these server-only variables:

```dotenv
MST_RPC_URL=https://testnetrpc.mstblockchain.com
MST_CHAIN_ID=91562037
MST_WALLET_ADDRESS=0x...
MST_PRIVATE_KEY=0x...
```

The client validates the RPC chain ID and signer address. Private keys are not
logged, persisted in PostgreSQL, or sent to the frontend.

## Confirmation and indexing

The worker submits the event, verifies at least one confirmation, invokes the
replayable `MSTIndexer`, and only then advances the transfer to `COMPLETED`.
The indexer stores transaction hash, block height, event type, transfer ID,
timestamp, raw hash-only event data, and a durable block checkpoint. Replaying
the same range is idempotent through the event ID unique constraint.

`GET /api/verification/<ulpin>` reports `MATCHED`, `MISMATCH`, or
`MISSING_ON_CHAIN` for the latest indexed MST ownership record.