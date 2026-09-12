"""
Shared pytest fixtures.

The backend modules are written as flat top-level modules (`import auth`,
`import gis_check`) rather than a package, which is fine for the app but means
pytest needs `backend/` on sys.path to import them. Keeping that here means
tests can be run as plain `pytest` from either the repo root or backend/.
"""

import os
import sys

import pytest

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Force mock chain mode before app is imported, so a developer with
# CHAIN_MODE=live in their shell doesn't have the suite try to hit a testnet.
os.environ["CHAIN_MODE"] = "mock"
# The LLM path is exercised with explicit mocks in test_risk_report.py; the
# rest of the suite must run deterministically and offline.
os.environ.pop("ANTHROPIC_API_KEY", None)

# The default suite is the in-memory path, and it must stay that way even in a
# shell that exports a database. `config` snapshots the environment at import
# time, so this has to happen before `import app` — which is why it is here at
# module scope rather than in a fixture.
#
# Postgres-backed tests therefore do NOT read DATABASE_URL: they take
# TEST_DATABASE_URL and pass it to the repository explicitly, which sidesteps
# the import-order problem entirely.
os.environ.pop("DATABASE_URL", None)
os.environ.pop("REDIS_URL", None)

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "")


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "postgres: requires a live PostgreSQL+PostGIS database (set TEST_DATABASE_URL)",
    )


@pytest.fixture
def app_module():
    """
    The Flask app with all in-memory state reset.

    app.py holds the registry, the assessment ledger, the auth sessions, and
    the simulated chain in module-level globals. Without resetting them
    between tests, a commit in one test leaks into another's stats and the
    suite passes or fails depending on ordering.
    """
    import app as app_mod
    import assessment_store
    import auth
    import cache
    import mock_chain

    app_mod.PROPERTIES = app_mod.load_properties()
    app_mod.v2 = app_mod.V2Registry()
    assessment_store.reset()
    mock_chain.reset()
    auth._SESSIONS.clear()
    # The rate-limit counters are keyed by (client address, minute) and are
    # process-global. Without this reset the whole suite shares one bucket, so
    # a suite that grows past RATE_LIMIT_PER_MINUTE requests inside a single
    # minute would start failing on 429s that have nothing to do with the
    # behaviour under test.
    cache.reset_local()

    return app_mod


@pytest.fixture
def client(app_module):
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as c:
        yield c


@pytest.fixture
def registrar_token(client):
    res = client.post("/api/auth/login", json={"username": "reg1", "role": "REGISTRAR"})
    assert res.status_code == 200
    return res.get_json()["token"]


@pytest.fixture
def bank_token(client):
    res = client.post("/api/auth/login", json={"username": "bank1", "role": "BANK"})
    assert res.status_code == 200
    return res.get_json()["token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------------ postgres fixtures ----

@pytest.fixture(scope="session")
def postgres_url():
    """The test database URL, or skip. Never falls back to DATABASE_URL.

    Reading a developer's real DATABASE_URL here would let a test run truncate
    a database they cared about. Opting in through TEST_DATABASE_URL makes that
    impossible by accident.
    """
    if not TEST_DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL is not set; skipping PostgreSQL-backed tests")
    return TEST_DATABASE_URL


@pytest.fixture
def postgres_repo(postgres_url):
    """A repository against a schema-migrated, emptied test database."""
    import migrate
    import psycopg
    import seed_demo_data
    from postgres_v2_repository import PostgresV2Repository

    migrate.run(database_url=postgres_url)

    with psycopg.connect(postgres_url) as conn:
        with conn.cursor() as cur:
            # Order does not matter with CASCADE, and RESTART IDENTITY keeps
            # generated values from drifting between runs. This is why the URL
            # must be opt-in: it destroys data.
            cur.execute("""
                TRUNCATE transfer_approvals, transfer_sellers, signing_challenges,
                         blockchain_outbox, blockchain_events, audit_events,
                         notifications, credential_recovery_cases, succession_cases,
                         nominees, ownerships, credentials, wallets, nonces,
                         documents, encumbrances, disputes, transfers,
                         parcel_geometries, parcels, sessions, user_roles, users
                RESTART IDENTITY CASCADE
            """)
        conn.commit()

    seed_demo_data.run(database_url=postgres_url)
    return PostgresV2Repository(database_url=postgres_url)
