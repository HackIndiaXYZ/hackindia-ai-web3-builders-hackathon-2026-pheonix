# Threat model

Controls include server-assigned roles, parcel relationship checks, active
credential checks, EIP-712 domain separation, nonce consumption, expiry,
approval thresholds, frozen-parcel blocking, fraud assessment gates, audit
events and immutable finalization. Residual deployment risks are addressed by
PostgreSQL transaction isolation, signed object URLs, malware scanning,
rate-limiting, CSRF/cookie configuration and HSM-backed registrar signing.
