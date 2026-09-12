# API Field Matrix

| Endpoint | Request | Response | Frontend consumers | DB source | Blockchain source | Status |
|---|---|---|---|---|---|---|
| `GET /api/properties` | none | parcel list | Explorer/map/portal lists | `parcels`, `ownerships`, `nominees` | none | PARTIAL |
| `GET /api/properties/<ulpin>` | path ULPIN | parcel + `onchain_commits` | Parcel detail | parcel projection | legacy/MST events | PARTIAL |
| `GET /api/parcels/<ulpin>/timeline` | path, optional `q` | normalized timeline | timeline views | transfer/audit history | blockchain events | MATCHED |
| `GET /api/parcels/<ulpin>/ownership-graph` | path | nodes/edges | ownership graph | ownership projection | event lineage | MATCHED |
| `GET /api/parcels/<ulpin>/integrity` | path | score/findings | verification | parcel/transfers/audit | indexed events | MATCHED |
| `GET /api/parcels/<ulpin>/insights` | path | intelligence metrics | title intelligence | parcel/audit | none | MATCHED |
| `POST /api/v2/transfers` | parcel, buyer, hashes | transfer DTO | transfer creation | transfers/sellers/audit/outbox | none | MATCHED |
| `POST /api/v2/transfers/<id>/approval-challenge` | transfer ID | EIP-712 challenge | wallet approval | signing challenges | none | MATCHED |
| `POST /api/v2/transfers/approve-signature` | challenge/signature | transfer DTO | wallet approval | approvals/nonces/audit | none | MATCHED |
| `POST /api/v2/transfers/<id>/submit` | transfer ID | queued transfer | registrar submit | transfers/outbox | none | MATCHED |
| `GET /api/notifications` | auth | notifications | notification center | notifications | none | PARTIAL |
| `GET /api/audit` | auth role | audit events | audit portal | audit_events | optional tx detail | PARTIAL |
| `GET /api/reports/parcel/<ulpin>` | path/auth | report JSON | bank/auditor | all title tables | blockchain events | MATCHED |
| `GET /api/chain/all` | none | blockchain activity | blockchain explorer | indexed/adapter events | MST | PARTIAL |
| `GET /api/ops/blockchain-health` | auth role | health snapshot | operations | outbox/checkpoints | MST RPC | MATCHED |
| `GET /metrics` | none | Prometheus text | monitoring | aggregate queries | aggregate fields | MATCHED |
