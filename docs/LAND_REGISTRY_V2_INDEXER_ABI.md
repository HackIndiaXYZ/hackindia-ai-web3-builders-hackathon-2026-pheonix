# LandRegistryV2 indexer contract

The MST EVM indexer must subscribe to `LandRegistryV2` at `MST_CONTRACT_ADDRESS` and only mark a transfer finalized after a confirmed `TransferExecuted` log.

## Finalization event

`TransferExecuted(bytes32 indexed transferId, bytes32 indexed parcelId, bytes32 indexed previousOwnershipHash, bytes32 newOwnershipHash, bytes32 documentHash, bytes32 assessmentHash, address buyer, uint64 nonce, uint8 threshold, address[] previousOwners, uint16[] previousShares, address[] newOwners, uint16[] newShares, uint64 timestamp)`

Persist the transaction hash, block number, `transferId`, `parcelId`, evidence hashes, ownership snapshots/shares, nonce, and timestamp. This event is the sufficient proof that the owner threshold, registrar approval, buyer acceptance, expiry, and freeze checks all passed on-chain.

## Lifecycle logs

- `TransferInitiated`: persist transfer id, parcel id, nonce, expiry, prior/proposed ownership hashes, proposed owners/shares, document hash, assessment hash.
- `OwnerApproved`, `RegistrarApproved`, `BuyerAccepted`: append immutable workflow evidence; do not mark complete.
- `TransferCancelled`: transition the indexed transfer to cancelled or expired according to its reason hash.
- `CredentialUpdated` and `ParcelFrozen`: update the parcel projection.

All identities are addresses and opaque credential IDs; no PII or documents are emitted. The full ABI is generated at `contracts/artifacts/src/LandRegistryV2.sol/LandRegistryV2.json` by `npm run compile`.
