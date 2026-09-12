"""Focused observability and security-control tests."""

import security_controls


def test_metrics_endpoint_exposes_operational_names(client):
    response = client.get("/metrics")
    assert response.status_code == 200
    body = response.get_data(as_text=True)
    assert "land_registry_outbox_backlog" in body
    assert "land_registry_indexer_lag_blocks" in body
    assert "land_registry_blockchain_confirmation_latency_seconds" in body


def test_cookie_authenticated_mutation_requires_csrf(client):
    session = client.post("/api/auth/login", json={"username": "registrar_noida2", "role": "REGISTRAR"}).get_json()
    client.set_cookie("session", "ambient-cookie")
    response = client.post("/api/parcels/UP-0001-CLEAN/freeze", json={"frozen": True}, headers={"Authorization": f"Bearer {session['token']}"})
    assert response.status_code in {401, 403}


def test_security_counter_detects_repeated_events():
    identity = "security-test-user"
    for _ in range(3):
        exceeded, _ = security_controls.record("TEST_ABUSE", identity, 2)
    assert exceeded is True