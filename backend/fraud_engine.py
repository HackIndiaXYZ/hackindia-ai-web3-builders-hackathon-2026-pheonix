"""
Rule-based fraud detection engine.

This is deliberately a plain, explainable rule engine for the hackathon tier —
per ADR (see architecture docs), an ML layer is NOT worth building until real
labeled fraud data exists. This engine is structured so that:

  1. Each rule is an independent, pure function (property_dict, request_dict) -> flag|None
  2. Adding a new rule is just adding a new function to RULES below.
  3. `score_ml()` is a stub — wire in a real model later without touching the
     rule functions or the API layer at all.

Severity weights and thresholds are intentionally simple and easy to tune live
during the hackathon if judges/teammates want to see a rule adjusted on the spot.
"""

from datetime import datetime, timedelta

import gis_check


# ---- Individual rules -------------------------------------------------

def rule_duplicate_ownership(prop, req):
    """Seller in the request isn't the property's current registered owner."""
    if req["seller"] != prop["current_owner"]:
        return {
            "code": "DUPLICATE_OWNERSHIP",
            "severity": "hard",
            "message": (
                f"Seller '{req['seller']}' does not match the current registered "
                f"owner '{prop['current_owner']}' for parcel {prop['ulpin']}. "
                f"This is the classic double-sale / stale-deed fraud pattern — "
                f"someone attempting to sell land they no longer (or never did) own."
            ),
        }
    return None


def rule_area_mismatch(prop, req, threshold_pct=5.0):
    """Claimed area deviates materially from the registered area."""
    registered = prop["area_sqm"]
    claimed = req["claimed_area_sqm"]
    # A registered area of 0 is not a meaningful baseline to measure deviation
    # against, and dividing by it used to raise ZeroDivisionError straight out
    # of the rule and surface as a 500. validation.py now rejects area_sqm <= 0
    # at registration, so this is a belt-and-braces guard for parcels that
    # predate that check (e.g. hand-edited seed data).
    if not registered or registered <= 0:
        return None
    deviation_pct = abs(claimed - registered) / registered * 100
    if deviation_pct > threshold_pct:
        # Graduated by how far off the claim is. A 6% discrepancy is usually a
        # survey-rounding argument; a 20% one is a materially different parcel
        # than the one on record.
        if deviation_pct >= 15.0:
            weight = 0.35
            qualifier = (
                "A discrepancy this large is not a survey-rounding difference — "
                "the claim describes materially more land than the registry "
                "records for this parcel."
            )
        else:
            weight = 0.2
            qualifier = (
                "Could indicate boundary manipulation or a data entry attempt "
                "to quietly annex adjoining land."
            )
        return {
            "code": "AREA_MISMATCH",
            "severity": "soft",
            "weight": weight,
            "message": (
                f"Claimed area {claimed} sqm deviates {deviation_pct:.1f}% from the "
                f"registered area of {registered} sqm — beyond the {threshold_pct}% "
                f"tolerance. {qualifier}"
            ),
        }
    return None


def rule_suspicious_date_sequence(prop, req):
    """Transaction date precedes the current owner's own acquisition date."""
    txn_date = datetime.fromisoformat(req["transaction_date"])
    last_registered = datetime.fromisoformat(prop["last_registered_date"])
    if txn_date < last_registered:
        return {
            "code": "SUSPICIOUS_DATE_SEQUENCE",
            "severity": "hard",
            "message": (
                f"Submitted transaction date ({req['transaction_date']}) is before "
                f"the current owner's own registered acquisition date "
                f"({prop['last_registered_date']}) — an impossible sequence that "
                f"strongly suggests a backdated document."
            ),
        }
    return None


def rule_transfer_velocity(prop, req, window_days=60, max_transfers=2):
    """
    Too many transfers of the same parcel within a short window.

    The count is *inclusive of the transfer being assessed* — the signal is
    "this would be the Nth transfer in `window_days`", which is how a
    registrar reads it. The weight is graduated: a third transfer in two
    months is worth a manual look, a fourth is close to conclusive of
    wash-sale or value-inflation activity.
    """
    txn_date = datetime.fromisoformat(req["transaction_date"])
    window_start = txn_date - timedelta(days=window_days)
    recent = [
        t for t in prop["transfer_history"]
        if window_start <= datetime.fromisoformat(t["date"]) <= txn_date
    ]
    if len(recent) < max_transfers:
        return None

    # +1 for the transfer under assessment.
    effective_count = len(recent) + 1
    if effective_count >= 4:
        weight = 0.5
        qualifier = (
            "This is an extreme churn rate that is very difficult to explain "
            "with legitimate activity."
        )
    else:
        weight = 0.35
        qualifier = (
            "Unusually high velocity that often indicates wash-sale or "
            "value-inflation fraud."
        )

    return {
        "code": "TRANSFER_VELOCITY",
        "severity": "soft",
        "weight": weight,
        "message": (
            f"This would be transfer #{effective_count} of parcel {prop['ulpin']} "
            f"within {window_days} days ({len(recent)} already on record in that "
            f"window). {qualifier}"
        ),
    }


def rule_boundary_overlap(prop, req, all_properties=None):
    """
    Claimed boundary in this transfer overlaps a DIFFERENT registered parcel's
    boundary — the spatial equivalent of duplicate-ownership fraud (encroachment
    / boundary creep), typically introduced via a quietly redrawn survey during
    a transfer. See gis_check.py for the underlying overlap math (pure-Python
    SAT — see ADR-4 in the CTO doc for why this stands in for PostGIS here).
    """
    claimed = req.get("claimed_boundary")
    if not claimed or not all_properties:
        return None

    for other_ulpin, other_prop in all_properties.items():
        if other_ulpin == prop["ulpin"]:
            continue
        other_boundary = other_prop.get("boundary")
        if not other_boundary:
            continue
        if gis_check.polygons_overlap(claimed, other_boundary):
            est_area = gis_check.overlap_area_estimate(claimed, other_boundary)
            return {
                "code": "BOUNDARY_OVERLAP",
                "severity": "hard",
                "message": (
                    f"Claimed boundary for {prop['ulpin']} overlaps the registered "
                    f"boundary of neighboring parcel {other_ulpin} (owned by "
                    f"{other_prop['current_owner']}) by an estimated {est_area} sqm. "
                    f"This is a spatial encroachment signal — the submitted survey "
                    f"appears to annex land already belonging to a different, "
                    f"unrelated registered parcel."
                ),
                # The actual geometry, so the UI can draw what was detected
                # instead of a fixed illustration. Consumed by the frontend's
                # BoundaryOverlapSVG component.
                "geometry": {
                    "claimed": [list(p) for p in claimed],
                    "neighbor": [list(p) for p in other_boundary],
                    "neighbor_ulpin": other_ulpin,
                    "neighbor_owner": other_prop["current_owner"],
                    "overlap_area_sqm": est_area,
                },
            }
    return None


RULES = [
    rule_duplicate_ownership,
    rule_area_mismatch,
    rule_suspicious_date_sequence,
    rule_transfer_velocity,
    rule_boundary_overlap,
]


# ---- Composite scoring --------------------------------------------------

# Default weight by severity, used when a rule doesn't specify its own
# `weight`. A "hard" flag is independently sufficient to block a transfer, so
# its numeric weight matters less than the has_hard_flag check below; "soft"
# flags accumulate, and two of them are designed to cross the manual-review
# threshold together.
SEVERITY_WEIGHT = {"hard": 0.5, "soft": 0.2}

AUTO_APPROVE_THRESHOLD = 0.25
HIGH_RISK_THRESHOLD = 0.60


def flag_weight(flag: dict) -> float:
    """
    A rule may return an explicit `weight` to grade its own confidence (a 20%
    area discrepancy is worth more than a 6% one). Falls back to the severity
    default so older/simpler rules need no changes.
    """
    weight = flag.get("weight")
    if isinstance(weight, (int, float)) and not isinstance(weight, bool):
        return float(weight)
    return SEVERITY_WEIGHT.get(flag.get("severity"), 0.2)


class FraudEngine:
    def run_rules(self, prop: dict, req: dict, all_properties: dict = None) -> list:
        flags = []
        for rule in RULES:
            if rule is rule_boundary_overlap:
                result = rule(prop, req, all_properties=all_properties)
            else:
                result = rule(prop, req)
            if result:
                flags.append(result)
        return flags

    def score_ml(self, prop: dict, req: dict):
        """
        EXTENSION POINT: plug in a trained model here later (e.g., XGBoost —
        see the CTO architecture doc, Section 4/8). Returns None in the
        hackathon tier so composite scoring below simply ignores it.
        """
        return None

    def assess(self, prop: dict, req: dict, all_properties: dict = None) -> dict:
        flags = self.run_rules(prop, req, all_properties=all_properties)
        ml_score = self.score_ml(prop, req)

        composite = sum(flag_weight(f) for f in flags)
        composite = min(composite, 1.0)

        has_hard_flag = any(f["severity"] == "hard" for f in flags)

        if has_hard_flag or composite >= HIGH_RISK_THRESHOLD:
            status = "HIGH_RISK"
        elif composite >= AUTO_APPROVE_THRESHOLD:
            status = "FLAGGED"
        else:
            status = "AUTO_APPROVED"

        return {
            "flags": flags,
            "composite_risk_score": round(composite, 2),
            "ml_score": ml_score,
            "status": status,
        }
