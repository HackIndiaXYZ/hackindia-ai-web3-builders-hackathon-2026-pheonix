# Authorization

Authorization is evaluated server-side as identity, assigned role, parcel
relationship, active credential and workflow state. Owners must use an
EIP-712 `LAND_REGISTRY_TRANSFER_APPROVAL` signature bound to one transfer.
Registrars cannot approve until the parcel threshold is met; buyers cannot
accept before registrar approval. A frozen or expired transfer cannot proceed.
