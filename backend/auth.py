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
"""

import uuid

VALID_ROLES = {"REGISTRAR", "BANK", "BUYER", "AUDITOR"}

# In-memory session store: token -> {username, role}. Resets on server
# restart — fine for a hackathon demo, swap for Redis at real scale.
_SESSIONS = {}


def login(username: str, role: str) -> dict:
    role = (role or "").upper()
    username = (username or "").strip()
    if not username:
        raise ValueError("username is required")
    if role not in VALID_ROLES:
        raise ValueError(f"role must be one of: {', '.join(sorted(VALID_ROLES))}")

    token = str(uuid.uuid4())
    session = {"username": username, "role": role}
    _SESSIONS[token] = session
    return {"token": token, **session}


def get_session(token: str):
    return _SESSIONS.get(token)


def logout(token: str):
    _SESSIONS.pop(token, None)


def extract_token(flask_request) -> str:
    header = flask_request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[len("Bearer "):]
    return ""
