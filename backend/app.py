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
from datetime import datetime, timezone
from functools import wraps

from flask import Flask, jsonify, request, send_from_directory

import assessment_store
import auth
import fraud_engine
import gis_check
import validation
from fraud_engine import FraudEngine
from risk_report import explain_with_source
from validation import ValidationError

# ------------------------------------------------------------ chain mode ----
# CHAIN_MODE=mock  (default) -> in-memory simulated chain, always works,
#                                no network/wallet/gas needed
# CHAIN_MODE=live            -> real web3.py calls to a deployed LandRegistry
#                                contract on Polygon Amoy (see chain_client.py
#                                for the required env vars)
#
# Both modules expose the exact same function names, so nothing else in this
# file needs to know which one is active.
CHAIN_MODE = os.environ.get("CHAIN_MODE", "mock").lower()
if CHAIN_MODE == "live":
    import chain_client as chain
else:
    import mock_chain as chain

# The compiled frontend lives outside the backend package; serving it from
# Flask means one process, one origin, and no CORS surprises during a demo.
FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend")
)

app = Flask(__name__, static_folder=None)
engine = FraudEngine()


@app.after_request
def add_cors_headers(response):
    # Manual CORS (no flask-cors dependency needed). Serving the frontend from
    # this same process makes these headers unnecessary for the normal path,
    # but they're kept so opening frontend/index.html directly from disk (the
    # file:// fallback) still works.
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
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


DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def load_properties():
    with open(os.path.join(DATA_DIR, "properties.json"), encoding="utf-8") as f:
        return {p["ulpin"]: p for p in json.load(f)}


def load_pending_transfers():
    with open(os.path.join(DATA_DIR, "pending_transfers.json"), encoding="utf-8") as f:
        return json.load(f)


# In-memory store, reloaded fresh at startup — fine for a hackathon demo.
# EXTENSION POINT: swap this for a real PostgreSQL-backed repository layer
# (see the CTO architecture doc's schema in Section 4/6) once you're past MVP.
PROPERTIES = load_properties()


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
                return jsonify({
                    "error": f"this action requires one of these roles: {', '.join(allowed_roles)} "
                             f"(you are logged in as {session['role']})"
                }), 403
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
def config():
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
    return jsonify(list(PROPERTIES.values()))


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
    return jsonify({**prop, "onchain_commits": onchain_history})


# ------------------------------------------------------------- transfers ----

@app.route("/api/transfers", methods=["POST"])
def submit_transfer():
    req = validation.validate_transfer_request(request.get_json(force=True, silent=True))
    result, code = assess_transfer_request(req)
    return jsonify(result), code


@app.route("/api/transfers/<ulpin>/commit", methods=["POST"])
@require_role("REGISTRAR")
def commit_transfer(ulpin):
    """
    Commits a transfer on-chain (mock or live, depending on CHAIN_MODE).

    Requires the `assessment_id` from a prior /api/transfers call. The fraud
    verdict is enforced here rather than in the UI: a HIGH_RISK transfer is
    refused unless a registrar sends an explicit override plus a written
    reason, and in that case the contract records aiVerified=false so the
    override is permanently visible in the event log.
    """
    body = validation.require_body(request.get_json(force=True, silent=True))
    prop = PROPERTIES.get(ulpin)
    if not prop:
        return jsonify({"error": "not found"}), 404

    buyer = validation.require_str(body, "buyer")
    decision = assessment_store.authorize_commit(
        assessment_id=body.get("assessment_id"),
        ulpin=ulpin,
        buyer=buyer,
        current_owner=prop["current_owner"],
        override=bool(body.get("override")),
        override_reason=body.get("override_reason", ""),
    )

    entry = chain.register_transfer(
        ulpin=ulpin,
        from_owner=prop["current_owner"],
        to_owner=buyer,
        doc_hash=validation.optional_str(body, "doc_hash", default="0x0", max_length=128),
        ai_verified=decision["ai_verified"],
    )
    assessment_store.mark_consumed(body["assessment_id"], entry["tx_hash"])

    prop["current_owner"] = buyer
    prop["transfer_history"].append({
        "from": entry["from"], "to": entry["to"],
        "date": entry["timestamp"][:10], "doc_hash": entry["doc_hash"],
    })
    prop["last_registered_date"] = entry["timestamp"][:10]

    return jsonify({
        "committed": True,
        "onchain_entry": entry,
        "committed_by": request.session["username"],
        "ai_verified": decision["ai_verified"],
        "override_reason": decision["override_reason"] or None,
    })


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
