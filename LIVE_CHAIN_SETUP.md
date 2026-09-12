# Going live: deploying to Polygon Amoy testnet

By default this project runs on `mock_chain.py` — an in-memory simulated
chain, so the whole app works with zero setup. This doc walks through
switching to `chain_client.py`, which makes real transactions against a
real deployed contract on Polygon's Amoy testnet.

You need network access for every step below — none of this can be done
from an offline/sandboxed environment, which is why it wasn't already done
for you.

---

## 1. Get an RPC endpoint

Sign up for a free account at [Alchemy](https://www.alchemy.com/) or
[Infura](https://www.infura.io/), create an app targeting **Polygon Amoy**,
and copy the HTTPS RPC URL it gives you. It looks like:
```
https://polygon-amoy.g.alchemy.com/v2/<your-api-key>
```

## 2. Get a wallet and test funds

- Create a fresh wallet for this project (e.g. `npx hardhat` can generate
  one, or use MetaMask and export the private key — **never use a wallet
  that holds real funds for this**).
- Get free test MATIC from a Polygon Amoy faucet (search "Polygon Amoy
  faucet" — a couple of public ones exist; you may need a small amount of
  mainnet activity on the wallet or a GitHub/Alchemy account to pass
  faucet anti-abuse checks).
- You only need a tiny amount — Amoy gas costs are negligible.

## 3. Compile, test, and deploy the contract

```bash
cd contracts
npm install
npm test          # runs LandRegistry.test.js — confirms the contract itself works
```

Create a `.env` file in `contracts/` (this is already gitignored-by-convention;
double check before committing anything):
```
AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/<your-api-key>
PRIVATE_KEY=<your-wallet-private-key-without-0x-prefix-issues>
```

Deploy:
```bash
npm run deploy:amoy
```

This prints something like:
```
LandRegistry deployed to: 0xAbC123...
Registrar (deployer) address: 0xYourAddress...
Deployed at block: 12345678

Set these in your backend environment before running with CHAIN_MODE=live:
  CONTRACT_ADDRESS=0xAbC123...
  DEPLOY_BLOCK=12345678
```

Copy those two values — you need them in step 5.

## 4. Install the backend's live-chain dependencies

```bash
cd backend
pip install web3 eth-account
```
(These are already listed in `requirements.txt`, just commented as optional —
a plain `pip install -r requirements.txt` installs them too.)

## 5. Set the backend environment variables and switch modes

```bash
export CHAIN_MODE=live
export AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/<your-api-key>
export PRIVATE_KEY=<same-private-key-as-above>
export CONTRACT_ADDRESS=0xAbC123...          # from the deploy output
export DEPLOY_BLOCK=12345678                 # from the deploy output
```

Then just run the backend as normal:
```bash
cd backend
python3 app.py
```

Nothing in `app.py`, the fraud engine, or the frontend needs to change —
`app.py` picks `chain_client.py` over `mock_chain.py` purely based on
`CHAIN_MODE`, since both modules expose identical function signatures.

## 6. Verify it's actually live

- Register a parcel or commit a transfer through the UI as normal.
- Copy the returned `tx_hash` and paste it into
  [Amoy PolygonScan](https://amoy.polygonscan.com/) — you should see a real,
  independently-verifiable transaction, not something the app made up.
- The Blockchain Explorer page will now be reading real event logs from the
  chain (see `chain_client.get_all_activity()`), not an in-memory list.

---

## Known limitations of this integration (be upfront about these if asked)

- **`name_to_address()` is a placeholder, not a real identity system.**
  The contract needs real Ethereum addresses; the seed data only has plain
  names like "Rajesh Kumar." `chain_client.py` deterministically derives a
  fake address from a hash of the name so the demo can drive real on-chain
  calls. This is fine for a demo, but it means two different people named
  "Rajesh Kumar" would collide onto the same address, and there is no proof
  whoever controls that derived address is the real person. A real
  deployment needs actual per-user wallets (see ADR-6 in the CTO
  architecture docs — Aadhaar-linked eSign is the intended real identity
  anchor, with a linked wallet, not a name hash).
- **`get_all_activity()` queries the RPC live on every call.** Fine at
  hackathon/demo event volume. At real scale this needs a proper background
  indexer writing to a database (see the Monitoring layer in the CTO
  architecture doc) instead of scanning event logs on every page load.
- **Gas fields are set generically** (`estimate_gas` + a flat priority fee).
  This works on Amoy under normal conditions but isn't tuned for mainnet
  gas-price volatility — don't reuse this as-is for a production deployment
  on Polygon mainnet without proper gas strategy review.
