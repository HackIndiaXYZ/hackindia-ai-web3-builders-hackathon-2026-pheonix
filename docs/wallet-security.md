# Wallet security

Private keys never enter Flask, PostgreSQL, browser storage or logs. Wallet
linking uses `LAND_REGISTRY_WALLET_LINK`; transfer authorization uses a
different EIP-712 primary type and purpose. Challenges contain nonces and
expiry and are consumed once. Lost-key recovery revokes the old credential and
requires a newly linked wallet; it never overwrites history.
