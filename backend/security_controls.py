"""Shared CSRF and abuse controls using the configured cache backend."""

import hashlib
import logging
import secrets
import threading

import cache

log = logging.getLogger(__name__)
_local_lock = threading.Lock()
_local_counters = {}


def csrf_token(session):
    token = session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["csrf_token"] = token
    return token


def csrf_valid(request, session):
    # Bearer authentication is not sent automatically by browsers and is not
    # vulnerable to ambient-cookie CSRF. Cookie-authenticated requests must
    # provide the double-submit header.
    if request.headers.get("Authorization", "").startswith("Bearer "):
        return True
    if not request.cookies:
        return True
    supplied = request.headers.get("X-CSRF-Token", "")
    return bool(supplied and secrets.compare_digest(supplied, session.get("csrf_token", "")))


def _key(kind, identity):
    digest = hashlib.sha256(str(identity).encode("utf-8")).hexdigest()[:24]
    return f"security:{kind}:{digest}"


def record(kind, identity, limit, window_seconds=3600):
    key = _key(kind, identity)
    redis_client = cache.client()
    try:
        if redis_client is not None:
            pipe = redis_client.pipeline()
            pipe.incr(key, 1)
            pipe.expire(key, window_seconds)
            count = pipe.execute()[0]
        else:
            import time
            now = time.time()
            with _local_lock:
                current, expires = _local_counters.get(key, (0, now + window_seconds))
                if expires <= now:
                    current, expires = 0, now + window_seconds
                count = current + 1
                _local_counters[key] = (count, expires)
        exceeded = count > limit
        if exceeded:
            log.warning("security abuse threshold exceeded", extra={"security_event": kind, "count": count})
        return exceeded, count
    except Exception:
        log.exception("security counter failed", extra={"security_event": kind})
        return False, 0