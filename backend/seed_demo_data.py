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
        """INSERT INTO parcels(ulpin, ownership_type, frozen, survey_number, area_sqm,
                               registration_office, last_registered_date,
                               current_owner_user_id, transfer_history)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (ulpin,
         parcel.get("ownership_type", "SOLE" if not parcel.get("owners") else "JOINT"),
         bool(parcel.get("frozen", False)),
         parcel.get("survey_number"),
         parcel.get("area_sqm"),
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


def run(database_url=None):
    parcels = load_parcels()
    with _connect(database_url) as conn:
        # One transaction for the whole bootstrap: a half-seeded registry
        # (parcels with no owners) would fail confusingly rather than loudly.
        with conn.transaction():
            with conn.cursor() as cur:
                identities = seed_identities(cur)
                created = sum(1 for parcel in parcels if seed_parcel(cur, parcel))
    skipped = len(parcels) - created
    print(f"identities provisioned: {identities}")
    print(f"parcels created: {created} (already present: {skipped})")
    return 0


if __name__ == "__main__":
    sys.exit(run())
