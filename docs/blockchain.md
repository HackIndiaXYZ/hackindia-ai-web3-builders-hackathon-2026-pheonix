# Blockchain and confirmation

MST is authoritative only for finalized immutable events. `READY_TO_COMMIT`
creates an outbox record; an HTTP submission changes it to `MST_SUBMITTED` but
does not complete it. The worker submits it, stores a transaction hash, waits
for confirmed adapter finality, then sets `COMPLETED`. A failure is `MST_FAILED`.
The development mock is not MST confirmation.
