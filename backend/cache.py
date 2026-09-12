"""Shared edge state: rate-limit counters, sessions and lookup caches.

Two backends sit behind one API:

  * **Redis**, when ``REDIS_URL`` is configured. This is required in a
    production posture, not an optimisation: process-local counters and
    sessions are simply wrong once more than one worker serves traffic, and
    the container image runs two. A user who logs in through worker A and is
    then routed to worker B would otherwise be told their token is invalid.
  * **An in-process fallback** otherwise, so the zero-infrastructure demo
    behaves exactly as it did before this module existed.

Degradation is deliberately asymmetric when Redis is configured but
unreachable:

  * rate limiting **fails open** — the limiter is a courtesy control at the
    edge, and a cache outage must not take the registry offline;
  * session lookup **fails closed** — returning "no session" logs people out,
    which is recoverable; failing open would hand out authority on an
    infrastructure error, which is not.

Nothing here imports redis at module scope, so importing this module never
fails and the offline demo needs nothing installed.
"""

import json
import logging
import time

import config

log = logging.getLogger(__name__)

_client = None
_client_unavailable = False

#: (identity, window) -> count. Only used when REDIS_URL is unset.
_local_counters = {}
#: key -> (value, expires_at). Only used when REDIS_URL is unset.
_local_values = {}


def enabled():
    """True when Redis is the configured backend for shared state."""
    return bool(config.REDIS_URL)


def client():
    """The shared Redis client, or None when Redis is unconfigured/unusable.

    `from_url` does not connect, so construction failing means the URL or the
    package is wrong — a permanent condition worth latching. Command failures
    are transient and handled per call, so they never latch.
    """
    global _client, _client_unavailable
    if not config.REDIS_URL or _client_unavailable:
        return None
    if _client is not None:
        return _client
    try:
        import redis
    except ImportError:
        log.warning("REDIS_URL is set but the redis package is not installed; "
                    "falling back to process-local state")
        _client_unavailable = True
        return None
    try:
        _client = redis.Redis.from_url(
            config.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            health_check_interval=30,
        )
    except Exception:
        log.exception("could not construct a Redis client from REDIS_URL")
        _client_unavailable = True
        return None
    return _client


def ping():
    """True when Redis answers. Used by /ready; never raises."""
    conn = client()
    if conn is None:
        return False
    try:
        return bool(conn.ping())
    except Exception:
        return False


# ---------------------------------------------------------- rate limiting ----

def rate_limit_exceeded(identity, limit, window_seconds=60):
    """Count one request for `identity` and report whether it is over `limit`.

    The window number is part of the key, so a bucket is only ever written
    during its own window and simply expires afterwards. That is what removes
    the unbounded dictionary growth the previous in-process counter had.
    """
    window = int(time.time() // window_seconds)
    conn = client()
    if conn is None:
        if config.REDIS_URL:
            return False  # configured but unusable: fail open, see docstring
        return _local_rate_limit_exceeded(identity, window, limit)
    try:
        pipe = conn.pipeline()
        pipe.incr(f"ratelimit:{identity}:{window}", 1)
        # +5s of slack so a counter cannot outlive its window's usefulness but
        # also cannot vanish mid-window because of clock skew.
        pipe.expire(f"ratelimit:{identity}:{window}", window_seconds + 5)
        count = pipe.execute()[0]
    except Exception:
        log.warning("rate limit check failed; allowing the request", exc_info=True)
        return False
    return count > limit


def _local_rate_limit_exceeded(identity, window, limit):
    # Drop counters from earlier windows. The original implementation retained
    # every (ip, minute) pair for the lifetime of the process, a slow leak on
    # any long-running server.
    for stale in [k for k in _local_counters if k[1] != window]:
        del _local_counters[stale]
    bucket = (identity, window)
    _local_counters[bucket] = _local_counters.get(bucket, 0) + 1
    return _local_counters[bucket] > limit


# ----------------------------------------------------------------- values ----

def cached_set(key, value, ttl_seconds):
    """Store a JSON-serialisable value. Best effort — never raises."""
    conn = client()
    if conn is None:
        _local_values[key] = (value, time.time() + ttl_seconds)
        return
    try:
        conn.setex(key, int(ttl_seconds), json.dumps(value))
    except Exception:
        log.warning("cache write failed for %s", key, exc_info=True)


def cached_get(key):
    """Return a cached value, or None. A miss and a failure are both None:
    every caller of this must be able to recompute the value."""
    conn = client()
    if conn is None:
        entry = _local_values.get(key)
        if not entry:
            return None
        value, expires_at = entry
        if expires_at <= time.time():
            del _local_values[key]
            return None
        return value
    try:
        raw = conn.get(key)
    except Exception:
        log.warning("cache read failed for %s", key, exc_info=True)
        return None
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return None


def cached_delete(key):
    conn = client()
    if conn is None:
        _local_values.pop(key, None)
        return
    try:
        conn.delete(key)
    except Exception:
        log.warning("cache delete failed for %s", key, exc_info=True)


# --------------------------------------------------------------- sessions ----
# The in-process fallback for sessions stays in auth.py (its existing
# `_SESSIONS` dict) so the offline path is unchanged and the test suite's reset
# hook keeps working. These helpers are the Redis half only, and are called
# exclusively when `enabled()` is true.

class SessionBackendUnavailable(RuntimeError):
    """Redis is the configured session store and it did not answer.

    Raised rather than returning None so a caller cannot mistake an
    infrastructure failure for a validly absent session.
    """


def session_put(token, payload, ttl_seconds):
    conn = client()
    if conn is None:
        raise SessionBackendUnavailable("session store is unavailable")
    try:
        conn.setex(f"session:{token}", int(ttl_seconds), json.dumps(payload))
    except Exception as exc:
        raise SessionBackendUnavailable("session store is unavailable") from exc


def session_get(token):
    """The session payload, or None when the token is unknown or expired.

    Raises SessionBackendUnavailable if Redis cannot be reached, so the caller
    returns 503 instead of silently treating everyone as unauthenticated —
    and, far worse, instead of any chance of failing open.
    """
    conn = client()
    if conn is None:
        raise SessionBackendUnavailable("session store is unavailable")
    try:
        raw = conn.get(f"session:{token}")
    except Exception as exc:
        raise SessionBackendUnavailable("session store is unavailable") from exc
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        # A corrupt value is not a valid session; drop it rather than trust it.
        cached_delete(f"session:{token}")
        return None


def session_delete(token):
    conn = client()
    if conn is None:
        return
    try:
        conn.delete(f"session:{token}")
    except Exception:
        log.warning("session delete failed", exc_info=True)


def reset_local():
    """Clear the in-process fallback state. For tests only."""
    _local_counters.clear()
    _local_values.clear()
