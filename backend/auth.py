"""
Session-based role auth for the hackathon MVP.

This is a deliberately simple stand-in for the real identity layer (see
ADR-6 in the CTO architecture doc: Aadhaar-linked eSign/DigiLocker is the
correct real-world identity anchor, NOT this). What this module DOES
faithfully demonstrate is the actual architecture pattern that matters:

  - write operations (register a parcel, commit a transfer, mint a
    certificate) are gated behind an authenticated session with a specific
    role — exactly matching the real system's RBAC design (see Security
    Architecture in the CTO doc)
  - read operations (search, browse, verify) stay public — matching the
    real system's "anyone can verify, only a registrar can write" design

EXTENSION POINT: replace `login()`'s body with a real Aadhaar eSign/OAuth
callback once you have one. Everything downstream (the `require_role`
decorator, the frontend's token handling) stays the same — only the
identity-issuing step changes.

SESSION STORAGE
Sessions live in Redis whenever REDIS_URL is configured, and in the
process-local `_SESSIONS` dict otherwise. This is not an optimisation: the
container image runs two gunicorn workers, and a process-local dict means a
user who logs in through one worker is told their token is invalid by the
other. The public functions below are unchanged by which backend is active.
"""

import hashlib
import uuid

import cache
import config
import security_controls

VALID_ROLES = {"REGISTRAR", "OWNER", "NOMINEE", "BUYER", "BANK", "AUDITOR"}

# Demo directory only. The browser identifies a user; the server resolves
# authority. Production replaces this with the approved identity provider.
DEMO_IDENTITIES = {
    "reg1": "REGISTRAR", "registrar_noida2": "REGISTRAR", "bank1": "BANK",
    "buyer1": "BUYER", "auditor1": "AUDITOR", "rajesh kumar": "OWNER",
    "suresh kumar": "OWNER", "anita singh": "OWNER", "sunita kumar": "NOMINEE",
    "priya sharma": "REGISTRAR", "rahul bansal": "BANK", "arvind mehta": "AUDITOR",
    "ritu bansal": "BUYER",
}

# The portal displays recognizable badge/email fixtures while the server keeps
# stable demo identities. Resolve these aliases before assigning authority so
# a session is linked to the same database user as its related records.
DEMO_LOGIN_ALIASES = {
    "rajesh": "rajesh kumar", "rajesh@demo.local": "rajesh kumar",
    "sunita": "sunita kumar", "sunita@demo.local": "sunita kumar",
    "registrar_noida2": "priya sharma", "gov-reg-0182": "priya sharma",
    "bank1": "rahul bansal", "rahul.bank": "rahul bansal", "rahul.bank@demo.local": "rahul bansal",
    "auditor1": "arvind mehta", "arvind.audit": "arvind mehta", "arvind.audit@demo.local": "arvind mehta",
    "buyer1": "ritu bansal", "ritu": "ritu bansal", "ritu@demo.local": "ritu bansal",
}

# In-process session store: token -> {username, role}. Used only when Redis is
# not configured, i.e. the zero-infrastructure demo, where it resets on server
# restart exactly as it always has. Kept under its original name because the
# test suite resets it directly.
_SESSIONS = {}


def _token_key(token: str) -> str:
    """The cache key for a token — the token's SHA-256, never the token.

    A raw token in a Redis key means read access to the cache is session
    theft. The `sessions.token_hash` column in the operational schema records
    the same decision for the database-backed store.
    """
    return hashlib.sha256((token or "").encode("utf-8")).hexdigest()


def login(username: str, role: str) -> dict:
    username = (username or "").strip()
    if not username:
        raise ValueError("username is required")
    username = DEMO_LOGIN_ALIASES.get(username.lower(), username)
    requested_role = (role or "").upper()
    if requested_role and requested_role not in VALID_ROLES:
        raise ValueError(f"role must be one of: {', '.join(sorted(VALID_ROLES))}")
    role = DEMO_IDENTITIES.get(username.lower())
    if not role:
        raise ValueError("identity is not provisioned in the demo directory")
    if requested_role and requested_role != role:
        security_controls.record("ROLE_ESCALATION_ATTEMPT", username, 5)
        raise ValueError("role is assigned by the identity directory and cannot be selected by the client")

    token = str(uuid.uuid4())
    session = {"username": username, "role": role}
    session["csrf_token"] = security_controls.csrf_token(session)
    if cache.enabled():
        # Expiry comes from the store's TTL, so an abandoned session cannot
        # outlive it. The in-process fallback keeps its original
        # never-expiring behaviour so a long offline demo is not interrupted.
        try:
            cache.session_put(_token_key(token), session, config.SESSION_TTL_SECONDS)
        except cache.SessionBackendUnavailable:
            if not config.ALLOW_LOCAL_SESSION_FALLBACK:
                raise
            _SESSIONS[token] = session
    else:
        _SESSIONS[token] = session
    return {"token": token, "username": username, "role": role, "csrf_token": session["csrf_token"]}


def get_session(token: str):
    """The session for a token, or None when it is unknown or expired.

    Raises `cache.SessionBackendUnavailable` if Redis is the configured store
    and did not answer. That propagates deliberately: a caller must not read an
    infrastructure failure as "not authenticated", and must never be able to
    read it as "authenticated".
    """
    if not token:
        return None
    if cache.enabled():
        try:
            session = cache.session_get(_token_key(token))
        except cache.SessionBackendUnavailable:
            if not config.ALLOW_LOCAL_SESSION_FALLBACK:
                raise
            return _SESSIONS.get(token)
        return session or _SESSIONS.get(token)
    return _SESSIONS.get(token)


def logout(token: str):
    if cache.enabled():
        cache.session_delete(_token_key(token))
    _SESSIONS.pop(token, None)


def extract_token(flask_request) -> str:
    header = flask_request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[len("Bearer "):]
    return ""
