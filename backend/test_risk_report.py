"""
Tests for risk report generation.

The template path must be deterministic and offline. The LLM path is tested
with a stubbed client — no network, no API key needed — and the emphasis is on
the *safety properties*: a model response that drifts from the computed
verdict must be rejected, and any failure whatsoever must fall back to the
template rather than propagating an error to the user.
"""

import sys
import types

import pytest

import risk_report
from risk_report import _template_explanation, _verify_grounding, explain_with_source

PROP = {
    "ulpin": "UP-0001-CLEAN",
    "survey_number": "SN-245-A",
    "current_owner": "Rajesh Kumar",
    "area_sqm": 1200,
    "last_registered_date": "2022-03-15",
}
REQ = {
    "seller": "Rajesh Kumar",
    "buyer": "Sunita Kumar",
    "claimed_area_sqm": 1200,
    "transaction_date": "2026-09-08",
}

CLEAN = {"flags": [], "composite_risk_score": 0.0, "status": "AUTO_APPROVED", "ml_score": None}
HIGH_RISK = {
    "flags": [{
        "code": "DUPLICATE_OWNERSHIP", "severity": "hard",
        "message": "Seller does not match the registered owner.",
    }],
    "composite_risk_score": 0.5,
    "status": "HIGH_RISK",
    "ml_score": None,
}
FLAGGED = {
    "flags": [{
        "code": "AREA_MISMATCH", "severity": "soft", "weight": 0.35,
        "message": "Claimed area deviates 20% from the registered area.",
    }],
    "composite_risk_score": 0.35,
    "status": "FLAGGED",
    "ml_score": None,
}


@pytest.fixture(autouse=True)
def no_api_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)


# ------------------------------------------------------------- template path

def test_clean_template_mentions_no_indicators():
    text = _template_explanation(CLEAN, PROP, REQ)
    assert "No fraud indicators detected" in text
    assert PROP["ulpin"] in text


def test_high_risk_template_recommends_blocking():
    text = _template_explanation(HIGH_RISK, PROP, REQ)
    assert "BLOCK" in text
    assert "DUPLICATE_OWNERSHIP" in text


def test_flagged_template_recommends_manual_review():
    assert "manual review" in _template_explanation(FLAGGED, PROP, REQ)


def test_template_is_used_when_no_api_key_present():
    text, source = explain_with_source(HIGH_RISK, PROP, REQ)
    assert source == "template"
    assert "BLOCK" in text


# --------------------------------------------------------- grounding guard

def test_grounding_accepts_a_faithful_narration():
    text = (
        "This transfer has been assessed as high risk with a score of 0.5. The "
        "seller named does not match the current registered owner, which is a "
        "duplicate ownership indicator. Recommendation: block pending "
        "investigation."
    )
    assert _verify_grounding(text, HIGH_RISK) is True


def test_grounding_rejects_an_invented_flag_code():
    """The model must not cite a rule the engine never raised."""
    text = (
        "High risk. The seller does not match the registered owner, and a "
        "BOUNDARY_OVERLAP was also detected. Block pending investigation."
    )
    assert _verify_grounding(text, HIGH_RISK) is False


def test_grounding_rejects_approving_a_high_risk_transfer():
    """The most dangerous drift: narrating a blocked transfer as proceedable."""
    text = "Minor discrepancies only. Recommendation: proceed to on-chain registration."
    assert _verify_grounding(text, HIGH_RISK) is False


def test_grounding_rejects_blocking_a_clean_transfer():
    text = "Recommendation: BLOCK this transfer pending investigation."
    assert _verify_grounding(text, CLEAN) is False


def test_grounding_rejects_empty_output():
    assert _verify_grounding("", HIGH_RISK) is False
    assert _verify_grounding("   \n ", HIGH_RISK) is False


def test_grounding_allows_flags_that_were_actually_raised():
    text = (
        "Flagged for review. The claimed area deviates materially from the "
        "registered area, an AREA_MISMATCH indicator. Route to a registrar "
        "for manual review before committing."
    )
    assert _verify_grounding(text, FLAGGED) is True


# ------------------------------------------------------------- LLM path

class _FakeBlock:
    def __init__(self, text):
        self.type = "text"
        self.text = text


class _FakeResponse:
    def __init__(self, text):
        self.content = [_FakeBlock(text)]


def _install_fake_anthropic(monkeypatch, behaviour):
    """
    Injects a stand-in `anthropic` module. `behaviour` is called with the
    create() kwargs and either returns response text or raises.
    """
    captured = {}

    class FakeMessages:
        def create(self, **kwargs):
            captured.update(kwargs)
            return _FakeResponse(behaviour(kwargs))

    class FakeAnthropic:
        def __init__(self, **kwargs):
            captured["client_kwargs"] = kwargs
            self.messages = FakeMessages()

    module = types.ModuleType("anthropic")
    module.Anthropic = FakeAnthropic
    monkeypatch.setitem(sys.modules, "anthropic", module)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    return captured


def test_llm_narration_is_used_when_available(monkeypatch):
    narration = (
        "This transfer is assessed as high risk. The seller named on the deed "
        "is not the current registered owner of the parcel, a duplicate "
        "ownership indicator. Recommendation: block pending investigation."
    )
    _install_fake_anthropic(monkeypatch, lambda _: narration)
    text, source = explain_with_source(HIGH_RISK, PROP, REQ)
    assert source == "claude"
    assert text == narration


def test_llm_prompt_carries_the_computed_flags_as_ground_truth(monkeypatch):
    captured = _install_fake_anthropic(
        monkeypatch,
        lambda _: "High risk: duplicate ownership. Block pending investigation.",
    )
    explain_with_source(HIGH_RISK, PROP, REQ)

    prompt = captured["messages"][0]["content"]
    assert "DUPLICATE_OWNERSHIP" in prompt
    assert "HIGH_RISK" in prompt
    # The system prompt must carry the do-not-invent instruction.
    assert "Narrate ONLY the flags provided" in captured["system"]
    # A bounded, timeout-guarded call — this is on a request path.
    assert captured["max_tokens"] == risk_report.LLM_MAX_TOKENS
    assert captured["client_kwargs"]["timeout"] == risk_report.LLM_TIMEOUT_SECONDS


def test_api_failure_falls_back_to_template(monkeypatch):
    """A network blip, rate limit, or bad key must not break the demo."""
    def boom(_):
        raise RuntimeError("connection reset")

    _install_fake_anthropic(monkeypatch, boom)
    text, source = explain_with_source(HIGH_RISK, PROP, REQ)
    assert source == "template"
    assert "BLOCK" in text


def test_ungrounded_response_falls_back_to_template(monkeypatch):
    """A model that contradicts the verdict is discarded, not shown."""
    _install_fake_anthropic(
        monkeypatch,
        lambda _: "All clear. Recommendation: proceed to on-chain registration.",
    )
    text, source = explain_with_source(HIGH_RISK, PROP, REQ)
    assert source == "template"
    assert "BLOCK" in text


def test_missing_anthropic_package_falls_back_to_template(monkeypatch):
    """
    ANTHROPIC_API_KEY set but the SDK not installed — a very likely
    misconfiguration. Must degrade silently to the template.
    """
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr(
        risk_report, "_llm_explanation",
        lambda *a, **k: (_ for _ in ()).throw(ImportError("No module named 'anthropic'")),
    )
    text, source = explain_with_source(HIGH_RISK, PROP, REQ)
    assert source == "template"
    assert "BLOCK" in text
