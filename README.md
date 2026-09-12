# Parcel Register — Land Title Verification Portal

AI fraud detection + on-chain chain-of-custody for land title registration and
transfer. Built for HackIndia Spark 5 (AI + Web3 track).

A React SPA with routing, authentication and role-based access control, talking
to a Flask backend with a rule-based fraud engine, real OCR, and a blockchain
adapter that runs either in-memory (default) or against a real deployed Solidity
contract.

---

## The one thing to understand about this project

**The fraud engine's verdict is enforced on the server, not in the UI.**

Assessing a transfer (`POST /api/transfers`) issues an `assessment_id`.
Committing a transfer on-chain (`POST /api/transfers/<ulpin>/commit`) *requires*
that id, and the server re-checks it before writing anything:

- it must exist, and match the parcel and the buyer it was issued for
- the seller it was assessed against must still be the registered owner
  (otherwise the parcel moved underneath the verdict and it's stale)
- it is single-use — one fraud check authorises exactly one write
- it expires after 30 minutes
- a `HIGH_RISK` verdict is refused outright unless a registrar sends
  `override=true` **with** a written `override_reason`

A `curl` straight at the API is subject to all of this. Hiding the commit button
in the UI is not the control; this is.

That flows through to the chain. `LandRegistry.sol` takes an `aiVerified`
boolean meaning "the off-chain fraud engine cleared this transfer." It is now
set honestly: `true` only for a clean auto-approval, `false` for anything a
human waved through. Overrides are permanently visible in the event log, shown
as an `OVERRIDE` badge in the Blockchain Explorer. A parcel whose most recent
committed transfer was an override cannot be issued a "Verified Clean Title"
certificate at all.

See `backend/assessment_store.py` for the full rule set.

---

## What's actually running

```
backend/
  app.py                   Flask API — auth-gated writes, public reads, serves the frontend
  auth.py                   Role-based session auth (Registrar/Bank/Buyer/Auditor)
  validation.py              Payload validation — every bad request is a 400, never a 500
  assessment_store.py         The commit gate: links "we ran a fraud check" to "we wrote to chain"
  fraud_engine.py              5 fraud rules: duplicate ownership, area mismatch,
                                backdating, transfer velocity, spatial boundary overlap
  gis_check.py                  Pure-Python polygon overlap detection (SAT)
  ocr_pipeline.py                Real OCR (Tesseract via pytesseract)
  risk_report.py                  Plain-English risk reports — deterministic template,
                                   or grounded Claude narration if ANTHROPIC_API_KEY is set
  mock_chain.py                    In-memory chain (default)
  chain_client.py                   Real web3.py client — identical signatures (CHAIN_MODE=live)
  data/properties.json               7 seeded parcels
  data/pending_transfers.json         8 transfer requests covering every rule
  sample_docs/                         2 generated sample deed images
  conftest.py / test_*.py               pytest suite

contracts/
  LandRegistry.sol          Solidity — registerParcel, registerTransfer, mintCertificate
  hardhat.config.js / package.json / scripts/deploy.js / test/*.test.js

frontend/
  src/App.jsx               Layout shell: sidebar + top bar + route transitions
  src/main.jsx               Entry point
  src/pages/                  Dashboard, Registry, ParcelDetail, RegisterParcel,
                               Transfer, BlockchainExplorer, Login
  src/components/               Sidebar, TopBar, StatusBadge, EventBadge, BoundaryOverlapSVG
  src/hooks/                     useAuth, useHashRoute
  src/lib/api.js                  Shared fetch helpers (same-origin)
  dist/bundle.js                   Compiled output — this is what loads
  index.html                        Shell page + CSS
```

## API

Public reads:

| Endpoint | Purpose |
|---|---|
| `GET /api/config` | chain mode, whether LLM reports are on, thresholds |
| `GET /api/properties` | every parcel |
| `GET /api/properties/<ulpin>` | one parcel + its on-chain history |
| `GET /api/chain/all` | full blockchain activity feed |
| `GET /api/stats` | dashboard summary |
| `POST /api/transfers` | submit a transfer, get a risk assessment + `assessment_id` |
| `POST /api/documents/upload` | OCR a scanned deed |
| `GET /api/demo/run-all` | run every seeded scenario at once |

Auth: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.

Registrar-only (`Authorization: Bearer <token>`):
`POST /api/properties`, `POST /api/transfers/<ulpin>/commit`,
`POST /api/properties/<ulpin>/mint-certificate`, `POST /api/demo/reset`.

## Running it

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python app.py          # use python3 on macOS/Linux
```

**Frontend** — build the bundle once (or after any source change):
```bash
cd frontend
npm install
npm run build          # npm run watch to rebuild on save
```

Then open **http://localhost:5000** — Flask serves the built frontend from the
same origin, so there is one process, one URL, and no CORS to think about.

OCR needs the Tesseract *binary*, not just the Python package:

| OS | Command |
|---|---|
| Windows | `winget install UB-Mannheim.TesseractOCR` |
| macOS | `brew install tesseract` |
| Ubuntu/Debian | `sudo apt-get install tesseract-ocr` |

Everything except the OCR upload endpoint works without it; that one endpoint
returns a 503 with install instructions rather than taking the server down.

Tailwind loads from the official Play CDN in `index.html`, so the browser
opening the page needs internet access. **If you are demoing somewhere with
unreliable wifi, download Tailwind ahead of time** and point `index.html` at a
local copy — the styling is the one piece with an external runtime dependency.

## The AI risk report

`risk_report.py` produces the plain-English explanation shown with every
assessment. By default it's a deterministic template with no API key and no
network call.

Set `ANTHROPIC_API_KEY` and it instead asks Claude to narrate the report. The
grounding contract is strict, and deliberately so:

1. The model receives only the flags the rule engine already computed, and is
   instructed to narrate exactly those — it never re-derives the reasoning.
2. The score, status and flag codes shown to the user come from the rule engine.
   The narration is presentation only and cannot change a verdict.
3. `_verify_grounding()` rejects any response that cites a fraud code the engine
   didn't raise, or that contradicts the computed status (e.g. telling a
   registrar to proceed on a HIGH_RISK transfer).
4. Any failure — missing package, bad key, timeout, network blip, failed
   grounding check — silently falls back to the template.

So the worst case with the LLM enabled is slightly less polished prose, never a
broken page or a changed verdict. The API response includes
`explanation_source: "claude" | "template"` and the UI labels it, because a
registrar should always know which one they're reading.

Tunable via `RISK_REPORT_MODEL` and `RISK_REPORT_TIMEOUT`.

## Tests

```bash
cd backend
python -m pytest -q
```

Covers the fraud rules (including all 8 seeded scenarios end to end), the SAT
overlap math, payload validation, and the API — with specific regression tests
for the commit gate: that a HIGH_RISK commit is refused server-side, that an
assessment can't be replayed, that an override records `ai_verified=false`, that
an assessment goes stale when the parcel changes hands, and that an
override-tainted parcel can't be certified.

Contract tests: `cd contracts && npm install && npx hardhat test`.

## The demo script

1. **Dashboard** — click "Run all seeded scenarios," watch the stat cards and
   status breakdown update.
2. **Registry** — search the full database, click into
   `UP-0003-DUPLICATE-TARGET` for its complete chain of custody.
3. **Log in** as a Registrar — "Register Parcel" was gated behind a banner
   before login and unlocks now.
4. **Register a new parcel**, then try one whose boundary overlaps
   `UP-0001-CLEAN` (`[[20,10],[45,10],[45,25],[20,25]]`) — the
   double-registration check rejects it with a real overlap-area estimate.
5. **Transfer** — upload `backend/sample_docs/sample_deed_duplicate_fraud.png`,
   watch OCR pre-fill the form, run the fraud check, watch it get blocked with
   the exact reasoning.
6. **Try to commit it anyway** — this is the moment worth showing. The commit is
   refused *by the server*. Then override it with a written reason and show the
   `OVERRIDE` badge it leaves in the explorer, and that the parcel can no longer
   be certified.
7. Submit a clean transfer, commit it, mint a Verified Clean Title certificate.
8. **Blockchain Explorer** — every event from steps 4–7 in one immutable feed.
9. **Log out** — "Register Parcel" is gated again.

`POST /api/demo/reset` (as a registrar) restores the seed data so you can run it
again without restarting. It deliberately does *not* rewind the chain — on a real
chain you couldn't, and pretending otherwise would misrepresent the whole point.

## Seeded scenarios

| Request | Parcel | Expected | Why |
|---|---|---|---|
| REQ-01 | UP-0001-CLEAN | AUTO_APPROVED | clean |
| REQ-02 | UP-0003-DUPLICATE-TARGET | HIGH_RISK | seller already sold it in 2023 |
| REQ-03 | UP-0004-BACKDATE-TARGET | HIGH_RISK | dated before the seller acquired it |
| REQ-04 | UP-0005-CLEAN | FLAGGED | 20% area mismatch (0.35) |
| REQ-05 | UP-0006-VELOCITY-TARGET | FLAGGED | 3rd transfer in 60 days (0.35) |
| REQ-06 | UP-0002-CLEAN | AUTO_APPROVED | clean |
| REQ-07 | UP-0007-FLAGGED-TARGET | FLAGGED | 8% area (0.2) + velocity (0.35) = 0.55 |
| REQ-08 | UP-0001-CLEAN | HIGH_RISK | redrawn survey encroaches on UP-0002 |

Thresholds: below 0.25 auto-approves, 0.25–0.59 is flagged for manual review,
0.60+ or any single "hard" flag is high risk.

> **Note on dates:** the velocity scenarios (REQ-05, REQ-07) depend on seeded
> transfer dates falling inside a rolling 60-day window. They are dated relative
> to September 2026. If you run this much later, those two will stop flagging —
> bump the dates in `data/properties.json` and `data/pending_transfers.json`.

## Going live (real blockchain)

Everything above runs on `backend/mock_chain.py` by default.
`backend/chain_client.py` is a real web3.py client for a deployed
`LandRegistry` contract on Polygon Amoy, with **identical function signatures** —
switching is one environment variable (`CHAIN_MODE=live`) plus a deployed
address. See [`LIVE_CHAIN_SETUP.md`](./LIVE_CHAIN_SETUP.md).

That setup file has you put a wallet private key in `contracts/.env`. The root
`.gitignore` excludes `.env` for exactly that reason — use a throwaway testnet
wallet, never a real one.

## V2 PostgreSQL / Supabase migration

The offline demo remains the default. For a production-shaped deployment, set
the server-only `DATABASE_URL` supplied by Supabase, install the backend
requirements, then run:

```bash
cd backend
python migrate.py
```

The canonical schema is versioned in `backend/migrations/`. See
[`docs/architecture.md`](./docs/architecture.md) and
[`V2_IMPLEMENTATION.md`](./V2_IMPLEMENTATION.md) for migration boundaries.
Never put `DATABASE_URL`, UIDAI credentials, registrar signing keys, or object
storage credentials in the frontend.

## Where to extend next

1. **Deploy the contract to Polygon Amoy** and flip `CHAIN_MODE=live`.
2. **Persist state** — `PROPERTIES`, the session store and the assessment ledger
   are all in-memory and reset with the process. At real scale the assessment
   consume and the parcel write belong in one PostgreSQL transaction, so they
   either both happen or neither does.
3. **Real PostGIS** instead of the pure-Python SAT check, once boundaries are
   real survey coordinates rather than a local planar grid.
4. **Replace the auth stand-in with Aadhaar eSign/DigiLocker** — everything
   downstream (`require_role`, frontend token handling) stays as is.
5. **ML fraud scoring** — `FraudEngine.score_ml()` is the stub, and composite
   scoring already ignores a `None` from it.

**Deliberately not built:** ML scoring (no labeled data yet), Neo4j graph fraud
detection, Kafka, Merkle-batched commits, multi-state config. See the CTO
architecture docs for why these are Phase 3+ concerns.
