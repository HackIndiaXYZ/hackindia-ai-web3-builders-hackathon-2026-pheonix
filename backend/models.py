"""
Data models for the Land Title Registry hackathon MVP.

Kept intentionally simple (plain dicts/dataclasses, no ORM) for hackathon speed.

EXTENSION POINTS (see CTO blueprint docs for the full-scale version of each):
  - `geom` field on Property is a placeholder for a future GeoJSON/PostGIS polygon
    (see ADR-4 in the architecture doc). Not used by the rule engine yet, but the
    field exists so adding real spatial fraud checks later doesn't require a schema
    rewrite — just start populating and reading this field.
  - `risk_history` on Property is where you'd start accumulating past risk reports
    if you want a "risk trend over time" view later.
  - `ml_score` on RiskAssessment is left as None in the hackathon tier. Wire in a
    real model later (see fraud_engine.py's `score_ml()` stub) without changing
    this shape.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TransferRecord:
    from_owner: str
    to_owner: str
    date: str
    doc_hash: str


@dataclass
class Property:
    ulpin: str
    survey_number: str
    current_owner: str
    area_sqm: float
    registration_office: str
    last_registered_date: str
    transfer_history: list
    geom: Optional[dict] = None  # EXTENSION POINT: GeoJSON polygon, unused in MVP


@dataclass
class TransferRequest:
    request_id: str
    ulpin: str
    seller: str
    buyer: str
    claimed_area_sqm: float
    transaction_date: str


@dataclass
class RiskAssessment:
    request_id: str
    ulpin: str
    rule_flags: list          # list of {code, severity, message}
    composite_risk_score: float
    status: str                # AUTO_APPROVED | FLAGGED | HIGH_RISK
    explanation: str
    ml_score: Optional[float] = None  # EXTENSION POINT: populate once an ML model exists
