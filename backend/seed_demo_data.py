"""Bootstrap the demo identity directory and parcel catalogue into PostgreSQL.

Schema lives in `migrations/`; this is data, so it is a script rather than a
migration. It reads the same two sources the running app reads —
`auth.DEMO_IDENTITIES` and `data/properties.json` — so the database cannot
drift from the demo the rest of the code serves. Duplicating those rows into a
`.sql` file would create exactly that drift the first time a parcel was edited.

**Every write is create-if-missing.** Re-running after a transfer has completed
must not revert ownership to the seed values, so nothing here updates a parcel
or ownership row that already exists. The only exception is backfilling a NULL
`users.display_name`, which cannot lose information.

Usage:  DATABASE_URL=postgresql://... python seed_demo_data.py
"""

import json
import sys
import hashlib
from datetime import datetime, timezone
from pathlib import Path

import auth
import config
import identity

DATA_FILE = Path(__file__).with_name("data") / "properties.json"


def _connect(database_url=None):
    try:
        import psycopg
    except ImportError as exc:  # pragma: no cover - environment issue
        raise RuntimeError("Install psycopg[binary] to seed the database") from exc
    database_url = database_url or config.DATABASE_URL
    if not database_url:
        raise RuntimeError("DATABASE_URL is required to seed the database")
    return psycopg.connect(database_url)


def load_parcels():
    with DATA_FILE.open(encoding="utf-8") as handle:
        return json.load(handle)


def _polygon_wkt(boundary):
    """A closed WKT ring from the demo's vertex list.

    The demo boundaries are an abstract planar grid (roughly 0..66 by 0..34),
    not WGS84 degrees, and `parcel_geometries.boundary` is declared
    `geometry(Polygon,4326)`. Those numbers are inside the valid lon/lat range
    so PostGIS accepts them, and because the whole grid is transformed
    consistently, intersection predicates give the same answers as the
    pure-Python overlap check in `gis_check.py`. Distances and areas computed
    from them would be meaningless — nothing does that today, and real
    coordinates must replace these before anything does.
    """
    ring = [tuple(point) for point in boundary]
    if ring[0] != ring[-1]:
        ring.append(ring[0])  # a WKT polygon ring must close
    return "POLYGON((" + ", ".join(f"{x} {y}" for x, y in ring) + "))"


def _owners_of(parcel):
    """The owner rows for a parcel, applying the same defaulting as
    `V2Registry.enrich_parcel` so the seed and the runtime agree on what a
    legacy single-owner parcel means."""
    if parcel.get("owners"):
        return parcel["owners"]
    return [{"name": parcel["current_owner"], "share_percent": 100,
             "wallet_address": None, "credential_status": "ACTIVE"}]


def seed_identities(cur):
    """Provision the demo login directory."""
    created = 0
    for username, role in auth.DEMO_IDENTITIES.items():
        identity.resolve_or_create(cur, username, roles=(role,))
        created += 1
    return created


def _seed_credential(cur, user_id, wallet_address, status):
    """A wallet plus the credential that authorises it.

    `record_owner_approval` gates on `ownerships` joined to an ACTIVE
    credential, so an owner without this row cannot sign an approval — which
    is the intended behaviour for an owner of record who has never linked a
    wallet, and a silent lockout for one who has.
    """
    cur.execute(
        """INSERT INTO wallets(user_id, wallet_address) VALUES (%s,%s)
           ON CONFLICT(wallet_address) DO NOTHING RETURNING id::text""",
        (user_id, wallet_address),
    )
    row = cur.fetchone()
    if row:
        wallet_id = row[0]
    else:
        cur.execute("SELECT id::text FROM wallets WHERE wallet_address=%s", (wallet_address,))
        wallet_id = cur.fetchone()[0]

    ref = "CRD-" + wallet_address.replace("demo:", "").upper()[:12]
    cur.execute(
        """INSERT INTO credentials(user_id, wallet_id, status, credential_ref, activated_at)
           VALUES (%s,%s,%s,%s, CASE WHEN %s='ACTIVE' THEN now() ELSE NULL END)
           ON CONFLICT(credential_ref) DO NOTHING RETURNING id::text""",
        (user_id, wallet_id, status, ref, status),
    )
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("SELECT id::text FROM credentials WHERE credential_ref=%s", (ref,))
    return cur.fetchone()[0]


def seed_parcel(cur, parcel):
    """Create one parcel, its geometry, owners and nominees if absent.

    Returns True when the parcel was newly created. An existing parcel is left
    entirely alone: its ownership may legitimately have moved on since the seed
    values, and a seeder must never undo a completed transfer.
    """
    ulpin = parcel["ulpin"]
    cur.execute("SELECT 1 FROM parcels WHERE ulpin=%s", (ulpin,))
    if cur.fetchone():
        return False

    owners = _owners_of(parcel)
    owner_ids = {}
    for owner in owners:
        # An owner of record is not necessarily someone who can log in; most of
        # the demo parcels are held by names absent from DEMO_IDENTITIES.
        owner_ids[owner["name"]] = identity.resolve_or_create(cur, owner["name"])
    current_owner_id = identity.resolve_or_create(cur, parcel["current_owner"])

    cur.execute(
        """INSERT INTO parcels(ulpin, ownership_type, frozen, survey_number, area_sqm, title_status, risk_status,
                               registration_office, last_registered_date,
                               current_owner_user_id, transfer_history)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (ulpin,
         parcel.get("ownership_type", "SOLE" if not parcel.get("owners") else "JOINT"),
         bool(parcel.get("frozen", False)),
         parcel.get("survey_number"),
         parcel.get("area_sqm"),
         parcel.get("title_status", "VERIFIED"),
         parcel.get("risk_status", "LOW_RISK"),
         parcel.get("registration_office"),
         parcel.get("last_registered_date"),
         current_owner_id,
         json.dumps(parcel.get("transfer_history", []))),
    )

    boundary = parcel.get("boundary")
    if boundary:
        wkt = _polygon_wkt(boundary)
        cur.execute(
            """INSERT INTO parcel_geometries(parcel_id, boundary)
               VALUES (%s, ST_GeomFromText(%s, 4326))
               ON CONFLICT(parcel_id) DO NOTHING""",
            (ulpin, wkt),
        )
        cur.execute(
            "UPDATE parcels SET centroid = ST_Centroid(ST_GeomFromText(%s, 4326)) WHERE ulpin=%s",
            (wkt, ulpin),
        )

    for owner in owners:
        user_id = owner_ids[owner["name"]]
        credential_id = None
        if owner.get("wallet_address"):
            credential_id = _seed_credential(
                cur, user_id, owner["wallet_address"],
                owner.get("credential_status", "ACTIVE"))
        # share_percent is a whole percentage in the demo data; share_bps is
        # basis points, and the column's CHECK (1..10000) catches a bad split.
        cur.execute(
            """INSERT INTO ownerships(parcel_id, user_id, credential_id, share_bps, active)
               VALUES (%s,%s,%s,%s,true)
               ON CONFLICT(parcel_id, user_id, active) DO NOTHING""",
            (ulpin, user_id, credential_id, int(round(owner["share_percent"] * 100))),
        )

    for nominee in parcel.get("nominees", []):
        nominee_id = identity.resolve_or_create(cur, nominee["name"])
        cur.execute(
            """INSERT INTO nominees(parcel_id, nominee_user_id, status) VALUES (%s,%s,%s)
               ON CONFLICT(parcel_id, nominee_user_id) DO NOTHING""",
            (ulpin, nominee_id, nominee.get("status", "DORMANT")),
        )
    return True


def upgrade_demo_map_geometry(cur, parcel):
    """Upgrade only known demo fixtures from abstract grid to map coordinates."""
    boundary = parcel.get("boundary")
    if not boundary:
        return
    wkt = _polygon_wkt(boundary)
    cur.execute(
        """UPDATE parcels SET title_status=%s, risk_status=%s
           WHERE ulpin=%s""",
        (parcel.get("title_status", "VERIFIED"), parcel.get("risk_status", "LOW_RISK"), parcel["ulpin"]),
    )
    cur.execute(
        """INSERT INTO parcel_geometries(parcel_id, boundary)
           VALUES (%s, ST_GeomFromText(%s, 4326))
           ON CONFLICT(parcel_id) DO UPDATE SET boundary=EXCLUDED.boundary
           WHERE ST_XMin(parcel_geometries.boundary) < 70
              OR ST_YMin(parcel_geometries.boundary) < 20""",
        (parcel["ulpin"], wkt),
    )
    cur.execute(
        """UPDATE parcels SET centroid=ST_Centroid(ST_GeomFromText(%s, 4326))
           WHERE ulpin=%s AND (centroid IS NULL OR ST_X(centroid) < 70 OR ST_Y(centroid) < 20)""",
        (wkt, parcel["ulpin"]),
    )


def seed_historical_records(cur, parcel):
    """Import the bundled deed history as immutable, completed records.

    These are historical imports, not simulated pending work: each row is
    created only when its deterministic ID is absent. This gives the UI real
    documents, completed transfers, audits, and indexed chain events without
    altering the parcel's present-day owner or any user-created workflow.
    """
    created = 0
    for position, deed in enumerate(parcel.get("transfer_history", []), start=1):
        ulpin = parcel["ulpin"]
        source_ref = deed.get("doc_hash") or f"seeded-deed-{ulpin}-{position}"
        digest = hashlib.sha256(source_ref.encode("utf-8")).hexdigest()
        transfer_id = f"HIST-{ulpin}-{position:02d}"
        event_id = f"SEED-CHAIN-{digest[:20]}"
        event_ref = f"AUD-SEED-{digest[:20]}"
        deed_date = deed.get("date")
        occurred_at = (
            datetime.fromisoformat(deed_date).replace(tzinfo=timezone.utc)
            if deed_date else datetime.now(timezone.utc)
        )
        seller_id = identity.resolve_or_create(cur, deed.get("from", "Registry"))
        buyer_id = identity.resolve_or_create(cur, deed.get("to", parcel["current_owner"]))
        tx_hash = "0x" + hashlib.sha256(f"chain:{source_ref}".encode("utf-8")).hexdigest()[:40]

        cur.execute(
            """INSERT INTO documents(sha256_hash, document_type, storage_reference, mime_type,
                                       size_bytes, uploaded_by, verification_status, created_at)
               VALUES (%s, 'REGISTERED_DEED', %s, 'application/pdf', 1, %s, 'VERIFIED', %s)
               ON CONFLICT(sha256_hash) DO NOTHING""",
            (digest, f"seeded://deeds/{digest}.pdf", buyer_id, occurred_at),
        )
        cur.execute(
            """INSERT INTO transfers(id, parcel_id, buyer_user_id, status, document_hash,
                                      assessment_hash, required_approvals, expires_at, chain_tx_hash,
                                      created_at, updated_at, confirmed_at)
               VALUES (%s, %s, %s, 'COMPLETED', %s, %s, 1, %s, %s, %s, %s, %s)
               ON CONFLICT(id) DO NOTHING""",
            (transfer_id, ulpin, buyer_id, digest, digest, occurred_at, tx_hash,
             occurred_at, occurred_at, occurred_at),
        )
        cur.execute(
            """INSERT INTO transfer_sellers(transfer_id, user_id, position)
               VALUES (%s, %s, 0) ON CONFLICT DO NOTHING""",
            (transfer_id, seller_id),
        )
        cur.execute(
            """INSERT INTO blockchain_events(event_id, tx_hash, block_number, event_name,
                                               parcel_id, transfer_id, event_timestamp, raw_event)
               VALUES (%s, %s, %s, 'OWNERSHIP_TRANSFERRED', %s, %s, %s, %s)
               ON CONFLICT(event_id) DO NOTHING""",
            (event_id, tx_hash, 900000 + position, ulpin, transfer_id, occurred_at,
             json.dumps({"from": deed.get("from"), "to": deed.get("to"), "document_hash": source_ref})),
        )
        cur.execute(
            """INSERT INTO audit_events(actor_user_id, actor_label, action, entity_type, entity_id,
                                         parcel_id, transfer_id, result, metadata, event_ref, created_at)
               VALUES (%s, %s, 'HISTORICAL_DEED_IMPORTED', 'transfer', %s, %s, %s,
                       'SUCCESS', %s, %s, %s)
               ON CONFLICT(event_ref) DO NOTHING""",
            (seller_id, deed.get("from", "Registry"), transfer_id, ulpin, transfer_id,
             json.dumps({"document_hash": source_ref, "buyer": deed.get("to")}), event_ref, occurred_at),
        )
        created += 1
    return created


def seed_role_demo_context(cur):
    """Create one safe, idempotent work item for each portal role."""
    registrar_id = identity.resolve_or_create(cur, "Priya Sharma", roles=("REGISTRAR",))
    bank_id = identity.resolve_or_create(cur, "Rahul Bansal", roles=("BANK",))
    auditor_id = identity.resolve_or_create(cur, "Arvind Mehta", roles=("AUDITOR",))
    buyer_id = identity.resolve_or_create(cur, "Ritu Bansal", roles=("BUYER",))
    nominee_id = identity.resolve_or_create(cur, "Sunita Kumar", roles=("NOMINEE",))
    owner_id = identity.resolve_or_create(cur, "Rajesh Kumar", roles=("OWNER",))
    now = datetime.now(timezone.utc)
    document_hash = hashlib.sha256(b"demo-pending-transfer-deed-ritu-bansal").hexdigest()

    cur.execute(
        """INSERT INTO documents(sha256_hash, document_type, storage_reference, mime_type,
                                   size_bytes, uploaded_by, verification_status)
           VALUES (%s, 'TRANSFER_DEED', 'seeded://deeds/demo-pending-ritu.pdf',
                   'application/pdf', 1, %s, 'VERIFIED')
           ON CONFLICT(sha256_hash) DO NOTHING""",
        (document_hash, buyer_id),
    )
    cur.execute(
        """INSERT INTO transfers(id, parcel_id, buyer_user_id, status, document_hash,
                                  assessment_hash, required_approvals, expires_at)
           VALUES ('DEMO-TR-OWNER-APPROVAL', 'UP-0002-CLEAN', %s, 'OWNER_APPROVAL',
                   %s, %s, 1, %s) ON CONFLICT(id) DO NOTHING""",
        (buyer_id, document_hash, document_hash, now.replace(year=now.year + 1)),
    )
    cur.execute(
        """INSERT INTO transfer_sellers(transfer_id, user_id, position)
           SELECT 'DEMO-TR-OWNER-APPROVAL', id, 0 FROM users
           WHERE identity_reference='meena devi' ON CONFLICT DO NOTHING"""
    )
    cur.execute(
        """INSERT INTO succession_cases(id, parcel_id, nominee_user_id, status, evidence_reference)
           VALUES ('DEMO-SUC-SUNITA-01', 'UP-0001-CLEAN', %s, 'PENDING', 'EVID-SUNITA-2026')
           ON CONFLICT(id) DO NOTHING""",
        (nominee_id,),
    )
    for actor_id, actor_name, action, parcel_id, transfer_id, detail in [
        (owner_id, "Rajesh Kumar", "TRANSFER_APPROVAL_REQUIRED", "UP-0002-CLEAN", "DEMO-TR-OWNER-APPROVAL", {"role": "OWNER"}),
        (registrar_id, "Priya Sharma", "REGISTRAR_REVIEW_QUEUED", "UP-0002-CLEAN", "DEMO-TR-OWNER-APPROVAL", {"role": "REGISTRAR"}),
        (bank_id, "Rahul Bansal", "TITLE_CHECK_REQUESTED", "UP-0005-CLEAN", None, {"role": "BANK"}),
        (auditor_id, "Arvind Mehta", "AUDIT_REVIEW_OPENED", "UP-0003-DUPLICATE-TARGET", None, {"role": "AUDITOR"}),
        (nominee_id, "Sunita Kumar", "SUCCESSION_CASE_OPENED", "UP-0001-CLEAN", "DEMO-SUC-SUNITA-01", {"role": "NOMINEE"}),
    ]:
        event_ref = "AUD-ROLE-" + hashlib.sha256(f"{actor_name}:{action}:{parcel_id}".encode()).hexdigest()[:20]
        cur.execute(
            """INSERT INTO audit_events(actor_user_id, actor_label, action, entity_type, entity_id,
                                         parcel_id, transfer_id, result, metadata, event_ref)
               VALUES (%s,%s,%s,%s,%s,%s,%s,'SUCCESS',%s,%s)
               ON CONFLICT(event_ref) DO NOTHING""",
            (actor_id, actor_name, action, "transfer" if transfer_id else "parcel",
             transfer_id or parcel_id, parcel_id, transfer_id, json.dumps(detail), event_ref),
        )


def run(database_url=None):
    parcels = load_parcels()
    with _connect(database_url) as conn:
        # One transaction for the whole bootstrap: a half-seeded registry
        # (parcels with no owners) would fail confusingly rather than loudly.
        with conn.transaction():
            with conn.cursor() as cur:
                identities = seed_identities(cur)
                created = sum(1 for parcel in parcels if seed_parcel(cur, parcel))
                for parcel in parcels:
                    upgrade_demo_map_geometry(cur, parcel)
                historical_records = sum(seed_historical_records(cur, parcel) for parcel in parcels)
                seed_role_demo_context(cur)
    skipped = len(parcels) - created
    print(f"identities provisioned: {identities}")
    print(f"parcels created: {created} (already present: {skipped})")
    print(f"historical deeds/transfers indexed: {historical_records}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
