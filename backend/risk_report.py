"""
Turns raw fraud-engine output into a plain-English explanation.

Default mode: pure template, zero dependencies, zero API keys, always works
offline — good for a live demo where you don't want a flaky network call.

Optional mode: if ANTHROPIC_API_KEY is set, `explain()` calls Claude to smooth
the wording into a more natural narrative — but critically, it is only ever
asked to NARRATE the exact flags already computed by the rule engine, never to
invent or re-derive the reasoning itself (see ADR-5 in the architecture doc on
why grounding matters — an LLM asked to "explain why this was flagged" from
scratch can confabulate; one asked to narrate a fixed list of facts cannot).

THE GROUNDING CONTRACT, CONCRETELY
The model receives the computed flags and is instructed to narrate only those.
Three things enforce that beyond the prompt text:

  1. The risk score, status, and flag codes shown to the user come from the
     rule engine, not from the model's output — the narration is presentation
     only, and cannot change a verdict.
  2. `_verify_grounding()` rejects a response that invented a fraud-rule code
     the engine didn't emit, or that contradicts the computed status.
  3. Any failure — missing key, network error, timeout, failed grounding
     check — falls back to the deterministic template. The demo cannot break
     because of an API call.

That last property is why the LLM path is safe to leave enabled during a live
demo: the worst case is that the wording gets less polished, not that the page
errors or the verdict changes.
"""

import json
import logging
import os

log = logging.getLogger(__name__)

# Claude Haiku 4.5 is the right fit here: this is a short, highly-constrained
# rewriting task on a request path a registrar is waiting on, so latency and
# cost matter more than deep reasoning. The heavy lifting is the rule engine's.
LLM_MODEL = os.environ.get("RISK_REPORT_MODEL", "claude-haiku-4-5-20251001")

# Keep the whole call snappy; the template fallback is always available, so
# waiting a long time for prettier prose is a bad trade on a demo path.
LLM_TIMEOUT_SECONDS = float(os.environ.get("RISK_REPORT_TIMEOUT", "12"))
LLM_MAX_TOKENS = 600


def _template_explanation(assessment: dict, prop: dict, req: dict) -> str:
    if not assessment["flags"]:
        return (
            f"No fraud indicators detected for this transfer of parcel "
            f"{prop['ulpin']}. Seller matches the current registered owner, "
            f"claimed area and transaction date are consistent with the "
            f"historical record. Recommended: proceed to on-chain registration."
        )

    lines = [
        f"Risk Score: {assessment['composite_risk_score']} "
        f"({assessment['status']}) for parcel {prop['ulpin']}.",
        "",
        "Flagged issues:",
    ]
    for f in assessment["flags"]:
        marker = "‼" if f["severity"] == "hard" else "!"
        lines.append(f"  [{marker}] {f['code']}: {f['message']}")

    lines.append("")
    if assessment["status"] == "HIGH_RISK":
        lines.append(
            "Recommendation: BLOCK this transfer pending investigation. "
            "Do not commit to the chain until a registrar has manually reviewed "
            "the evidence above."
        )
    elif assessment["status"] == "FLAGGED":
        lines.append(
            "Recommendation: route to a registrar for manual review before "
            "on-chain commitment."
        )
    else:  # AUTO_APPROVED with minor, below-threshold flags
        lines.append(
            "Recommendation: proceed to on-chain registration. The flag(s) above "
            "are below the escalation threshold and are logged for audit purposes "
            "only — no manual review is required, but this is retained in the "
            "record for future pattern analysis."
        )

    return "\n".join(lines)


SYSTEM_PROMPT = """\
You are a fraud-risk report writer for an Indian land title registry. A \
deterministic rule engine has already analysed a proposed property transfer \
and produced its verdict. Your only job is to render that verdict as prose a \
sub-registrar can read quickly.

Rules you must follow:
- Narrate ONLY the flags provided. Never introduce a concern that is not in \
the list, however plausible it seems.
- Never change, soften, or dispute the risk score or status. They are final.
- Do not speculate about motive, guilt, or the people involved. Describe what \
the record shows.
- Refer to parties by the role given (seller, buyer, registered owner). Do not \
invent names, dates, amounts, or document references.
- If the flag list is empty, say plainly that no indicators were found.

Format: 2-4 short paragraphs of plain prose. No markdown, no headings, no \
bullet points. Open with the verdict and what it means. Then explain each \
flag in the order given, in plain language a non-specialist understands. \
Close with the recommended action, which must match the status:
  AUTO_APPROVED -> proceed to on-chain registration
  FLAGGED       -> route to a registrar for manual review before committing
  HIGH_RISK     -> block pending investigation; do not commit
Write in British English. Be precise and unsentimental."""


def _build_user_prompt(assessment: dict, prop: dict, req: dict) -> str:
    """
    Serialises the ground truth. Everything the model is allowed to talk about
    is in here; nothing else is provided, which is the point.
    """
    facts = {
        "parcel": {
            "ulpin": prop["ulpin"],
            "survey_number": prop.get("survey_number"),
            "registered_area_sqm": prop.get("area_sqm"),
            "current_registered_owner": prop.get("current_owner"),
            "last_registered_date": prop.get("last_registered_date"),
        },
        "proposed_transfer": {
            "seller_as_claimed": req.get("seller"),
            "buyer": req.get("buyer"),
            "claimed_area_sqm": req.get("claimed_area_sqm"),
            "transaction_date": req.get("transaction_date"),
        },
        "verdict": {
            "status": assessment["status"],
            "composite_risk_score": assessment["composite_risk_score"],
        },
        "computed_flags": [
            {
                "code": f["code"],
                "severity": f["severity"],
                "finding": f["message"],
            }
            for f in assessment["flags"]
        ],
    }
    return (
        "Render the following rule-engine output as a risk report.\n\n"
        f"{json.dumps(facts, indent=2, ensure_ascii=False)}"
    )


def _verify_grounding(text: str, assessment: dict) -> bool:
    """
    Cheap, deterministic check that the narration didn't drift from the
    computed verdict. This is not a general hallucination detector — it catches
    the two failure modes that would actually mislead a registrar:

      1. Citing a fraud-rule code the engine never raised.
      2. Recommending an action that contradicts the computed status
         (e.g. telling a registrar to proceed on a HIGH_RISK transfer).

    Returns False to trigger the template fallback.
    """
    if not text or not text.strip():
        return False

    upper = text.upper()
    raised = {f["code"] for f in assessment["flags"]}
    known_codes = {
        "DUPLICATE_OWNERSHIP", "AREA_MISMATCH", "SUSPICIOUS_DATE_SEQUENCE",
        "TRANSFER_VELOCITY", "BOUNDARY_OVERLAP",
    }
    for code in known_codes - raised:
        if code in upper:
            log.warning(
                "LLM narration cited flag %s which the engine did not raise; "
                "falling back to template.", code
            )
            return False

    # A blocked transfer must not be narrated as approvable.
    if assessment["status"] == "HIGH_RISK":
        approving = ("PROCEED TO ON-CHAIN", "AUTO-APPROVED", "AUTO_APPROVED",
                     "NO FRAUD INDICATORS", "NO INDICATORS WERE FOUND")
        if any(phrase in upper for phrase in approving):
            log.warning(
                "LLM narration recommended proceeding on a HIGH_RISK "
                "assessment; falling back to template."
            )
            return False

    # A clean transfer must not be narrated as blocked.
    if assessment["status"] == "AUTO_APPROVED" and not assessment["flags"]:
        if "BLOCK" in upper:
            log.warning(
                "LLM narration described a clean transfer as blocked; "
                "falling back to template."
            )
            return False

    return True


def _llm_explanation(assessment: dict, prop: dict, req: dict) -> str:
    """
    Calls Claude to narrate the already-computed flags. Raises on any failure;
    `explain()` catches and falls back to the template.
    """
    import anthropic

    client = anthropic.Anthropic(timeout=LLM_TIMEOUT_SECONDS, max_retries=1)
    response = client.messages.create(
        model=LLM_MODEL,
        max_tokens=LLM_MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": _build_user_prompt(assessment, prop, req),
        }],
    )

    text = "".join(
        block.text for block in response.content
        if getattr(block, "type", None) == "text"
    ).strip()

    if not _verify_grounding(text, assessment):
        raise ValueError("LLM narration failed the grounding check")
    return text


def explain_with_source(assessment: dict, prop: dict, req: dict):
    """
    Returns (explanation_text, source) where source is "claude" or "template".

    The source is surfaced in the API response so the UI can label AI-generated
    prose as such — a registrar should always know whether they're reading a
    deterministic report or a model's rendering of one.
    """
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            return _llm_explanation(assessment, prop, req), "claude"
        except ImportError:
            log.warning(
                "ANTHROPIC_API_KEY is set but the `anthropic` package is not "
                "installed (pip install anthropic); using template explanations."
            )
        except Exception as e:
            # Deliberately broad: a demo must never fail because of a network
            # blip, a rate limit, a bad key, or a grounding rejection.
            log.warning("LLM explanation unavailable (%s); using template.", e)
    return _template_explanation(assessment, prop, req), "template"


def explain(assessment: dict, prop: dict, req: dict) -> str:
    """Backwards-compatible wrapper returning just the text."""
    return explain_with_source(assessment, prop, req)[0]
