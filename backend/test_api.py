"""
API-level tests via Flask's test client.

The heart of this file is the commit gate. Before it existed, the fraud
engine's verdict was enforced only by the frontend hiding a button — a direct
API call would write a HIGH_RISK transfer to the chain. `test_high_risk_*`
and `test_assessment_is_single_use` are the regression tests for that.
"""

from conftest import auth_header


# ------------------------------------------------------------------ reads

def test_config_reports_real_chain_mode(client):
    body = client.get("/api/config").get_json()
    assert body["chain_mode"] == "mock"
    assert body["llm_explanations_enabled"] is False
    assert body["thresholds"]["high_risk_at_or_above"] == 0.6


def test_properties_list_is_public(client):
    res = client.get("/api/properties")
    assert res.status_code == 200
    assert len(res.get_json()) == 7


def test_parcel_detail_includes_onchain_history(client):
    body = client.get("/api/properties/UP-0001-CLEAN").get_json()
    assert body["current_owner"] == "Rajesh Kumar"
    assert body["onchain_commits"] == []


def test_unknown_parcel_is_404(client):
    assert client.get("/api/properties/NOPE").status_code == 404


# ------------------------------------------------------------------- auth

def test_login_rejects_unknown_role(client):
    res = client.post("/api/auth/login", json={"username": "x", "role": "WIZARD"})
    assert res.status_code == 400
    assert "role must be one of" in res.get_json()["error"]


def test_login_rejects_blank_username(client):
    assert client.post("/api/auth/login", json={"username": "  ", "role": "BANK"}).status_code == 400


def test_me_validates_session(client, registrar_token):
    assert client.get("/api/auth/me", headers=auth_header(registrar_token)).status_code == 200
    assert client.get("/api/auth/me", headers=auth_header("garbage")).status_code == 401


def test_logout_invalidates_token(client, registrar_token):
    client.post("/api/auth/logout", headers=auth_header(registrar_token))
    assert client.get("/api/auth/me", headers=auth_header(registrar_token)).status_code == 401


# ------------------------------------------------------------------- RBAC

def test_write_requires_authentication(client):
    res = client.post("/api/properties", json={"ulpin": "X", "owner": "Y", "area_sqm": 10})
    assert res.status_code == 401


def test_write_requires_registrar_role(client, bank_token):
    """Read-only roles must be refused with 403, not 401 — the distinction
    matters: the user is authenticated, just not authorised."""
    res = client.post(
        "/api/properties",
        json={"ulpin": "UP-NEW", "owner": "Y", "area_sqm": 10},
        headers=auth_header(bank_token),
    )
    assert res.status_code == 403
    assert "REGISTRAR" in res.get_json()["error"]


# --------------------------------------------------------------- register

def test_registrar_can_register_parcel(client, registrar_token):
    res = client.post("/api/properties", json={
        "ulpin": "UP-0100-NEW", "owner": "New Owner", "area_sqm": 500,
        "survey_number": "SN-100", "registration_office": "Test Office",
    }, headers=auth_header(registrar_token))
    assert res.status_code == 201
    body = res.get_json()
    assert body["onchain_entry"]["event_type"] == "PARCEL_REGISTERED"
    # Genesis history entry so the parcel page has a chain of custody.
    assert body["property"]["transfer_history"][0]["from"] == "Initial Registration"


def test_duplicate_ulpin_is_rejected(client, registrar_token):
    res = client.post("/api/properties", json={
        "ulpin": "UP-0001-CLEAN", "owner": "Someone", "area_sqm": 500,
    }, headers=auth_header(registrar_token))
    assert res.status_code == 409


def test_overlapping_registration_is_rejected_with_geometry(client, registrar_token):
    """Double-registration of one physical plot under two ULPINs."""
    res = client.post("/api/properties", json={
        "ulpin": "UP-0101-OVERLAP", "owner": "Land Grabber", "area_sqm": 900,
        "boundary": [[20, 10], [45, 10], [45, 25], [20, 25]],
    }, headers=auth_header(registrar_token))
    assert res.status_code == 409
    body = res.get_json()
    assert "overlaps" in body["error"]
    assert body["geometry"]["neighbor_ulpin"] == "UP-0001-CLEAN"


def test_zero_area_registration_is_rejected(client, registrar_token):
    """Regression: a zero-area parcel used to be registerable, which then
    caused a divide-by-zero 500 in every transfer assessed against it."""
    res = client.post("/api/properties", json={
        "ulpin": "UP-0102-ZERO", "owner": "Someone", "area_sqm": 0,
    }, headers=auth_header(registrar_token))
    assert res.status_code == 400
    assert "positive number" in res.get_json()["error"]


# -------------------------------------------------------------- assessment

def _assess(client, **overrides):
    payload = {
        "ulpin": "UP-0001-CLEAN", "seller": "Rajesh Kumar", "buyer": "Sunita Kumar",
        "claimed_area_sqm": 1200, "transaction_date": "2026-09-08",
    }
    payload.update(overrides)
    return client.post("/api/transfers", json=payload)


def test_clean_assessment_is_public_and_committable(client):
    body = _assess(client).get_json()
    assert body["status"] == "AUTO_APPROVED"
    assert body["committable"] is True
    assert body["assessment_id"]
    assert body["explanation_source"] == "template"


def test_high_risk_assessment_is_not_committable(client):
    body = _assess(client, seller="Impostor Singh").get_json()
    assert body["status"] == "HIGH_RISK"
    assert body["committable"] is False


def test_assessment_for_unknown_parcel_is_404(client):
    assert _assess(client, ulpin="NOPE").status_code == 404


def test_run_all_demo_cases(client):
    results = client.get("/api/demo/run-all").get_json()
    assert len(results) == 8
    statuses = [r["status"] for r in results]
    # All three tiers must appear, or the demo doesn't show the range.
    assert set(statuses) == {"AUTO_APPROVED", "FLAGGED", "HIGH_RISK"}
    assert all(r["note"] for r in results)


# ------------------------------------------------------- payload validation

def test_missing_field_is_400_not_500(client):
    res = client.post("/api/transfers", json={"ulpin": "UP-0001-CLEAN"})
    assert res.status_code == 400
    assert "seller" in res.get_json()["error"]


def test_malformed_date_is_400_not_500(client):
    res = _assess(client, transaction_date="not-a-date")
    assert res.status_code == 400
    assert "YYYY-MM-DD" in res.get_json()["error"]


def test_future_date_is_rejected(client):
    res = _assess(client, transaction_date="2099-01-01")
    assert res.status_code == 400
    assert "future" in res.get_json()["error"]


def test_null_area_is_400_not_500(client):
    """The frontend sends parseFloat("") as null; that used to reach the
    fraud rules and raise a TypeError."""
    assert _assess(client, claimed_area_sqm=None).status_code == 400


def test_negative_area_is_rejected(client):
    assert _assess(client, claimed_area_sqm=-5).status_code == 400


def test_empty_body_is_400_not_500(client):
    assert client.post("/api/transfers", data="", content_type="application/json").status_code == 400


def test_degenerate_boundary_is_rejected(client):
    """
    Regression: a 1-point "polygon" has a zero-length edge, so its separating
    axis is (0,0), every projection collapses to zero, and the SAT check
    reported that it overlapped *everything* — a bogus hard flag blocking a
    legitimate transfer.
    """
    res = _assess(client, claimed_boundary=[[1, 1]])
    assert res.status_code == 400
    assert "at least 3 points" in res.get_json()["error"]


def test_collinear_boundary_is_rejected(client):
    res = _assess(client, claimed_boundary=[[0, 0], [5, 5], [10, 10]])
    assert res.status_code == 400
    assert "zero area" in res.get_json()["error"]


def test_non_numeric_coordinates_are_rejected(client):
    res = _assess(client, claimed_boundary=[[0, 0], ["a", 2], [3, 4]])
    assert res.status_code == 400


# ------------------------------------------------------------ commit gate

def test_commit_requires_an_assessment_id(client, registrar_token):
    """The core fix: no assessment, no on-chain write."""
    res = client.post(
        "/api/transfers/UP-0001-CLEAN/commit",
        json={"buyer": "Sunita Kumar"},
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 400
    assert "assessment_id is required" in res.get_json()["error"]


def test_commit_rejects_unknown_assessment_id(client, registrar_token):
    res = client.post(
        "/api/transfers/UP-0001-CLEAN/commit",
        json={"buyer": "Sunita Kumar", "assessment_id": "made-up"},
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 404


def test_clean_transfer_commits_and_records_ai_verified(client, registrar_token):
    assessment_id = _assess(client).get_json()["assessment_id"]
    res = client.post(
        "/api/transfers/UP-0001-CLEAN/commit",
        json={"buyer": "Sunita Kumar", "assessment_id": assessment_id},
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 200
    body = res.get_json()
    assert body["committed"] is True
    # A clean auto-approval is the only case that earns aiVerified=true.
    assert body["ai_verified"] is True
    assert body["onchain_entry"]["ai_verified"] is True
    assert body["committed_by"] == "reg1"

    # Ownership actually moved.
    assert client.get("/api/properties/UP-0001-CLEAN").get_json()["current_owner"] == "Sunita Kumar"


def test_high_risk_commit_is_blocked_server_side(client, registrar_token):
    """
    THE regression test. The UI hides the commit button for HIGH_RISK, but
    this proves the API refuses it too — a curl with a valid registrar token
    cannot write a fraudulent transfer to the chain.
    """
    assessment_id = _assess(client, seller="Impostor Singh").get_json()["assessment_id"]
    res = client.post(
        "/api/transfers/UP-0003-DUPLICATE-TARGET/commit",
        json={"buyer": "Rakesh Gupta", "assessment_id": assessment_id},
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 409


def test_high_risk_override_requires_a_written_reason(client, registrar_token):
    body = client.post("/api/transfers", json={
        "ulpin": "UP-0003-DUPLICATE-TARGET", "seller": "Vikram Sharma",
        "buyer": "Rakesh Gupta", "claimed_area_sqm": 2000,
        "transaction_date": "2026-09-08",
    }).get_json()
    assert body["status"] == "HIGH_RISK"

    # Refused without an override.
    res = client.post(
        "/api/transfers/UP-0003-DUPLICATE-TARGET/commit",
        json={"buyer": "Rakesh Gupta", "assessment_id": body["assessment_id"]},
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 409
    assert "override" in res.get_json()["error"].lower()

    # Refused with an override but no justification.
    res = client.post(
        "/api/transfers/UP-0003-DUPLICATE-TARGET/commit",
        json={"buyer": "Rakesh Gupta", "assessment_id": body["assessment_id"],
              "override": True},
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 400
    assert "override_reason is required" in res.get_json()["error"]


def test_high_risk_override_records_ai_verified_false(client, registrar_token):
    """
    An override must be permanently distinguishable on-chain from a clean
    transfer. This is what the contract's aiVerified flag is for, and it was
    previously hardcoded to true for every write.
    """
    body = client.post("/api/transfers", json={
        "ulpin": "UP-0003-DUPLICATE-TARGET", "seller": "Vikram Sharma",
        "buyer": "Rakesh Gupta", "claimed_area_sqm": 2000,
        "transaction_date": "2026-09-08",
    }).get_json()

    res = client.post(
        "/api/transfers/UP-0003-DUPLICATE-TARGET/commit",
        json={"buyer": "Rakesh Gupta", "assessment_id": body["assessment_id"],
              "override": True,
              "override_reason": "Court order 2026/CIV/881 directs registration."},
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 200
    assert res.get_json()["ai_verified"] is False
    assert res.get_json()["onchain_entry"]["ai_verified"] is False


def test_assessment_is_single_use(client, registrar_token):
    """One fraud check authorises exactly one write, so a single clean
    assessment can't be replayed to move a parcel repeatedly."""
    assessment_id = _assess(client).get_json()["assessment_id"]
    first = client.post(
        "/api/transfers/UP-0001-CLEAN/commit",
        json={"buyer": "Sunita Kumar", "assessment_id": assessment_id},
        headers=auth_header(registrar_token),
    )
    assert first.status_code == 200

    replay = client.post(
        "/api/transfers/UP-0001-CLEAN/commit",
        json={"buyer": "Sunita Kumar", "assessment_id": assessment_id},
        headers=auth_header(registrar_token),
    )
    assert replay.status_code == 409
    assert "already been committed" in replay.get_json()["error"]


def test_assessment_cannot_be_reused_across_parcels(client, registrar_token):
    assessment_id = _assess(client).get_json()["assessment_id"]
    res = client.post(
        "/api/transfers/UP-0002-CLEAN/commit",
        json={"buyer": "Sunita Kumar", "assessment_id": assessment_id},
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 409
    assert "issued for parcel" in res.get_json()["error"]


def test_commit_buyer_must_match_assessed_buyer(client, registrar_token):
    """Otherwise a clean check on one buyer could be used to transfer the
    parcel to somebody else entirely."""
    assessment_id = _assess(client).get_json()["assessment_id"]
    res = client.post(
        "/api/transfers/UP-0001-CLEAN/commit",
        json={"buyer": "Totally Different Person", "assessment_id": assessment_id},
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 409


def test_stale_assessment_is_rejected_after_owner_changes(client, registrar_token):
    """
    Two assessments are taken against the same seller; the first commits and
    moves the parcel. The second is now stale — its seller is no longer the
    registered owner — and must be refused rather than silently transferring
    from the wrong party.
    """
    first = _assess(client).get_json()["assessment_id"]
    second = _assess(client, buyer="Other Buyer").get_json()["assessment_id"]

    assert client.post(
        "/api/transfers/UP-0001-CLEAN/commit",
        json={"buyer": "Sunita Kumar", "assessment_id": first},
        headers=auth_header(registrar_token),
    ).status_code == 200

    res = client.post(
        "/api/transfers/UP-0001-CLEAN/commit",
        json={"buyer": "Other Buyer", "assessment_id": second},
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 409
    assert "stale assessment" in res.get_json()["error"]


# ------------------------------------------------------------ certificates

def test_cannot_mint_without_a_transfer(client, registrar_token):
    res = client.post(
        "/api/properties/UP-0001-CLEAN/mint-certificate",
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 400
    assert "no on-chain transfers yet" in res.get_json()["error"]


def test_mint_after_clean_transfer(client, registrar_token):
    assessment_id = _assess(client).get_json()["assessment_id"]
    client.post(
        "/api/transfers/UP-0001-CLEAN/commit",
        json={"buyer": "Sunita Kumar", "assessment_id": assessment_id},
        headers=auth_header(registrar_token),
    )
    res = client.post(
        "/api/properties/UP-0001-CLEAN/mint-certificate",
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 200
    cert = res.get_json()
    assert cert["token_id"] == 1
    assert cert["owner"] == "Sunita Kumar"


def test_cannot_certify_a_parcel_whose_last_transfer_was_an_override(client, registrar_token):
    """
    A "Verified Clean Title" must not be mintable off the back of a HIGH_RISK
    transfer that a registrar pushed through — that would be the certificate
    actively misrepresenting the record.
    """
    body = client.post("/api/transfers", json={
        "ulpin": "UP-0003-DUPLICATE-TARGET", "seller": "Vikram Sharma",
        "buyer": "Rakesh Gupta", "claimed_area_sqm": 2000,
        "transaction_date": "2026-09-08",
    }).get_json()
    client.post(
        "/api/transfers/UP-0003-DUPLICATE-TARGET/commit",
        json={"buyer": "Rakesh Gupta", "assessment_id": body["assessment_id"],
              "override": True, "override_reason": "Court order."},
        headers=auth_header(registrar_token),
    )

    res = client.post(
        "/api/properties/UP-0003-DUPLICATE-TARGET/mint-certificate",
        headers=auth_header(registrar_token),
    )
    assert res.status_code == 409
    assert "override" in res.get_json()["error"]


def test_minting_twice_does_not_issue_a_duplicate(client, registrar_token):
    assessment_id = _assess(client).get_json()["assessment_id"]
    client.post(
        "/api/transfers/UP-0001-CLEAN/commit",
        json={"buyer": "Sunita Kumar", "assessment_id": assessment_id},
        headers=auth_header(registrar_token),
    )
    first = client.post("/api/properties/UP-0001-CLEAN/mint-certificate",
                        headers=auth_header(registrar_token)).get_json()
    second = client.post("/api/properties/UP-0001-CLEAN/mint-certificate",
                         headers=auth_header(registrar_token)).get_json()
    assert first["token_id"] == second["token_id"]
    assert second["already_minted"] is True


# --------------------------------------------------------- chain & stats

def test_chain_feed_is_public_and_ordered_newest_first(client, registrar_token):
    client.post("/api/properties", json={
        "ulpin": "UP-0110-A", "owner": "A", "area_sqm": 100,
    }, headers=auth_header(registrar_token))
    client.post("/api/properties", json={
        "ulpin": "UP-0111-B", "owner": "B", "area_sqm": 100,
    }, headers=auth_header(registrar_token))

    feed = client.get("/api/chain/all").get_json()
    assert len(feed) == 2
    assert feed[0]["block_number"] > feed[1]["block_number"]


def test_block_numbers_are_unique_across_event_types(client, registrar_token):
    """The explorer sorts by block number to establish ordering, so a
    collision between a transfer and a certificate would scramble the feed."""
    client.post("/api/properties", json={
        "ulpin": "UP-0120-C", "owner": "Rajesh Kumar", "area_sqm": 1000,
        "registered_date": "2026-09-01",
    }, headers=auth_header(registrar_token))
    assessment_id = _assess(client, ulpin="UP-0120-C", claimed_area_sqm=1000).get_json()["assessment_id"]
    client.post("/api/transfers/UP-0120-C/commit",
                json={"buyer": "Sunita Kumar", "assessment_id": assessment_id},
                headers=auth_header(registrar_token))
    client.post("/api/properties/UP-0120-C/mint-certificate",
                headers=auth_header(registrar_token))

    blocks = [e["block_number"] for e in client.get("/api/chain/all").get_json()]
    assert len(blocks) == len(set(blocks)) == 3


def test_stats_reflect_real_activity(client):
    _assess(client)
    _assess(client, seller="Impostor")
    stats = client.get("/api/stats").get_json()
    assert stats["total_parcels"] == 7
    assert stats["assessments_run"] == 2
    assert stats["status_counts"]["AUTO_APPROVED"] == 1
    assert stats["status_counts"]["HIGH_RISK"] == 1
    assert stats["chain_mode"] == "mock"


def test_demo_reset_restores_seed_data(client, registrar_token):
    assessment_id = _assess(client).get_json()["assessment_id"]
    client.post("/api/transfers/UP-0001-CLEAN/commit",
                json={"buyer": "Sunita Kumar", "assessment_id": assessment_id},
                headers=auth_header(registrar_token))
    assert client.get("/api/properties/UP-0001-CLEAN").get_json()["current_owner"] == "Sunita Kumar"

    res = client.post("/api/demo/reset", headers=auth_header(registrar_token))
    assert res.status_code == 200
    assert client.get("/api/properties/UP-0001-CLEAN").get_json()["current_owner"] == "Rajesh Kumar"
    assert client.get("/api/stats").get_json()["assessments_run"] == 0


def test_demo_reset_requires_registrar(client, bank_token):
    assert client.post("/api/demo/reset", headers=auth_header(bank_token)).status_code == 403


# ----------------------------------------------------------------- OCR

def test_upload_without_file_is_400(client):
    assert client.post("/api/documents/upload", data={}).status_code == 400
