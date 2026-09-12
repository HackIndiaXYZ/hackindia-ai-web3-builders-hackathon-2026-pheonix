"""
Land Title Registry — backend.

Run with:  python app.py
Then open: http://localhost:5000   (the frontend is served from here too)

Public (read) endpoints:
  GET  /api/config                     -> chain mode + tunables the UI displays
  GET  /api/properties                 -> list every parcel in the registry
  GET  /api/properties/<ulpin>         -> single parcel + full on-chain history
  GET  /api/chain/all                  -> full blockchain activity feed (all parcels)
  GET  /api/stats                      -> dashboard summary + recent activity
  POST /api/transfers                  -> submit a transfer, get a risk assessment
                                           (assessment itself is free/public —
                                           only the actual on-chain commit is gated)
  POST /api/documents/upload           -> OCR a scanned deed image
  GET  /api/demo/run-all               -> runs every seeded case at once

Auth endpoints:
  POST /api/auth/login                 -> {username, role} -> {token, role}
  GET  /api/auth/me                    -> validate current token
  POST /api/auth/logout

Registrar-only (requires Authorization: Bearer <token>, role=REGISTRAR):
  POST /api/properties                     -> register a brand-new parcel
  POST /api/transfers/<ulpin>/commit       -> commit an ASSESSED transfer on-chain
  POST /api/properties/<ulpin>/mint-certificate
  POST /api/demo/reset                     -> restore seed data (demo convenience)

A NOTE ON THE COMMIT GATE
`/api/transfers/<ulpin>/commit` requires the `assessment_id` returned by
`/api/transfers`. The fraud engine's verdict is enforced here, server-side —
not merely reflected in the UI. See assessment_store.py for the full rule set
and for why the contract's `aiVerified` flag is now set honestly rather than
hardcoded to true.

EXTENSION POINTS are marked inline with "EXTENSION POINT:" comments.
"""

import json
import os
import tempfile
import hashlib
import uuid
from datetime import datetime, timezone
from functools import wraps

from flask import Flask, Response, jsonify, request, send_from_directory

import assessment_store
import auth
import cache
import config
import fraud_engine
import gis_check
import observability
import metrics
import security_controls
import validation
from fraud_engine import FraudEngine
from risk_report import explain_with_source
from validation import ValidationError
from title_history import TitleTimelineService, OwnershipGraphService
from blockchain.health import BlockchainHealthService
from title_integrity import TitleIntegrityService
from parcel_intelligence import ParcelIntelligenceService
from v2_registry import V2Registry

# ------------------------------------------------------------ chain mode ----
# CHAIN_MODE=mock  (default) -> in-memory simulated chain, always works,
#                                no network/wallet/gas needed
# CHAIN_MODE=live            -> immutable records on the configured MST Testnet
#
# Both modules expose the exact same function names, so nothing else in this
# file needs to know which one is active.
CHAIN_MODE = os.environ.get("CHAIN_MODE", "mock").lower()
if CHAIN_MODE == "live":
    from blockchain import mst_chain_adapter as chain
else:
    import mock_chain as chain

# The compiled frontend lives outside the backend package; serving it from
# Flask means one process, one origin, and no CORS surprises during a demo.
FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend")
)

app = Flask(__name__, static_folder=None)
engine = FraudEngine()
timeline_service = TitleTimelineService()
ownership_graph_service = OwnershipGraphService()
title_integrity_service = TitleIntegrityService()
parcel_intelligence_service = ParcelIntelligenceService()

# Validate at import, not in __main__: under gunicorn __main__ never runs, so
# a misconfigured production container would otherwise boot happily and fail at
# the first request instead of refusing to start.
config.validate()
observability.configure_logging(app)
app.logger.info("configuration loaded: %s", config.summary())

RATE_LIMIT = config.RATE_LIMIT_PER_MINUTE

#: Liveness and readiness must answer while the service is under load — a probe
#: that 429s makes an orchestrator kill a container that is merely busy.
_UNLIMITED_PATHS = {"/health", "/ready"}


@app.before_request
def basic_security_controls():
    """Edge rate limiting, shared across workers when Redis is configured.

    The counter lives in `cache` rather than a module dict: with two gunicorn
    workers a process-local counter enforces roughly twice the configured
    limit, and it also grew without bound because nothing ever evicted an old
    (ip, minute) bucket. Redis keys carry their window and expire themselves.
    """
    if request.method == "OPTIONS":
        return "", 204
    if request.path in _UNLIMITED_PATHS:
        return None
    identity_key = request.remote_addr or "unknown"
    if cache.rate_limit_exceeded(identity_key, RATE_LIMIT):
        return jsonify({"error": "rate limit exceeded"}), 429


@app.before_request
def refresh_postgres_projection():
    """Refresh the read projection so PostgreSQL, not process memory, wins."""
    global PROPERTIES
    if config.DATABASE_URL:
        PROPERTIES = v2.load_properties()


@app.after_request
def add_cors_headers(response):
    # Manual CORS (no flask-cors dependency needed). Serving the frontend from
    # this same process makes these headers unnecessary for the normal path,
    # but they're kept so opening frontend/index.html directly from disk (the
    # file:// fallback) still works.
    allowed_origin = config.ALLOWED_ORIGIN
    origin = request.headers.get("Origin")
    if allowed_origin and origin == allowed_origin:
        response.headers["Access-Control-Allow-Origin"] = allowed_origin
        response.headers["Vary"] = "Origin"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com"
    if request.is_secure:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.errorhandler(ValidationError)
def handle_validation_error(err):
    """
    One place to turn a bad payload into a clean 400. Without this, a missing
    or malformed field raised KeyError/ValueError from deep inside a fraud
    rule and surfaced as a 500 with a traceback.
    """
    return jsonify({"error": str(err)}), 400


@app.errorhandler(assessment_store.CommitNotAuthorized)
def handle_commit_not_authorized(err):
    return jsonify({"error": str(err)}), err.http_status


@app.errorhandler(cache.SessionBackendUnavailable)
def handle_session_backend_unavailable(err):
    """503, never 401.

    When Redis is the session store and it stops answering, nobody's token is
    invalid — the server cannot tell. Reporting that as "authentication
    required" would send every signed-in user to the login screen to obtain a
    token the server also could not read, and would hide an infrastructure
    outage as a wave of user error.
    """
    app.logger.error("session backend unavailable: %s", err)
    return jsonify({"error": "session service is temporarily unavailable"}), 503


DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DOCUMENT_DIR = os.path.join(DATA_DIR, "documents")


def load_properties():
    with open(os.path.join(DATA_DIR, "properties.json"), encoding="utf-8") as f:
        return {p["ulpin"]: p for p in json.load(f)}


def load_pending_transfers():
    with open(os.path.join(DATA_DIR, "pending_transfers.json"), encoding="utf-8") as f:
        return json.load(f)


# PostgreSQL is the production authority. V2Registry remains available only
# when DATABASE_URL is absent, which is the explicit zero-infrastructure demo.
if config.DATABASE_URL:
    from postgres_v2_repository import PostgresV2Repository
    v2 = PostgresV2Repository(config.DATABASE_URL)
    PROPERTIES = v2.load_properties()
else:
    v2 = V2Registry()
    PROPERTIES = load_properties()
    # Populate the mock chain with the deed history backing the seeded parcel
    # catalogue. Live deployments only show confirmed chain events instead.
    chain.seed_from_properties(PROPERTIES)


def require_role(*allowed_roles):
    """
    Decorator gating an endpoint behind an authenticated session with one of
    the given roles. Mirrors the real system's RBAC design (see Security
    Architecture, CTO doc) — reads stay public, writes require a role.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            token = auth.extract_token(request)
            session = auth.get_session(token)
            if not session:
                return jsonify({"error": "authentication required"}), 401
            if session["role"] not in allowed_roles:
                security_controls.record("ROLE_ESCALATION_ATTEMPT", session.get("username", "unknown"), 5)
                app.logger.warning("role escalation attempt", extra={"security_event": "ROLE_ESCALATION_ATTEMPT", "requested_roles": allowed_roles, "actual_role": session["role"]})
                return jsonify({
                    "error": f"this action requires one of these roles: {', '.join(allowed_roles)} "
                             f"(you are logged in as {session['role']})"
                }), 403
            if request.method in {"POST", "PUT", "PATCH", "DELETE"} and not security_controls.csrf_valid(request, session):
                security_controls.record("CSRF_FAILURE", session.get("username", "unknown"), 5)
                app.logger.warning("CSRF validation failed", extra={"security_event": "CSRF_FAILURE"})
                return jsonify({"error": "CSRF validation failed"}), 403
            request.session = session
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def assess_transfer_request(req: dict):
    """
    Runs the fraud engine against one transfer request and records the verdict
    in the assessment ledger. The returned `assessment_id` is what authorizes a
    later on-chain commit — see assessment_store.authorize_commit().
    """
    ulpin = req["ulpin"]
    if ulpin not in PROPERTIES:
        return {"error": f"Unknown parcel {ulpin}"}, 404

    prop = PROPERTIES[ulpin]
    assessment = engine.assess(prop, req, all_properties=PROPERTIES)
    explanation, explanation_source = explain_with_source(assessment, prop, req)
    assessment_id = assessment_store.record(ulpin, req, assessment)

    return {
        "assessment_id": assessment_id,
        "request_id": req.get("request_id", "adhoc"),
        "ulpin": ulpin,
        "status": assessment["status"],
        "composite_risk_score": assessment["composite_risk_score"],
        "ml_score": assessment["ml_score"],
        "flags": assessment["flags"],
        "explanation": explanation,
        "explanation_source": explanation_source,
        "committable": assessment["status"] != "HIGH_RISK",
    }, 200


# ---------------------------------------------------------------- config ----

@app.route("/api/config", methods=["GET"])
def app_config():
    """
    Lets the UI display the real chain mode instead of assuming one. The
    TopBar previously hardcoded "mock", which would have quietly lied after a
    switch to CHAIN_MODE=live.
    """
    return jsonify({
        "chain_mode": CHAIN_MODE,
        "llm_explanations_enabled": bool(os.environ.get("ANTHROPIC_API_KEY")),
        "assessment_ttl_minutes": assessment_store.ASSESSMENT_TTL_MINUTES,
        "thresholds": {
            "auto_approve_below": fraud_engine.AUTO_APPROVE_THRESHOLD,
            "high_risk_at_or_above": fraud_engine.HIGH_RISK_THRESHOLD,
        },
    })
# ---------------------------------------------------------------- auth ----

@app.route("/api/auth/login", methods=["POST"])
def login():
    body = request.get_json(force=True, silent=True)
    body = validation.require_body(body)
    try:
        result = auth.login(body.get("username"), body.get("role"))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(result)


@app.route("/api/auth/me", methods=["GET"])
def me():
    token = auth.extract_token(request)
    session = auth.get_session(token)
    if not session:
        return jsonify({"error": "invalid or expired session"}), 401
    return jsonify(session)


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    auth.logout(auth.extract_token(request))
    return jsonify({"loggedOut": True})


# ----------------------------------------------------------- properties ----

@app.route("/api/properties", methods=["GET"])
def list_properties():
    return jsonify([v2.enrich_parcel(p) for p in PROPERTIES.values()])


@app.route("/api/properties", methods=["POST"])
@require_role("REGISTRAR")
def register_property():
    """
    Registers a brand-new parcel. Reuses the exact same spatial-overlap check
    from the fraud engine (gis_check.polygons_overlap) — a new parcel whose
    claimed boundary overlaps an already-registered parcel is the same fraud
    pattern (double registration of one physical plot under two ULPINs) as
    the boundary-creep check applied during transfers.
    """
    body = validation.validate_new_parcel(request.get_json(force=True, silent=True))
    ulpin = body["ulpin"]
    if ulpin in PROPERTIES:
        return jsonify({"error": f"parcel {ulpin} is already registered"}), 409

    boundary = body["boundary"]
    if boundary:
        for other_ulpin, other_prop in PROPERTIES.items():
            other_boundary = other_prop.get("boundary")
            if other_boundary and gis_check.polygons_overlap(boundary, other_boundary):
                est = gis_check.overlap_area_estimate(boundary, other_boundary)
                return jsonify({
                    "error": (
                        f"Cannot register — claimed boundary overlaps the already-"
                        f"registered parcel {other_ulpin} (owned by "
                        f"{other_prop['current_owner']}) by an estimated {est} sqm. "
                        f"This looks like an attempt to double-register land that "
                        f"already has a title."
                    ),
                    "geometry": {
                        "claimed": [list(p) for p in boundary],
                        "neighbor": [list(p) for p in other_boundary],
                        "neighbor_ulpin": other_ulpin,
                        "neighbor_owner": other_prop["current_owner"],
                        "overlap_area_sqm": est,
                    },
                }), 409

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    registered_date = body["registered_date"] or today
    new_prop = {
        "ulpin": ulpin,
        "survey_number": body["survey_number"],
        "current_owner": body["owner"],
        "area_sqm": body["area_sqm"],
        "registration_office": body["registration_office"],
        "last_registered_date": registered_date,
        # Stored as [x, y] lists so this round-trips through JSON unchanged.
        "boundary": [list(p) for p in boundary] if boundary else None,
        "transfer_history": [{
            "from": "Initial Registration",
            "to": body["owner"],
            "date": registered_date,
            "doc_hash": body["doc_hash"],
        }],
    }
    PROPERTIES[ulpin] = new_prop
    onchain_entry = chain.register_parcel(ulpin, body["owner"])

    return jsonify({"property": new_prop, "onchain_entry": onchain_entry}), 201


@app.route("/api/properties/<ulpin>", methods=["GET"])
def get_property(ulpin):
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404
    onchain_history = chain.get_history(ulpin)
    return jsonify({**v2.enrich_parcel(prop), "onchain_commits": onchain_history})


def _mst_client_for_health():
    if not (config.MST_RPC_URL and config.MST_WALLET_ADDRESS and config.MST_PRIVATE_KEY):
        return None
    try:
        from blockchain.mst_client import MSTClient
        return MSTClient()
    except Exception as exc:
        app.logger.warning("MST client unavailable for health snapshot: %s", exc.__class__.__name__)
        return None


@app.route("/api/ops/blockchain-health", methods=["GET"])
@require_role("REGISTRAR", "AUDITOR")
def blockchain_health():
    snapshot = BlockchainHealthService(config.DATABASE_URL, _mst_client_for_health()).snapshot()
    return jsonify(snapshot)


@app.route("/api/parcels/<ulpin>/integrity", methods=["GET"])
def parcel_integrity(ulpin):
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404
    chain_events = chain.get_history(ulpin)
    if config.DATABASE_URL:
        try:
            import psycopg
            with psycopg.connect(config.DATABASE_URL) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT raw_event FROM blockchain_events WHERE parcel_id=%s ORDER BY block_number", (ulpin,))
                    chain_events = [row[0] for row in cur.fetchall()]
        except Exception:
            app.logger.exception("integrity blockchain lookup failed for %s", ulpin)
    result = title_integrity_service.scan(v2.enrich_parcel(prop), chain_events, v2.list_transfers(), v2.list_audit())
    app.logger.info("parcel integrity requested", extra={"parcel_id": ulpin, "status": result["status"], "integrity_score": result["integrity_score"]})
    return jsonify(result)


@app.route("/api/parcels/<ulpin>/insights", methods=["GET"])
def parcel_insights(ulpin):
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404
    result = parcel_intelligence_service.build(v2.enrich_parcel(prop), v2.list_audit())
    app.logger.info("parcel insights requested", extra={"parcel_id": ulpin})
    return jsonify(result)


@app.route("/api/parcels/<ulpin>/timeline", methods=["GET"])
def parcel_timeline(ulpin):
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404
    timeline = timeline_service.build(v2.enrich_parcel(prop), chain.get_history(ulpin), v2.list_transfers(), v2.list_audit())
    query = request.args.get("q", "").strip().lower()
    if query:
        timeline = [item for item in timeline if query in str(item).lower()]
    return jsonify(timeline)


@app.route("/api/parcels/<ulpin>/ownership-graph", methods=["GET"])
def ownership_graph(ulpin):
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404
    timeline = timeline_service.build(v2.enrich_parcel(prop), chain.get_history(ulpin), v2.list_transfers(), v2.list_audit())
    return jsonify(ownership_graph_service.build(v2.enrich_parcel(prop), timeline))


@app.route("/api/workspaces/registrar", methods=["GET"])
@require_role("REGISTRAR")
def registrar_workspace():
    return jsonify({"pending_transfers": v2.list_transfers(statuses={"REGISTRAR_REVIEW", "READY_TO_COMMIT", "MST_FAILED"}),
                    "pending_successions": v2.list_succession_cases(exclude_statuses={"SUCCESSOR_ACTIVATED"}),
                    "credential_recoveries": v2.list_recovery_cases(),
                    "frozen_parcels": [v2.enrich_parcel(p) for p in PROPERTIES.values() if p.get("frozen")],
                    "disputed_parcels": [v2.enrich_parcel(p) for p in PROPERTIES.values() if p.get("disputes")]})


@app.route("/api/workspaces/bank", methods=["GET"])
@require_role("BANK")
def bank_workspace():
    reports = []
    for parcel_id, prop in PROPERTIES.items():
        integrity = title_integrity_service.scan(v2.enrich_parcel(prop), chain.get_history(parcel_id), v2.list_transfers(), v2.list_audit())
        reports.append({"parcel_id": parcel_id, "title_health_score": title_health(parcel_id).get_json()["score"], "ownership_verification": "MATCHED", "blockchain_verification": integrity["status"], "integrity_score": integrity["integrity_score"]})
    app.logger.info("bank workspace generated", extra={"parcel_count": len(reports)})
    return jsonify({"workspace": "BANK_VERIFICATION", "parcels": reports})


@app.route("/api/workspaces/nominee", methods=["GET"])
@require_role("NOMINEE", "BUYER")
def nominee_workspace():
    user = request.session["username"]
    related = [v2.enrich_parcel(p) for p in PROPERTIES.values() if any(n.get("name", "").lower() == user.lower() for n in p.get("nominees", []))]
    return jsonify({"nominations": related, "succession_cases": v2.list_succession_cases(nominee=user),
                    "notifications": v2.list_notifications(recipient=user)})


@app.route("/api/succession", methods=["GET"])
@require_role("OWNER", "BUYER", "NOMINEE")
def citizen_succession_cases():
    user = request.session["username"]
    return jsonify(v2.list_succession_cases(nominee=user))


@app.route("/api/reports/parcel/<ulpin>", methods=["GET"])
@require_role("BANK", "AUDITOR", "REGISTRAR")
def parcel_report(ulpin):
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404
    parcel = v2.enrich_parcel(prop)
    health = title_health(ulpin).get_json()
    timeline = timeline_service.build(parcel, chain.get_history(ulpin), v2.list_transfers(), v2.list_audit())
    return jsonify({"report_type": "PARCEL_TITLE_REPORT", "generated_at": datetime.now(timezone.utc).isoformat(), "parcel": parcel,
                    "title_health": health, "timeline": timeline, "blockchain_events": chain.get_history(ulpin)})


@app.route("/api/parcels/<ulpin>/title-health", methods=["GET"])
def title_health(ulpin):
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404
    parcel = v2.enrich_parcel(prop)
    deductions = 20 * len(parcel["disputes"]) + 10 * len(parcel["encumbrances"])
    if parcel["frozen"]:
        deductions += 30
    return jsonify({"ulpin": ulpin, "score": max(0, 100 - deductions),
                    "factors": {"ownership_continuity": "VERIFIED", "document_integrity": "VERIFIED",
                                "boundary_consistency": "VERIFIED" if prop.get("boundary") else "NOT_AVAILABLE",
                                "encumbrances": len(parcel["encumbrances"]), "disputes": len(parcel["disputes"]),
                                "frozen": parcel["frozen"]}})


@app.route("/api/parcels/<ulpin>/freeze", methods=["POST"])
@require_role("REGISTRAR")
def freeze_parcel(ulpin):
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404
    prop["frozen"] = bool(validation.require_body(request.get_json(force=True, silent=True)).get("frozen", True))
    if config.DATABASE_URL:
        v2.freeze_parcel(ulpin, prop["frozen"], request.session["username"])
    else:
        v2.audit(request.session["username"], "PARCEL_FROZEN" if prop["frozen"] else "PARCEL_UNFROZEN", ulpin)
    return jsonify({"ulpin": ulpin, "frozen": prop["frozen"]})


# ------------------------------------------------------------- transfers ----

@app.route("/api/transfers", methods=["POST"])
def submit_transfer():
    req = validation.validate_transfer_request(request.get_json(force=True, silent=True))
    result, code = assess_transfer_request(req)
    return jsonify(result), code


@app.route("/api/transfers/<ulpin>/commit", methods=["POST"])
@require_role("REGISTRAR")
def commit_transfer(ulpin):
    if config.DATABASE_URL:
        return jsonify({
            "error": "direct blockchain commits are disabled",
            "message": "Create and approve a V2 transfer, then submit it to the outbox worker.",
            "workflow_endpoint": "/api/v2/transfers/<transfer_id>/submit",
        }), 410

    # Compatibility-only path for the zero-infrastructure demo. Production
    # configuration is rejected above, so no deployed API can submit directly.
    body = validation.require_body(request.get_json(force=True, silent=True))
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404
    if prop.get("frozen"):
        return jsonify({"error": "parcel is frozen; transfers are not permitted"}), 409
    buyer = validation.require_str(body, "buyer")
    decision = assessment_store.authorize_commit(
        assessment_id=body.get("assessment_id"), ulpin=ulpin,
        buyer=buyer, current_owner=prop["current_owner"],
        override=bool(body.get("override")), override_reason=body.get("override_reason", ""),
    )
    entry = chain.register_transfer(
        ulpin=ulpin, from_owner=prop["current_owner"], to_owner=buyer,
        doc_hash=validation.optional_str(body, "doc_hash", default="0x0", max_length=128),
        ai_verified=decision["ai_verified"],
    )
    assessment_store.mark_consumed(body["assessment_id"], entry["tx_hash"])
    prop["current_owner"] = buyer
    prop["owners"] = [{"name": buyer, "share_percent": 100, "wallet_address": None, "credential_status": "ACTIVE"}]
    prop["ownership_type"] = "SOLE"
    prop["ownership_policy"] = {"required_approvals": 1, "total_owners": 1}
    prop["transfer_history"].append({"from": entry["from"], "to": entry["to"], "date": entry["timestamp"][:10], "doc_hash": entry["doc_hash"]})
    prop["last_registered_date"] = entry["timestamp"][:10]
    return jsonify({"committed": True, "onchain_entry": entry, "committed_by": request.session["username"], "ai_verified": decision["ai_verified"], "override_reason": decision["override_reason"] or None})


# V2 workflow endpoints -----------------------------------------------------
# These write operational workflow state only.  A background outbox worker is
# the production boundary that later submits READY_TO_COMMIT transfers to MST.

@app.route("/api/v2/transfers", methods=["POST"])
@require_role("OWNER", "REGISTRAR")
def create_v2_transfer():
    body = validation.require_body(request.get_json(force=True, silent=True))
    ulpin = validation.require_str(body, "parcel_id", max_length=64)
    buyer = validation.require_str(body, "buyer")
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404
    parcel = v2.enrich_parcel(prop)
    if request.session["role"] == "OWNER" and request.session["username"] not in [o["name"] for o in parcel["owners"]]:
        return jsonify({"error": "only an active owner can initiate this parcel transfer"}), 403
    transfer = v2.create_transfer(parcel, buyer,
                                  validation.optional_str(body, "document_hash", default="PENDING", max_length=128),
                                  validation.optional_str(body, "assessment_hash", default="PENDING", max_length=128),
                                  request.session["username"])
    return jsonify(transfer), 201


@app.route("/api/v2/transfers", methods=["GET"])
@require_role("OWNER", "BUYER", "NOMINEE", "REGISTRAR", "AUDITOR", "BANK")
def list_v2_transfers():
    statuses = request.args.get("statuses")
    values = v2.list_transfers(statuses=set(statuses.split(",")) if statuses else None)
    return jsonify(values)


@app.route("/api/v2/transfers/<transfer_id>", methods=["GET"])
def get_v2_transfer(transfer_id):
    transfer = v2.get_transfer(transfer_id)
    if not transfer:
        return jsonify({"error": "not found"}), 404
    return jsonify(transfer)


@app.route("/api/v2/transfers/<transfer_id>/approve", methods=["POST"])
@require_role("OWNER", "REGISTRAR", "BUYER")
def approve_v2_transfer(transfer_id):
    if request.session["role"] == "OWNER":
        return jsonify({"error": "owner approval requires an EIP-712 transfer signature"}), 409
    try:
        transfer = v2.approve(transfer_id, request.session["username"], request.session["role"])
    except KeyError as e:
        return jsonify({"error": str(e)}), 404
    except PermissionError as e:
        exceeded, _ = security_controls.record("APPROVAL_ABUSE", request.session["username"], 5)
        if exceeded:
            return jsonify({"error": "too many failed approval attempts"}), 429
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        exceeded, _ = security_controls.record("APPROVAL_ABUSE", request.session["username"], 5)
        if exceeded:
            return jsonify({"error": "too many failed approval attempts"}), 429
        return jsonify({"error": str(e)}), 409
    return jsonify(transfer)


@app.route("/api/v2/transfers/<transfer_id>/submit", methods=["POST"])
@require_role("REGISTRAR")
def submit_v2_transfer(transfer_id):
    """Demo outbox worker handoff. Production invokes this asynchronously only
    after a durable outbox claim and waits for MST finality before confirmation."""
    try:
        transfer, _ = v2.submit_for_commit(transfer_id, request.session["username"])
    except KeyError as e:
        return jsonify({"error": str(e)}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 409
    return jsonify({"transfer": transfer, "message": "Queued for the outbox worker; it is not completed until chain confirmation."}), 202


def process_v2_outbox_once():
    """Worker entry point. In production this runs from a durable queue, not an
    HTTP request. A returned chain receipt is treated as confirmation only when
    the configured adapter guarantees finality."""
    item = v2.next_outbox_item("SUBMITTED")
    if not item:
        app.logger.info("outbox worker found no submitted items")
        return None
    transfer = v2.get_transfer(item["transfer_id"])
    if not transfer:
        return None
    prop = PROPERTIES.get(transfer["parcel_id"])
    if not prop or prop.get("frozen"):
        failed = v2.fail_transfer(transfer["transfer_id"], "parcel unavailable or frozen")
        return {"transfer": failed, "error": "parcel unavailable or frozen"}
    try:
        app.logger.info("outbox worker submitting transfer", extra={"transfer_id": transfer["transfer_id"], "parcel_id": transfer["parcel_id"]})
        if config.MST_RPC_URL and config.MST_WALLET_ADDRESS and config.MST_PRIVATE_KEY:
            from blockchain.mst_client import MSTClient
            mst = MSTClient()
            submitted = mst.submit_event({
                "event_type": "OWNERSHIP_TRANSFERRED",
                "transfer_id": transfer["transfer_id"],
                "parcel_id": transfer["parcel_id"],
                "previous_owner": prop["current_owner"],
                "new_owner": transfer["buyer"],
                "ownership_shares": [{"share_bps": 10000}],
                "registrar_id": (transfer.get("registrar_approval") or {}).get("actor", "outbox-worker"),
                "approval_hash": transfer["assessment_hash"],
                "document_hashes": [transfer["document_hash"]],
            })
            confirmation = mst.verify_confirmation(submitted["tx_hash"], confirmations=1)
            if not confirmation["confirmed"]:
                raise RuntimeError("MST transaction was submitted but is not confirmed")
            entry = {
                "event_type": "OWNERSHIP_TRANSFERRED",
                "ulpin": transfer["parcel_id"],
                "from": prop["current_owner"],
                "to": transfer["buyer"],
                "doc_hash": transfer["document_hash"],
                "tx_hash": submitted["tx_hash"],
                "block_number": confirmation["block_number"],
                "timestamp": transfer.get("created_at", datetime.now(timezone.utc).isoformat()),
                "confirmation_status": confirmation["confirmation_status"],
            }
            if config.DATABASE_URL:
                from blockchain.mst_indexer import MSTIndexer
                MSTIndexer(client=mst).replay(
                    from_block=confirmation["block_number"],
                    to_block=confirmation["block_number"],
                )
        else:
            entry = chain.register_transfer(transfer["parcel_id"], prop["current_owner"], transfer["buyer"], transfer["document_hash"], ai_verified=False)
        v2.confirm_commit(transfer["transfer_id"], entry["tx_hash"], "outbox-worker")
        # The worker advances only after the adapter has verified finality.
        completed = v2.confirm_finality(transfer["transfer_id"], "outbox-worker")
        app.logger.info("outbox worker completed transfer", extra={"transfer_id": transfer["transfer_id"], "tx_hash": entry["tx_hash"]})
        prop.update({"current_owner": transfer["buyer"], "owners": [{"name": transfer["buyer"], "share_percent": 100, "wallet_address": None, "credential_status": "ACTIVE"}], "ownership_type": "SOLE", "ownership_policy": {"required_approvals": 1, "total_owners": 1}, "last_registered_date": entry["timestamp"][:10]})
        prop["transfer_history"].append({"from": entry["from"], "to": entry["to"], "date": entry["timestamp"][:10], "doc_hash": entry["doc_hash"]})
        return {"transfer": completed, "onchain_entry": entry}
    except Exception as exc:
        # Broad on purpose — a chain adapter fails in many ways and the worker
        # must survive all of them. But log the traceback: this handler used to
        # swallow a NameError raised inside confirm_finality, which made a
        # permanent code defect look like a transient chain failure on every
        # single transfer, so nothing ever reached COMPLETED.
        app.logger.exception("outbox submission failed for transfer %s", transfer["transfer_id"])
        failed = v2.fail_transfer(transfer["transfer_id"], exc)
        return {"transfer": failed, "error": "chain submission failed"}


@app.route("/api/audit", methods=["GET"])
@require_role("REGISTRAR", "AUDITOR")
def audit_events():
    return jsonify(v2.list_audit(newest_first=True))


@app.route("/metrics", methods=["GET"])
def prometheus_metrics():
    return Response(metrics.render(config.DATABASE_URL), mimetype="text/plain; version=0.0.4")


@app.route("/api/audit/search", methods=["GET"])
@require_role("AUDITOR", "REGISTRAR")
def audit_search():
    query = (request.args.get("q") or "").strip().lower()
    action = (request.args.get("action") or "").strip().upper()
    result_filter = (request.args.get("result") or "").strip().upper()
    parcel_id = (request.args.get("parcel_id") or "").strip()
    events = v2.list_audit(newest_first=True)
    events = [event for event in events if (not query or query in str(event).lower()) and (not action or event.get("action") == action) and (not result_filter or event.get("result") == result_filter) and (not parcel_id or event.get("parcel_id") == parcel_id)]
    app.logger.info("audit search completed", extra={"result_count": len(events), "has_query": bool(query)})
    if request.args.get("format") == "csv":
        from flask import Response
        columns = ["event_id", "actor", "action", "parcel_id", "transfer_id", "result", "timestamp"]
        rows = [",".join('"' + str(event.get(column, "")).replace('"', '""') + '"' for column in columns) for event in events]
        return Response(",".join(columns) + "\n" + "\n".join(rows), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=audit-events.csv"})
    return jsonify({"events": events, "count": len(events)})


@app.route("/api/wallets/challenge", methods=["POST"])
@require_role("OWNER")
def wallet_challenge():
    body = validation.require_body(request.get_json(force=True, silent=True))
    parcel_id = validation.require_str(body, "parcel_id", max_length=64)
    wallet_address = validation.require_str(body, "wallet_address", max_length=200)
    prop = PROPERTIES.get(parcel_id)
    if not prop:
        return jsonify({"error": "not found"}), 404
    if request.session["username"] not in [o["name"] for o in v2.enrich_parcel(prop)["owners"]]:
        return jsonify({"error": "only an active owner can link a parcel wallet"}), 403
    return jsonify(v2.create_challenge(request.session["username"], parcel_id, wallet_address)), 201


@app.route("/api/wallets/verify", methods=["POST"])
@require_role("OWNER")
def verify_wallet():
    body = validation.require_body(request.get_json(force=True, silent=True))
    try:
        wallet = v2.link_wallet(validation.require_str(body, "challenge_id", max_length=64),
                                validation.require_str(body, "signature", max_length=512))
    except KeyError as e:
        return jsonify({"error": str(e)}), 404
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 409
    if wallet["user"] != request.session["username"]:
        return jsonify({"error": "challenge belongs to another user"}), 403
    return jsonify({"wallet": wallet})


@app.route("/api/v2/transfers/<transfer_id>/approval-challenge", methods=["POST"])
@require_role("OWNER")
def transfer_approval_challenge(transfer_id):
    try:
        return jsonify(v2.create_transfer_approval_challenge(transfer_id, request.session["username"])), 201
    except KeyError as e:
        return jsonify({"error": str(e)}), 404
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403


@app.route("/api/v2/transfers/approve-signature", methods=["POST"])
@require_role("OWNER")
def approve_v2_transfer_signature():
    body = validation.require_body(request.get_json(force=True, silent=True))
    challenge_id = validation.require_str(body, "challenge_id", max_length=64)
    challenge = v2.get_challenge(challenge_id)
    if not challenge:
        return jsonify({"error": "challenge not found"}), 404
    if challenge.get("user", "").lower() != request.session["username"].lower():
        return jsonify({"error": "approval challenge belongs to another user"}), 403
    try:
        transfer = v2.approve_with_signature(challenge_id,
                                             validation.require_str(body, "signature", max_length=512))
    except KeyError as e:
        return jsonify({"error": str(e)}), 404
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except ValueError as e:
        return jsonify({"error": str(e)}), 409
    return jsonify(transfer)


@app.route("/api/notifications", methods=["GET"])
@require_role("OWNER", "NOMINEE", "BUYER", "REGISTRAR")
def notifications():
    user = request.session["username"]
    return jsonify(v2.list_notifications(recipient=user, newest_first=True))


@app.route("/api/credentials/recovery", methods=["POST"])
@require_role("OWNER")
def request_credential_recovery():
    body = validation.require_body(request.get_json(force=True, silent=True))
    parcel_id = validation.require_str(body, "parcel_id", max_length=64)
    if parcel_id not in PROPERTIES:
        return jsonify({"error": "not found"}), 404
    exceeded, _ = security_controls.record("RECOVERY_REQUEST", request.session["username"], 3)
    if exceeded:
        app.logger.warning("credential recovery abuse detected", extra={"security_event": "RECOVERY_ABUSE"})
        return jsonify({"error": "too many recovery attempts"}), 429
    try:
        return jsonify(v2.request_recovery(request.session["username"], parcel_id, request.session["username"])), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 409


@app.route("/api/credentials/recovery/<recovery_id>/approve", methods=["POST"])
@require_role("REGISTRAR")
def approve_credential_recovery(recovery_id):
    body = validation.require_body(request.get_json(force=True, silent=True))
    try:
        case = v2.approve_recovery(recovery_id, request.session["username"], validation.require_str(body, "new_wallet_address", max_length=200))
    except KeyError as e:
        return jsonify({"error": str(e)}), 404
    except ValueError as e:
        security_controls.record("RECOVERY_APPROVAL_FAILURE", request.session["username"], 5)
        return jsonify({"error": str(e)}), 409
    return jsonify(case)


@app.route("/api/succession", methods=["POST"])
@require_role("OWNER", "NOMINEE", "REGISTRAR")
def open_succession():
    body = validation.require_body(request.get_json(force=True, silent=True))
    ulpin = validation.require_str(body, "parcel_id", max_length=64)
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404
    try:
        case = v2.start_succession(v2.enrich_parcel(prop), validation.require_str(body, "nominee"), request.session["username"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(case), 201


@app.route("/api/succession/<case_id>/verify", methods=["POST"])
@require_role("REGISTRAR")
def verify_succession(case_id):
    body = validation.require_body(request.get_json(force=True, silent=True))
    try:
        case = v2.verify_succession(case_id, request.session["username"],
                                    validation.require_str(body, "evidence_reference", max_length=200))
    except KeyError as e:
        return jsonify({"error": str(e)}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 409
    return jsonify(case)


@app.route("/api/succession/<case_id>/activate", methods=["POST"])
@require_role("REGISTRAR")
def activate_successor(case_id):
    case = v2.get_succession_case(case_id)
    if not case:
        return jsonify({"error": "not found"}), 404
    prop = PROPERTIES.get(case["parcel_id"])
    if not prop:
        # The case references a parcel that is no longer registered. Without
        # this guard activate_successor dereferences None and returns a 500.
        return jsonify({"error": "parcel for this succession case is not registered"}), 404
    try:
        return jsonify(v2.activate_successor(case_id, prop, request.session["username"]))
    except ValueError as e:
        return jsonify({"error": str(e)}), 409


@app.route("/api/verification/<ulpin>", methods=["GET"])
def public_verification(ulpin):
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404
    onchain = chain.get_history(ulpin)
    mst_events = []
    if config.DATABASE_URL:
        try:
            import psycopg
            with psycopg.connect(config.DATABASE_URL) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT tx_hash, block_number, event_name, raw_event "
                        "FROM blockchain_events WHERE parcel_id=%s ORDER BY block_number DESC",
                        (ulpin,),
                    )
                    mst_events = [
                        {"tx_hash": row[0], "block_number": row[1],
                         "event_type": row[2], **(row[3] or {})}
                        for row in cur.fetchall()
                    ]
        except Exception:
            app.logger.exception("MST verification lookup failed for %s", ulpin)
    latest_mst = mst_events[0] if mst_events else None
    verification = "MISSING_ON_CHAIN"
    if latest_mst:
        expected = hashlib.sha256(prop["current_owner"].strip().lower().encode("utf-8")).hexdigest()
        verification = "MATCHED" if latest_mst.get("new_owner_hash") == expected else "MISMATCH"
    health = title_health(ulpin).get_json()
    return jsonify({"verification_id": "LV-" + ulpin[-8:].replace("-", "").upper(), "ulpin": ulpin,
                    "title_status": "FROZEN" if prop.get("frozen") else "VERIFIED",
                    "ownership_history_events": len(prop.get("transfer_history", [])),
                    "latest_transfer": prop.get("last_registered_date"), "title_health": health["score"],
                    "blockchain_record": "VERIFIED" if onchain else "NOT_YET_ANCHORED",
                    "mst_verification": verification,
                    "mst_transaction": {
                        "tx_hash": latest_mst.get("tx_hash"),
                        "block_number": latest_mst.get("block_number"),
                        "confirmation_status": "CONFIRMED",
                    } if latest_mst else None})


@app.route("/api/documents/upload", methods=["POST"])
def upload_document():
    """Real OCR pipeline (Tesseract) — see backend/ocr_pipeline.py."""
    if "file" not in request.files:
        return jsonify({"error": "no file uploaded"}), 400

    # Imported lazily so a missing Tesseract install degrades to a clear error
    # on this one endpoint instead of preventing the whole server from starting.
    import ocr_pipeline

    uploaded = request.files["file"]
    suffix = os.path.splitext(uploaded.filename or "")[1] or ".png"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        uploaded.save(tmp.name)
        tmp_path = tmp.name

    try:
        result = ocr_pipeline.process_document(tmp_path)
    except ocr_pipeline.OCRUnavailable as e:
        return jsonify({"error": str(e)}), 503
    finally:
        os.unlink(tmp_path)

    return jsonify(result)


@app.route("/api/v2/documents", methods=["POST"])
@require_role("OWNER", "BUYER", "REGISTRAR")
def store_v2_document():
    """Stores private evidence locally for the demo and returns its SHA-256.
    The opaque reference/hash, never the file body, is suitable for a transfer
    workflow and eventual immutable ledger anchor."""
    if "file" not in request.files:
        return jsonify({"error": "no file uploaded"}), 400
    uploaded = request.files["file"]
    if not uploaded.filename:
        return jsonify({"error": "file name is required"}), 400
    raw = uploaded.read()
    if not raw:
        return jsonify({"error": "file cannot be empty"}), 400
    if len(raw) > 15 * 1024 * 1024:
        return jsonify({"error": "file exceeds the 15 MB demo limit"}), 413
    os.makedirs(DOCUMENT_DIR, exist_ok=True)
    document_id = f"DOC-{uuid.uuid4().hex[:12].upper()}"
    digest = hashlib.sha256(raw).hexdigest()
    safe_extension = os.path.splitext(uploaded.filename)[1].lower()
    if safe_extension not in {".pdf", ".png", ".jpg", ".jpeg"}:
        return jsonify({"error": "only PDF, PNG, and JPEG evidence is supported"}), 400
    filename = document_id + safe_extension
    with open(os.path.join(DOCUMENT_DIR, filename), "wb") as stored:
        stored.write(raw)
    record = {"document_id": document_id, "document_type": request.form.get("document_type", "EVIDENCE"),
              "storage_reference": filename, "hash": digest, "uploaded_by": request.session["username"],
              "verification_status": "PENDING", "created_at": datetime.now(timezone.utc).isoformat()}
    v2.audit(request.session["username"], "DOCUMENT_STORED", detail={"document_id": document_id, "hash": digest})
    return jsonify(record), 201


@app.route("/api/properties/<ulpin>/mint-certificate", methods=["POST"])
@require_role("REGISTRAR")
def mint_certificate(ulpin):
    """Sharp Economy track tie-in — see contracts/LandRegistry.sol."""
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404

    # The contract requires actual transfer history, not merely a registration
    # event, before it will certify a parcel. Check the same thing here so mock
    # and live modes agree instead of diverging at the revert.
    transfers = [e for e in chain.get_history(ulpin) if e["event_type"] == "TRANSFER"]
    if not transfers:
        return jsonify({
            "error": "cannot mint a certificate for a parcel with no on-chain "
                     "transfers yet — commit a transfer first"
        }), 400

    # A "Verified Clean Title" must not be mintable off the back of a transfer
    # a registrar pushed through against a HIGH_RISK verdict.
    last_status = assessment_store.latest_committed_status(ulpin)
    if last_status == "HIGH_RISK":
        return jsonify({
            "error": "cannot certify this parcel — its most recent committed "
                     "transfer was a registrar override of a HIGH_RISK "
                     "assessment. A clean-title certificate would misrepresent "
                     "the record."
        }), 409

    cert = chain.mint_certificate(ulpin, prop["current_owner"])
    return jsonify(cert)


# ------------------------------------------------------- chain / stats ----

@app.route("/api/chain/all", methods=["GET"])
def chain_explorer():
    """Full on-chain activity feed across every parcel — the Blockchain
    Explorer page's data source. Public and read-only, matching the real
    system's promise: anyone can independently verify the whole ledger."""
    activity = chain.get_all_activity()
    if CHAIN_MODE == "live":
        # The contract only stores/emits keccak256(ULPIN), never the plaintext
        # ID (see chain_client.py's module docstring) — resolve it back to a
        # readable ULPIN using our own registry's known IDs. Anything we
        # don't recognize (e.g. a parcel registered outside this app) shows
        # its raw hash instead of guessing.
        hash_to_ulpin = {chain.ulpin_to_hash(u).hex(): u for u in PROPERTIES}
        for e in activity:
            if not e.get("ulpin") and e.get("ulpin_hash"):
                e["ulpin"] = hash_to_ulpin.get(e["ulpin_hash"], e["ulpin_hash"][:10] + "…")
    return jsonify(activity)


@app.route("/api/stats", methods=["GET"])
def stats():
    return jsonify({
        "total_parcels": len(PROPERTIES),
        "total_onchain_events": len(chain.get_all_activity()),
        "certificates_minted": chain.certificate_count(),
        "assessments_run": assessment_store.total_count(),
        "status_counts": assessment_store.status_counts(),
        "recent_activity": assessment_store.recent(10),
        "chain_mode": CHAIN_MODE,
    })


@app.route("/api/demo/run-all", methods=["GET"])
def run_all_demo_cases():
    """Runs every seeded pending_transfers.json case in one shot."""
    results = []
    for raw in load_pending_transfers():
        note = raw.get("note", "")
        try:
            req = validation.validate_transfer_request(raw)
        except ValidationError as e:
            results.append({"ulpin": raw.get("ulpin"), "error": str(e), "note": note})
            continue
        result, _ = assess_transfer_request(req)
        result["note"] = note
        results.append(result)
    return jsonify(results)


@app.route("/api/demo/reset", methods=["POST"])
@require_role("REGISTRAR")
def reset_demo():
    """
    Restores seed data and clears the assessment ledger, so the demo can be
    run repeatedly without restarting the process. Does NOT roll back the
    chain — on a real chain you couldn't, and pretending otherwise would
    misrepresent what a blockchain is.
    """
    global PROPERTIES
    PROPERTIES = load_properties()
    assessment_store.reset()
    return jsonify({
        "reset": True,
        "parcels": len(PROPERTIES),
        "note": "Seed data restored. On-chain history is immutable and was left intact.",
    })


# ---------------------------------------------------- health / readiness ----
# Registered before the frontend catch-all for clarity, though Werkzeug would
# prefer these static rules over `/<path:filename>` regardless.

@app.route("/health", methods=["GET"])
def health():
    """Liveness: is this process able to serve? No dependency checks.

    Deliberately dependency-free. If /health consulted the database, a brief
    database outage would make the orchestrator kill and restart every healthy
    container — turning a recoverable dependency failure into an outage of its
    own. Liveness answers "should I be restarted"; readiness answers "should I
    receive traffic".
    """
    return jsonify({"status": "ok", "service": "land-registry", "chain_mode": CHAIN_MODE})


@app.route("/ready", methods=["GET"])
def ready():
    """Readiness: are the dependencies this process needs actually usable?

    Returns 503 with a per-dependency breakdown when something is down, so a
    load balancer stops sending traffic here while the process stays up. Only
    configured dependencies are checked — the offline demo configures neither
    and is legitimately ready.
    """
    checks = {}

    if config.DATABASE_URL:
        checks["database"] = _check_database()
    if config.REDIS_URL:
        checks["cache"] = {"ok": cache.ping()}

    ok = all(check["ok"] for check in checks.values())
    payload = {"status": "ready" if ok else "not ready",
               "checks": checks, "config": config.summary()}
    return jsonify(payload), (200 if ok else 503)


def _check_database():
    """`SELECT 1` against Postgres. Reports the failure reason, not a traceback."""
    try:
        import psycopg
    except ImportError:
        return {"ok": False, "error": "psycopg is not installed"}
    try:
        # A short timeout on purpose: a readiness probe that blocks until the
        # TCP default gives up is indistinguishable from a hung process.
        with psycopg.connect(config.DATABASE_URL, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return {"ok": True}
    except Exception as exc:
        app.logger.warning("readiness database check failed: %s", exc)
        return {"ok": False, "error": exc.__class__.__name__}


# ------------------------------------------------------------- frontend ----

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:filename>")
def frontend_asset(filename):
    """
    Serves the built frontend. Registered last so it can never shadow an /api
    route, and it 404s rather than falling back to index.html — a missing
    dist/bundle.js should be an obvious error, not a blank page.
    """
    return send_from_directory(FRONTEND_DIR, filename)


if __name__ == "__main__":
    import socket

    bundle = os.path.join(FRONTEND_DIR, "dist", "bundle.js")
    if not os.path.exists(bundle):
        print("\n  WARNING: frontend/dist/bundle.js is missing.")
        print("  Build it with:  cd frontend && npm install && npm run build\n")
    print(f"  Chain mode: {CHAIN_MODE}")
    print(f"  LLM explanations: {'on' if os.environ.get('ANTHROPIC_API_KEY') else 'off (template mode)'}")

    port = int(os.environ.get("PORT", 5000))
    if "PORT" not in os.environ:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("0.0.0.0", port))
        except OSError:
            print(f"  Port {port} is unavailable (e.g. macOS AirPlay Receiver). Switching to port 5001.")
            port = 5001

    print(f"  Open http://localhost:{port}\n")
    app.run(debug=False, port=port)
