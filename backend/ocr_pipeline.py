"""
Document OCR + field extraction pipeline.

This is real, working OCR (pytesseract/Tesseract), not a mock — but the field
extraction below is regex/heuristic-based rather than a trained NER model,
which is the right tradeoff for a hackathon: it's honest about its limits
(works well on clean, consistently-formatted documents; a real deployment
would need the fuller NER approach from the CTO architecture doc once there's
training data to justify it) while still being a genuinely functional pipeline
end-to-end, not smoke and mirrors.

EXTENSION POINT: swap `extract_text()`'s pytesseract call for Google Document AI
or PaddleOCR for production accuracy (see CTO doc Section 5). Swap
`parse_fields()`'s regex approach for a trained NER model or an LLM structured-
extraction call once you have labeled data / API access — the return shape
(a flat dict of field -> value) is designed to stay stable across either choice,
so nothing downstream (fraud_engine.py, app.py) needs to change.
"""

import re

# Tesseract is a system binary plus a Python wrapper, and it's the single most
# likely thing to be missing on a fresh machine. Importing it lazily means the
# server still starts and every other feature still works — the OCR endpoint
# alone returns a 503 with installation instructions. Previously a missing
# install made `import app` fail outright.
try:
    import pytesseract
    from PIL import Image
    _IMPORT_ERROR = None
except ImportError as e:  # pragma: no cover - depends on local install
    pytesseract = None
    Image = None
    _IMPORT_ERROR = e


class OCRUnavailable(RuntimeError):
    """Raised when OCR can't run. app.py renders this as HTTP 503."""


_INSTALL_HINT = (
    "OCR is unavailable: {reason}. The Python packages come from "
    "`pip install -r requirements.txt`, but Tesseract itself is a separate "
    "system binary — install it with `winget install UB-Mannheim.TesseractOCR` "
    "(Windows), `brew install tesseract` (macOS), or "
    "`sudo apt-get install tesseract-ocr` (Debian/Ubuntu). Everything else in "
    "the app works without it; you can type transfer details in by hand."
)


def _require_tesseract():
    if pytesseract is None:
        raise OCRUnavailable(_INSTALL_HINT.format(
            reason=f"Python package missing ({_IMPORT_ERROR})"
        ))


def extract_text(image_path: str) -> str:
    """Runs Tesseract OCR on an image file and returns raw extracted text."""
    _require_tesseract()
    try:
        img = Image.open(image_path)
        return pytesseract.image_to_string(img)
    except pytesseract.TesseractNotFoundError as e:
        raise OCRUnavailable(_INSTALL_HINT.format(
            reason="the Tesseract binary is not on PATH"
        )) from e
    except OSError as e:
        # Pillow raises OSError for an unreadable or non-image file.
        raise OCRUnavailable(
            f"could not read that file as an image ({e}). Upload a PNG or JPG."
        ) from e


def parse_fields(raw_text: str) -> dict:
    """
    Heuristic field extraction from OCR text. Looks for 'Label: Value' style
    lines, which is how the sample deed generator (and most real government
    deed templates) format documents. Returns whatever it finds; missing
    fields are simply absent from the dict rather than raising an error —
    callers should treat absence as "needs manual entry," not a crash.
    """
    fields = {}

    patterns = {
        "owner_name": r"(?:Owner|Seller)\s*:\s*(.+)",
        "buyer_name": r"Buyer\s*:\s*(.+)",
        "survey_number": r"Survey\s*(?:No\.?|Number)\s*:\s*(.+)",
        "ulpin": r"ULPIN\s*:\s*(.+)",
        "area_sqm": r"Area\s*(?:\(sqm\))?\s*:\s*([\d.]+)",
        "transaction_date": r"Date\s*:\s*([\d\-/]+)",
        "registration_office": r"(?:Registration Office|Sub-Registrar)\s*:\s*(.+)",
    }

    for field_name, pattern in patterns.items():
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if match:
            fields[field_name] = match.group(1).strip()

    # normalize date format if possible (DD/MM/YYYY or DD-MM-YYYY -> YYYY-MM-DD)
    if "transaction_date" in fields:
        d = fields["transaction_date"]
        m = re.match(r"(\d{1,2})[-/](\d{1,2})[-/](\d{4})", d)
        if m:
            day, month, year = m.groups()
            fields["transaction_date"] = f"{year}-{int(month):02d}-{int(day):02d}"

    if "area_sqm" in fields:
        try:
            fields["area_sqm"] = float(fields["area_sqm"])
        except ValueError:
            pass

    return fields


def extract_confidence(raw_text: str, parsed_fields: dict) -> float:
    """
    Crude confidence proxy for the hackathon tier: fraction of the fields we
    attempted to extract that were actually found. A real system would use
    Tesseract's per-word confidence scores (image_to_data) instead — left as
    an extension point since it adds complexity without changing the demo story.
    """
    expected_fields = 4  # owner/seller, survey_number or ulpin, area, date — the core set
    found = sum(1 for k in ("owner_name", "survey_number", "area_sqm", "transaction_date")
                if k in parsed_fields)
    return round(found / expected_fields, 2)


def process_document(image_path: str) -> dict:
    """Full pipeline: image in, structured extraction result out."""
    raw_text = extract_text(image_path)
    fields = parse_fields(raw_text)
    confidence = extract_confidence(raw_text, fields)
    return {
        "raw_text": raw_text.strip(),
        "extracted_fields": fields,
        "confidence": confidence,
    }
