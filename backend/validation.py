"""
Request payload validation.

Every write endpoint in app.py runs its body through these helpers before any
business logic touches it. The goal is that a malformed or hostile payload
produces a 400 with a useful message, never a 500 traceback — previously
`POST /api/transfers` would throw KeyError/ValueError/ZeroDivisionError
straight out of the fraud rules on missing or junk fields.

Design notes:
  - Every failure raises ValidationError, which app.py catches once in an
    errorhandler and renders as {"error": "..."} with HTTP 400. Individual
    endpoints therefore don't need per-field error plumbing.
  - Messages are written for a human operator ("area_sqm must be a positive
    number, got '-5'"), not a developer stack trace, because a registrar
    typing into the UI is the one who sees them.
"""

import math
from datetime import date, datetime

# A polygon needs at least 3 vertices to enclose any area, and we cap the
# vertex count so a pathological payload can't turn the O(n*m) SAT overlap
# check in gis_check into an accidental denial of service.
MIN_POLYGON_POINTS = 3
MAX_POLYGON_POINTS = 512


class ValidationError(ValueError):
    """A client payload failed validation. app.py renders this as HTTP 400."""


def require_body(body) -> dict:
    """Flask's get_json(force=True) yields None for an empty body and can
    yield a list/str for valid-but-wrong JSON. Endpoints expect an object."""
    if body is None:
        raise ValidationError("a JSON request body is required")
    if not isinstance(body, dict):
        raise ValidationError(
            f"request body must be a JSON object, got {type(body).__name__}"
        )
    return body


def require_str(body: dict, field: str, max_length: int = 200) -> str:
    value = body.get(field)
    if value is None:
        raise ValidationError(f"{field} is required")
    if not isinstance(value, str):
        raise ValidationError(f"{field} must be text, got {type(value).__name__}")
    value = value.strip()
    if not value:
        raise ValidationError(f"{field} is required and cannot be blank")
    if len(value) > max_length:
        raise ValidationError(f"{field} must be at most {max_length} characters")
    return value


def optional_str(body: dict, field: str, default: str = "", max_length: int = 200) -> str:
    if body.get(field) is None:
        return default
    return require_str(body, field, max_length=max_length)


def require_positive_number(body: dict, field: str) -> float:
    """
    Areas must be strictly positive. This is what stops the divide-by-zero in
    fraud_engine.rule_area_mismatch, which computes a percentage deviation
    against the registered area — a parcel registered with area 0 used to
    crash every subsequent transfer assessment against it with a 500.
    """
    value = body.get(field)
    if value is None:
        raise ValidationError(f"{field} is required")
    # Reject bool explicitly: bool is a subclass of int, so True would
    # otherwise sail through as the number 1.
    if isinstance(value, bool):
        raise ValidationError(f"{field} must be a number, got a boolean")
    if isinstance(value, str):
        try:
            value = float(value.strip())
        except ValueError:
            raise ValidationError(f"{field} must be a number, got {value!r}")
    if not isinstance(value, (int, float)):
        raise ValidationError(f"{field} must be a number, got {type(value).__name__}")
    value = float(value)
    # JSON has no NaN/Infinity literals, but Python's json module parses them
    # by default, and NaN silently poisons every comparison downstream.
    if math.isnan(value) or math.isinf(value):
        raise ValidationError(f"{field} must be a finite number")
    if value <= 0:
        raise ValidationError(f"{field} must be a positive number, got {value:g}")
    return value


def require_iso_date(body: dict, field: str) -> str:
    """
    Returns the date as a normalized YYYY-MM-DD string. The fraud rules call
    datetime.fromisoformat() on these values, which raises ValueError on junk
    input — validating here keeps that from surfacing as a 500.
    """
    raw = require_str(body, field, max_length=32)
    try:
        parsed = date.fromisoformat(raw)
    except ValueError:
        raise ValidationError(
            f"{field} must be a date in YYYY-MM-DD format, got {raw!r}"
        )
    # A transaction dated in the future isn't a fraud signal we model, but it
    # is certainly a data-entry error, and letting it through would skew the
    # transfer-velocity window.
    if parsed > datetime.now().date():
        raise ValidationError(
            f"{field} cannot be in the future (got {raw})"
        )
    return parsed.isoformat()


def validate_boundary(boundary, field: str = "boundary"):
    """
    Validates a polygon as a list of at least 3 [x, y] numeric points.

    gis_check's SAT implementation assumes well-formed convex input. Feeding
    it a degenerate polygon used to produce confidently wrong answers rather
    than an error: a single-point "polygon" has a zero-length edge, whose
    normalized separating axis is (0, 0), so every projection collapses to 0
    and polygons_overlap() reports that it overlaps *everything* — which in
    this app means a bogus fraud flag blocking a legitimate transfer.

    Returns the boundary as a list of (float, float) tuples, or None if the
    caller passed None (boundaries are optional throughout).
    """
    if boundary is None:
        return None
    if not isinstance(boundary, list):
        raise ValidationError(
            f"{field} must be a JSON array of [x, y] points, "
            f"got {type(boundary).__name__}"
        )
    if len(boundary) < MIN_POLYGON_POINTS:
        raise ValidationError(
            f"{field} needs at least {MIN_POLYGON_POINTS} points to enclose an "
            f"area, got {len(boundary)}"
        )
    if len(boundary) > MAX_POLYGON_POINTS:
        raise ValidationError(
            f"{field} has too many points ({len(boundary)}); "
            f"the maximum is {MAX_POLYGON_POINTS}"
        )

    cleaned = []
    for i, point in enumerate(boundary):
        if not isinstance(point, (list, tuple)) or len(point) != 2:
            raise ValidationError(
                f"{field}[{i}] must be a pair of numbers like [12.5, 40], "
                f"got {point!r}"
            )
        x, y = point
        for name, coord in (("x", x), ("y", y)):
            if isinstance(coord, bool) or not isinstance(coord, (int, float)):
                raise ValidationError(
                    f"{field}[{i}] {name} coordinate must be a number, got {coord!r}"
                )
            if math.isnan(coord) or math.isinf(coord):
                raise ValidationError(
                    f"{field}[{i}] {name} coordinate must be a finite number"
                )
        cleaned.append((float(x), float(y)))

    if len(set(cleaned)) < MIN_POLYGON_POINTS:
        raise ValidationError(
            f"{field} must have at least {MIN_POLYGON_POINTS} distinct points — "
            f"the points given collapse to a line or a single location"
        )
    if _shoelace_area(cleaned) == 0:
        raise ValidationError(
            f"{field} encloses zero area (all points are collinear), so it "
            f"cannot be checked for spatial overlap"
        )
    return cleaned


def _shoelace_area(polygon) -> float:
    """Absolute polygon area via the shoelace formula. Used only to reject
    degenerate (zero-area) input — gis_check does the real overlap math."""
    total = 0.0
    n = len(polygon)
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2.0


def validate_transfer_request(body) -> dict:
    """
    Validates the payload for POST /api/transfers. Returns a normalized dict
    with exactly the keys the fraud engine reads, so a rule function can index
    req["seller"] without a defensive .get() in every rule.
    """
    body = require_body(body)
    return {
        "request_id": optional_str(body, "request_id", default="adhoc", max_length=64),
        "ulpin": require_str(body, "ulpin", max_length=64),
        "seller": require_str(body, "seller"),
        "buyer": require_str(body, "buyer"),
        "claimed_area_sqm": require_positive_number(body, "claimed_area_sqm"),
        "transaction_date": require_iso_date(body, "transaction_date"),
        "claimed_boundary": validate_boundary(
            body.get("claimed_boundary"), field="claimed_boundary"
        ),
    }


def validate_new_parcel(body) -> dict:
    """Validates the payload for POST /api/properties (register a new parcel)."""
    body = require_body(body)
    return {
        "ulpin": require_str(body, "ulpin", max_length=64),
        "owner": require_str(body, "owner"),
        "survey_number": optional_str(body, "survey_number", max_length=64),
        "registration_office": optional_str(body, "registration_office"),
        # A land parcel without an area is not a usable registry record, and
        # allowing 0 here is what let the divide-by-zero above exist at all.
        "area_sqm": require_positive_number(body, "area_sqm"),
        "registered_date": (
            require_iso_date(body, "registered_date")
            if body.get("registered_date") is not None
            else None
        ),
        "boundary": validate_boundary(body.get("boundary")),
        "doc_hash": optional_str(body, "doc_hash", default="0x0", max_length=128),
    }
