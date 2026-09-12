"""Structured logging and request correlation.

Phase 9's first requirement is structured logging and a request id. Both exist
for one reason: when a transfer fails in production, the question is always
"what happened to *that* request", and `print()` to stdout with no correlation
cannot answer it.

Two behaviours worth knowing:

  * **JSON is emitted only in a production posture** (when `DATABASE_URL` is
    configured). Local development keeps human-readable lines, because JSON in
    a terminal is unreadable and nobody aggregates a laptop's logs.
  * **An inbound `X-Request-Id` is honoured**, so a request can be traced
    across the proxy, the API and back. It is length-capped and character-
    filtered before use: it lands in log output, and an unsanitised header
    would let a caller inject newlines and forge log entries.
"""

import json
import logging
import re
import sys
import time
import uuid

from flask import g, has_request_context, request

import config

#: Conservative allowlist — enough for a UUID or a trace id, nothing that can
#: break a log line or a JSON field.
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._:-]{1,64}$")

#: Attributes LogRecord always carries. Anything else was added by a caller via
#: `extra=` and belongs in the structured output.
_STANDARD_FIELDS = frozenset(vars(logging.makeLogRecord({})))


def current_request_id():
    """The request id for the active request, or None outside one."""
    if not has_request_context():
        return None
    return getattr(g, "request_id", None)


class RequestIdFilter(logging.Filter):
    """Attaches the request id to every record, so any logger benefits."""

    def filter(self, record):
        record.request_id = current_request_id() or "-"
        return True


class JsonFormatter(logging.Formatter):
    """One JSON object per line, for a log aggregator to parse."""

    def format(self, record):
        payload = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
                         + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        for key, value in vars(record).items():
            if key not in _STANDARD_FIELDS and key != "request_id":
                payload[key] = value
        # default=str so an unexpected object never turns a log call into a
        # TypeError inside the logging machinery.
        return json.dumps(payload, default=str)


def configure_logging(app):
    """Install the formatter, the request-id filter and request/response hooks."""
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(RequestIdFilter())
    if config.is_production_posture():
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s %(levelname)-8s [%(request_id)s] %(name)s: %(message)s"))

    root = logging.getLogger()
    # Flask installs its own handler; replacing the root handlers keeps one
    # format on stdout rather than every line appearing twice.
    root.handlers = [handler]
    root.setLevel(getattr(logging, config.LOG_LEVEL, logging.INFO))

    app.logger.handlers = []
    app.logger.propagate = True
    _install_request_hooks(app)


def _incoming_request_id():
    supplied = (request.headers.get("X-Request-Id") or "").strip()
    if supplied and _SAFE_REQUEST_ID.match(supplied):
        return supplied
    return uuid.uuid4().hex


def _install_request_hooks(app):
    @app.before_request
    def _assign_request_id():
        g.request_id = _incoming_request_id()
        g.request_started_at = time.monotonic()

    @app.after_request
    def _log_request(response):
        # Health probes fire every few seconds; logging them buries real
        # traffic. A failing probe is still logged.
        if request.path in {"/health", "/ready"} and response.status_code < 400:
            response.headers["X-Request-Id"] = getattr(g, "request_id", "-")
            return response
        started = getattr(g, "request_started_at", None)
        duration_ms = round((time.monotonic() - started) * 1000, 2) if started else None
        app.logger.info(
            "%s %s -> %s", request.method, request.path, response.status_code,
            extra={
                "http_method": request.method,
                "path": request.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
                "remote_addr": request.remote_addr,
            },
        )
        response.headers["X-Request-Id"] = getattr(g, "request_id", "-")
        return response
