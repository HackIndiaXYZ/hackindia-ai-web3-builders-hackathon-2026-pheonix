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
    import mock_chain

    app_mod.PROPERTIES = app_mod.load_properties()
    assessment_store.reset()
    mock_chain.reset()
    auth._SESSIONS.clear()

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
