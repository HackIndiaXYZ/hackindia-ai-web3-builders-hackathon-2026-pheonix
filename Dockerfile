FROM python:3.12-slim

# Tesseract is the OCR *binary*. pytesseract alone is not enough — without it
# /api/documents/upload returns a 503 (see app.py:upload_document).
# curl is used by the compose healthcheck against /health.
RUN apt-get update \
 && apt-get install -y --no-install-recommends tesseract-ocr curl \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies first so a source edit does not invalidate the pip layer.
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ backend/
# app.py serves the compiled SPA from ../frontend — same origin, no CORS.
COPY frontend/index.html frontend/index.html
COPY frontend/dist/ frontend/dist/

# app.py resolves FRONTEND_DIR relative to its own location, and the backend
# is a set of flat top-level modules rather than a package, so both the API
# and the worker must run with backend/ as the working directory.
WORKDIR /app/backend

RUN useradd --create-home --uid 10001 appuser \
 && mkdir -p /app/backend/data/documents \
 && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

# Two workers is deliberate: it is the smallest configuration that exercises
# the cross-process assumptions (shared sessions, shared rate limits, row
# locks) that this migration exists to satisfy.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "60", \
     "--access-logfile", "-", "--error-logfile", "-", "app:app"]
