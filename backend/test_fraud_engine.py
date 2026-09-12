"""
Fraud engine tests.

Covers each rule in isolation, the composite scoring and threshold boundaries,
and — importantly — asserts that every seeded demo scenario actually produces
the outcome its `note` claims. Two of them didn't before the graduated
weighting went in (REQ-04's 20% area discrepancy and REQ-05's third transfer
in a month both scored 0.2 and came back AUTO_APPROVED, contradicting their
own descriptions), so these tests pin that down.
"""

import json
import os

import pytest

from fraud_engine import (
    AUTO_APPROVE_THRESHOLD,
    HIGH_RISK_THRESHOLD,
    FraudEngine,
    flag_weight,
    rule_area_mismatch,
    rule_boundary_overlap,
    rule_duplicate_ownership,
    rule_suspicious_date_sequence,
    rule_transfer_velocity,
)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


@pytest.fixture
def clean_prop():
    return {
        "ulpin": "UP-TEST-0001",
        "survey_number": "SN-1",
        "current_owner": "Asha Rao",
        "area_sqm": 1000.0,
        "registration_office": "Test Office",
        "last_registered_date": "2020-01-01",
        "boundary": [[0, 0], [40, 0], [40, 25], [0, 25]],
        "transfer_history": [
            {"from": "Government Grant", "to": "Asha Rao",
             "date": "2020-01-01", "doc_hash": "0x1"},
        ],
    }


@pytest.fixture
def clean_req():
    return {
        "ulpin": "UP-TEST-0001",
        "seller": "Asha Rao",
        "buyer": "Bhavin Shah",
        "claimed_area_sqm": 1000.0,
        "transaction_date": "2024-06-01",
        "claimed_boundary": None,
    }


# ---------------------------------------------------------- individual rules

def test_clean_request_raises_no_flags(clean_prop, clean_req):
    assert FraudEngine().assess(clean_prop, clean_req)["flags"] == []


def test_duplicate_ownership_flags_seller_mismatch(clean_prop, clean_req):
    clean_req["seller"] = "Someone Else"
    flag = rule_duplicate_ownership(clean_prop, clean_req)
    assert flag["code"] == "DUPLICATE_OWNERSHIP"
    assert flag["severity"] == "hard"
    # The registered owner must appear in the message — a registrar reading
    # this needs to know who the registry thinks owns the parcel.
    assert "Asha Rao" in flag["message"]


def test_duplicate_ownership_passes_for_real_owner(clean_prop, clean_req):
    assert rule_duplicate_ownership(clean_prop, clean_req) is None


@pytest.mark.parametrize("claimed,expected_flag", [
    (1000.0, False),   # exact match
    (1040.0, False),   # 4% — inside the 5% tolerance
    (1050.0, False),   # exactly 5% — boundary is exclusive
    (1051.0, True),    # just over
    (1200.0, True),    # 20%
])
def test_area_mismatch_tolerance_boundary(clean_prop, clean_req, claimed, expected_flag):
    clean_req["claimed_area_sqm"] = claimed
    assert (rule_area_mismatch(clean_prop, clean_req) is not None) is expected_flag


def test_area_mismatch_weight_is_graduated(clean_prop, clean_req):
    """A 20% discrepancy must outweigh an 8% one, so that a serious
    over-claim escalates on its own instead of needing a second flag."""
    clean_req["claimed_area_sqm"] = 1080.0  # 8%
    minor = rule_area_mismatch(clean_prop, clean_req)
    clean_req["claimed_area_sqm"] = 1200.0  # 20%
    major = rule_area_mismatch(clean_prop, clean_req)
    assert flag_weight(major) > flag_weight(minor)


def test_area_mismatch_survives_zero_registered_area(clean_prop, clean_req):
    """
    Regression: this used to raise ZeroDivisionError and surface as a 500.
    validation.py now blocks registering a zero-area parcel, but seed data or
    a hand-edited record could still carry one.
    """
    clean_prop["area_sqm"] = 0
    assert rule_area_mismatch(clean_prop, clean_req) is None


def test_backdated_transaction_is_a_hard_flag(clean_prop, clean_req):
    clean_req["transaction_date"] = "2019-06-01"  # before owner acquired it
    flag = rule_suspicious_date_sequence(clean_prop, clean_req)
    assert flag["code"] == "SUSPICIOUS_DATE_SEQUENCE"
    assert flag["severity"] == "hard"


def test_same_day_as_acquisition_is_not_backdated(clean_prop, clean_req):
    clean_req["transaction_date"] = clean_prop["last_registered_date"]
    assert rule_suspicious_date_sequence(clean_prop, clean_req) is None


def test_velocity_ignores_transfers_outside_the_window(clean_prop, clean_req):
    clean_prop["transfer_history"] = [
        {"from": "A", "to": "B", "date": "2020-01-01", "doc_hash": "0x1"},
        {"from": "B", "to": "C", "date": "2021-01-01", "doc_hash": "0x2"},
    ]
    clean_req["transaction_date"] = "2024-06-01"
    assert rule_transfer_velocity(clean_prop, clean_req) is None


def test_velocity_flags_rapid_churn(clean_prop, clean_req):
    clean_prop["transfer_history"] = [
        {"from": "A", "to": "B", "date": "2024-05-01", "doc_hash": "0x1"},
        {"from": "B", "to": "Asha Rao", "date": "2024-05-20", "doc_hash": "0x2"},
    ]
    clean_req["transaction_date"] = "2024-06-01"
    flag = rule_transfer_velocity(clean_prop, clean_req)
    assert flag["code"] == "TRANSFER_VELOCITY"
    # Counts the transfer under assessment, so this is the 3rd.
    assert "#3" in flag["message"]


def test_velocity_weight_escalates_with_count(clean_prop, clean_req):
    three = dict(clean_prop, transfer_history=[
        {"from": "A", "to": "B", "date": "2024-05-01", "doc_hash": "0x1"},
        {"from": "B", "to": "C", "date": "2024-05-20", "doc_hash": "0x2"},
    ])
    four = dict(clean_prop, transfer_history=[
        {"from": "A", "to": "B", "date": "2024-04-20", "doc_hash": "0x1"},
        {"from": "B", "to": "C", "date": "2024-05-01", "doc_hash": "0x2"},
        {"from": "C", "to": "D", "date": "2024-05-20", "doc_hash": "0x3"},
    ])
    clean_req["transaction_date"] = "2024-06-01"
    assert flag_weight(rule_transfer_velocity(four, clean_req)) > \
           flag_weight(rule_transfer_velocity(three, clean_req))


def test_boundary_overlap_detects_encroachment(clean_prop, clean_req):
    neighbour = {
        "ulpin": "UP-TEST-0002",
        "current_owner": "Neighbour Singh",
        "boundary": [[41, 0], [66, 0], [66, 34], [41, 34]],
    }
    # Extends 9 units east, into the neighbour's parcel.
    clean_req["claimed_boundary"] = [[0, 0], [50, 0], [50, 25], [0, 25]]
    flag = rule_boundary_overlap(
        clean_prop, clean_req,
        all_properties={clean_prop["ulpin"]: clean_prop, neighbour["ulpin"]: neighbour},
    )
    assert flag["code"] == "BOUNDARY_OVERLAP"
    assert flag["severity"] == "hard"
    # The geometry must come back so the UI can draw the real overlap rather
    # than a fixed illustration.
    assert flag["geometry"]["neighbor_ulpin"] == "UP-TEST-0002"
    assert flag["geometry"]["overlap_area_sqm"] > 0
    assert len(flag["geometry"]["claimed"]) == 4


def test_boundary_overlap_ignores_the_parcel_itself(clean_prop, clean_req):
    """A transfer restating the parcel's own boundary is not encroachment."""
    clean_req["claimed_boundary"] = clean_prop["boundary"]
    assert rule_boundary_overlap(
        clean_prop, clean_req, all_properties={clean_prop["ulpin"]: clean_prop}
    ) is None


def test_boundary_overlap_skipped_when_no_boundary_claimed(clean_prop, clean_req):
    assert rule_boundary_overlap(
        clean_prop, clean_req, all_properties={clean_prop["ulpin"]: clean_prop}
    ) is None


# ------------------------------------------------------- composite scoring

def test_hard_flag_forces_high_risk_regardless_of_score(clean_prop, clean_req):
    """A hard flag must block on its own, even though one hard flag's weight
    (0.5) sits below the 0.60 HIGH_RISK threshold."""
    clean_req["seller"] = "Impostor"
    result = FraudEngine().assess(clean_prop, clean_req)
    assert result["status"] == "HIGH_RISK"
    assert result["composite_risk_score"] < HIGH_RISK_THRESHOLD


def test_two_soft_flags_reach_flagged_not_high_risk(clean_prop, clean_req):
    clean_prop["transfer_history"] = [
        {"from": "A", "to": "B", "date": "2024-05-01", "doc_hash": "0x1"},
        {"from": "B", "to": "Asha Rao", "date": "2024-05-20", "doc_hash": "0x2"},
    ]
    clean_req["transaction_date"] = "2024-06-01"
    clean_req["claimed_area_sqm"] = 1080.0  # 8% -> minor
    result = FraudEngine().assess(clean_prop, clean_req)
    assert result["status"] == "FLAGGED"
    assert AUTO_APPROVE_THRESHOLD <= result["composite_risk_score"] < HIGH_RISK_THRESHOLD


def test_composite_score_is_capped_at_one(clean_prop, clean_req):
    clean_req["seller"] = "Impostor"
    clean_req["transaction_date"] = "2019-01-01"
    clean_req["claimed_area_sqm"] = 5000.0
    clean_req["claimed_boundary"] = [[0, 0], [200, 0], [200, 200], [0, 200]]
    neighbour = {"ulpin": "UP-X", "current_owner": "N", "boundary": [[10, 10], [20, 10], [20, 20], [10, 20]]}
    result = FraudEngine().assess(
        clean_prop, clean_req,
        all_properties={clean_prop["ulpin"]: clean_prop, "UP-X": neighbour},
    )
    assert result["composite_risk_score"] == 1.0


def test_ml_score_is_absent_in_rule_only_tier(clean_prop, clean_req):
    assert FraudEngine().assess(clean_prop, clean_req)["ml_score"] is None


def test_flag_weight_falls_back_to_severity_default():
    """A rule that doesn't declare a weight still scores by severity, so
    adding a rule requires no scoring changes."""
    assert flag_weight({"severity": "hard"}) == 0.5
    assert flag_weight({"severity": "soft"}) == 0.2
    assert flag_weight({"severity": "soft", "weight": 0.35}) == 0.35


# ------------------------------------------------- seeded demo scenarios

def _load(name):
    with open(os.path.join(DATA_DIR, name), encoding="utf-8") as f:
        return json.load(f)


# Each seeded request and the status its note claims it demonstrates.
EXPECTED_SEEDED_OUTCOMES = {
    "REQ-01": "AUTO_APPROVED",
    "REQ-02": "HIGH_RISK",    # duplicate sale
    "REQ-03": "HIGH_RISK",    # backdated
    "REQ-04": "FLAGGED",      # 20% area discrepancy
    "REQ-05": "FLAGGED",      # 3rd transfer in 60 days
    "REQ-06": "AUTO_APPROVED",
    "REQ-07": "FLAGGED",      # two stacked soft flags
    "REQ-08": "HIGH_RISK",    # boundary creep
}


def test_every_seeded_scenario_matches_its_documented_outcome():
    """
    The demo script walks a judge through these cases by name. If a scenario's
    note says "fraud" but the engine returns AUTO_APPROVED, the demo
    undermines itself — so this asserts the whole seeded set.
    """
    properties = {p["ulpin"]: p for p in _load("properties.json")}
    engine = FraudEngine()

    seen = set()
    for req in _load("pending_transfers.json"):
        request_id = req["request_id"]
        seen.add(request_id)
        prop = properties[req["ulpin"]]
        result = engine.assess(prop, req, all_properties=properties)
        assert result["status"] == EXPECTED_SEEDED_OUTCOMES[request_id], (
            f"{request_id} returned {result['status']} "
            f"(score {result['composite_risk_score']}, "
            f"flags {[f['code'] for f in result['flags']]}) but its note "
            f"describes {EXPECTED_SEEDED_OUTCOMES[request_id]}"
        )

    assert seen == set(EXPECTED_SEEDED_OUTCOMES), "seeded scenario set changed"


def test_seeded_set_covers_all_three_status_tiers():
    """The demo needs at least one of each tier to show the full range."""
    assert set(EXPECTED_SEEDED_OUTCOMES.values()) == {
        "AUTO_APPROVED", "FLAGGED", "HIGH_RISK",
    }


def test_every_rule_is_exercised_by_the_seeded_set():
    """Guards against a rule silently never firing in the demo."""
    properties = {p["ulpin"]: p for p in _load("properties.json")}
    engine = FraudEngine()
    fired = set()
    for req in _load("pending_transfers.json"):
        result = engine.assess(properties[req["ulpin"]], req, all_properties=properties)
        fired.update(f["code"] for f in result["flags"])

    assert fired == {
        "DUPLICATE_OWNERSHIP", "AREA_MISMATCH", "SUSPICIOUS_DATE_SEQUENCE",
        "TRANSFER_VELOCITY", "BOUNDARY_OVERLAP",
    }
