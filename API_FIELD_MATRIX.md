# API Field Matrix (V2)

This matrix outlines the inputs required by the newly established V2 production workflow endpoints, focusing entirely on EIP-712 credential-based flows and robust state machines.

| Endpoint | Method | Role Required | Payload Fields | Description |
|---|---|---|---|---|
| `/api/v2/transfers` | `POST` | `OWNER`, `REGISTRAR` | `parcel_id`, `buyer`, `document_hash` (opt), `assessment_hash` (opt) | Initiates a V2 operational transfer, bypassing in-memory logic. Places transfer in `OWNER_APPROVAL` state. |
| `/api/v2/transfers/<transfer_id>/approval-challenge` | `POST` | `OWNER` | None | Returns an EIP-712 compliant typed data payload for the owner to sign, proving intent to transfer. |
| `/api/v2/transfers/approve-signature` | `POST` | `OWNER` | `challenge_id`, `signature` | Verifies the EIP-712 signature against the wallet address associated with the active credential. Updates transfer state to `REGISTRAR_REVIEW` once all owners approve. |
| `/api/v2/transfers/<transfer_id>/approve` | `POST` | `REGISTRAR`, `BUYER` | None | Advances transfer state for non-owners. `REGISTRAR_REVIEW` -> `BUYER_ACCEPTANCE` -> `READY_TO_COMMIT`. |
| `/api/v2/transfers/<transfer_id>/submit` | `POST` | `REGISTRAR` | None | Submits the `READY_TO_COMMIT` transfer to the Outbox worker (`MST_SUBMITTED`). This initiates the asynchronous durable queue process. |
| `/api/wallets/challenge` | `POST` | `OWNER` | `parcel_id`, `wallet_address` | Generates a challenge to link an EVM wallet address to the user's identity profile. |
| `/api/wallets/verify` | `POST` | `OWNER` | `challenge_id`, `signature` | Verifies the wallet signature, provisioning a `credential_ref` to be used for future authenticated signings. |
| `/api/transfers` | `POST` | *V1 Legacy* | `ulpin`, `seller`, `buyer`, `claimed_area_sqm`, `transaction_date` | Generates an AI-backed risk assessment. Forms the basis of `assessment_hash` in V2. |
