"""Single source of truth for process configuration.

Importing this module is always safe; call `validate()` once at startup so a
missing or malformed variable becomes a clear boot error instead of an
AttributeError at the first query, halfway through a request.

Both DATABASE_URL and REDIS_URL are optional by design. Without them the app
falls back to the in-memory registry and process-local sessions, which is what
keeps the zero-infrastructure offline demo runnable. What is *not* allowed is a
half-configured production posture, and `validate()` is where that is caught.
"""

import os
import sys
from pathlib import Path


def _load_workspace_dotenv():
    """Load the root `.env` without making python-dotenv a runtime dependency.

    Real environment variables always win, so containers and deployment secret
    stores retain precedence over a developer's local file.
    """
    # Tests deliberately remove DATABASE_URL to exercise the in-memory
    # fallback; a developer's local `.env` must not silently defeat that.
    if "pytest" in sys.modules:
        return
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if not env_file.is_file():
        return
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key or not key.replace("_", "").isalnum():
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ.setdefault(key, value)


_load_workspace_dotenv()

# Values a developer should never be able to deploy with.
_INSECURE_SECRETS = {
    "",
    "change-me",
    "changeme",
    "local-dev-only",
    "local-dev-only-change-me",
    "secret",
}


class ConfigError(RuntimeError):
    """The environment cannot support the requested mode. Raised at startup."""


def _text(name, default=""):
    return (os.environ.get(name) or default).strip()


def _number(name, default):
    raw = _text(name)
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} must be an integer, got {raw!r}") from exc


def _flag(name, default=False):
    raw = _text(name)
    if not raw:
        return default
    if raw.lower() in {"1", "true", "yes", "on"}:
        return True
    if raw.lower() in {"0", "false", "no", "off"}:
        return False
    raise ConfigError(f"{name} must be true or false, got {raw!r}")


# ----------------------------------------------------------- persistence ----
DATABASE_URL = _text("DATABASE_URL")
REDIS_URL = _text("REDIS_URL")

#: "postgres" once DATABASE_URL is set, otherwise the in-memory V2Registry.
PERSISTENCE = "postgres" if DATABASE_URL else "memory"
#: "redis" once REDIS_URL is set, otherwise process-local dicts.
CACHE = "redis" if REDIS_URL else "memory"

# --------------------------------------------------------------- sessions ----
SESSION_SECRET = _text("SESSION_SECRET")
SESSION_TTL_SECONDS = _number("SESSION_TTL_SECONDS", 3600)
# Local Flask is a single process, so an explicitly opted-in fallback is safe
# for a disconnected demo. Production deployments must leave this disabled.
ALLOW_LOCAL_SESSION_FALLBACK = _flag("ALLOW_LOCAL_SESSION_FALLBACK", False)

# ------------------------------------------------------------ edge limits ----
RATE_LIMIT_PER_MINUTE = _number("RATE_LIMIT_PER_MINUTE", 120)
ALLOWED_ORIGIN = _text("ALLOWED_ORIGIN")

# ------------------------------------------------------------------ chain ----
CHAIN_MODE = _text("CHAIN_MODE", "mock").lower()
MST_RPC_URL = _text("MST_RPC_URL")
MST_CHAIN_ID = _number("MST_CHAIN_ID", 91562037)
MST_WALLET_ADDRESS = _text("MST_WALLET_ADDRESS")
MST_PRIVATE_KEY = _text("MST_PRIVATE_KEY")

# ----------------------------------------------------------------- worker ----
OUTBOX_POLL_INTERVAL = _number("OUTBOX_POLL_INTERVAL", 5)
OUTBOX_MAX_ATTEMPTS = _number("OUTBOX_MAX_ATTEMPTS", 5)
OUTBOX_BATCH_SIZE = _number("OUTBOX_BATCH_SIZE", 10)

# ---------------------------------------------------------- observability ----
LOG_LEVEL = _text("LOG_LEVEL", "INFO").upper()


def is_production_posture():
    """True once real persistence is configured.

    Used to decide whether weak defaults are a warning or a hard failure: on
    the offline demo path they are fine, on a persistent deployment they are
    not.
    """
    return PERSISTENCE == "postgres"


def validate():
    """Raise ConfigError describing *every* problem, not just the first.

    Reporting them together matters in a container: each failed boot costs a
    restart cycle, so surfacing one variable at a time is expensive.
    """
    problems = []

    if DATABASE_URL and not DATABASE_URL.startswith(("postgresql://", "postgres://")):
        problems.append("DATABASE_URL must be a postgresql:// URL")

    if REDIS_URL and not REDIS_URL.startswith(("redis://", "rediss://", "unix://")):
        problems.append("REDIS_URL must be a redis://, rediss:// or unix:// URL")

    if CHAIN_MODE not in {"mock", "live"}:
        problems.append(f"CHAIN_MODE must be 'mock' or 'live', got {CHAIN_MODE!r}")

    mst_values = (MST_RPC_URL, MST_WALLET_ADDRESS, MST_PRIVATE_KEY)
    if any(mst_values) and not all(mst_values):
        problems.append(
            "MST_RPC_URL, MST_WALLET_ADDRESS and MST_PRIVATE_KEY must be set together"
        )
    if CHAIN_MODE == "live" and not all(mst_values):
        problems.append(
            "CHAIN_MODE=live requires MST_RPC_URL, MST_WALLET_ADDRESS and MST_PRIVATE_KEY"
        )
    if MST_CHAIN_ID <= 0:
        problems.append("MST_CHAIN_ID must be greater than 0")

    if SESSION_TTL_SECONDS <= 0:
        problems.append("SESSION_TTL_SECONDS must be greater than 0")

    if RATE_LIMIT_PER_MINUTE <= 0:
        problems.append("RATE_LIMIT_PER_MINUTE must be greater than 0")

    if OUTBOX_POLL_INTERVAL <= 0:
        problems.append("OUTBOX_POLL_INTERVAL must be greater than 0")

    if OUTBOX_MAX_ATTEMPTS <= 0:
        problems.append("OUTBOX_MAX_ATTEMPTS must be greater than 0")

    if is_production_posture():
        # Persisting real state means sessions outlive the process, so a
        # guessable signing secret is now a real vulnerability rather than a
        # demo convenience.
        if SESSION_SECRET.lower() in _INSECURE_SECRETS:
            problems.append(
                "SESSION_SECRET must be set to a strong random value when "
                "DATABASE_URL is configured"
            )
        if not REDIS_URL and not ALLOW_LOCAL_SESSION_FALLBACK:
            problems.append(
                "REDIS_URL is required alongside DATABASE_URL — process-local "
                "sessions and rate limits are not correct across workers"
            )

    if problems:
        raise ConfigError(
            "Invalid configuration:\n  - " + "\n  - ".join(problems)
        )


def summary():
    """Non-secret snapshot for boot logs and /ready. Never include credentials."""
    return {
        "persistence": PERSISTENCE,
        "cache": CACHE,
        "chain_mode": CHAIN_MODE,
        "mst_chain_id": MST_CHAIN_ID,
        "rate_limit_per_minute": RATE_LIMIT_PER_MINUTE,
        "session_ttl_seconds": SESSION_TTL_SECONDS,
        "allow_local_session_fallback": ALLOW_LOCAL_SESSION_FALLBACK,
        "outbox_poll_interval": OUTBOX_POLL_INTERVAL,
    }
