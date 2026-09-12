import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiUploadCloud, FiCheckCircle, FiXCircle, FiLock, FiCpu, FiAlertTriangle } from "react-icons/fi";
import { apiPost } from "../lib/api.js";
import { navigate } from "../hooks/useHashRoute.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { BoundaryOverlapSVG } from "../components/BoundaryOverlapSVG.jsx";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-base-800 px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-600 outline-none transition-shadow focus:border-accent/50 focus:shadow-glow-sm";

function DropZone({ onFile, loading, result, error }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent/[0.06]" : "border-white/15 hover:border-white/25"
        }`}
      >
        <FiUploadCloud className={`h-8 w-8 ${dragging ? "text-accent" : "text-zinc-500"}`} />
        <p className="mt-3 text-sm text-zinc-300">
          Drag a scanned deed here, or <span className="text-accent">browse</span>
        </p>
        <p className="mt-1 text-xs text-zinc-600">PNG or JPG — real OCR via Tesseract</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
        />
      </div>

      {loading && <p className="mt-3 text-sm text-zinc-500">Running OCR…</p>}

      {/* OCR is the one feature with an external system dependency, so its
          failure gets explained in place rather than as a generic error. */}
      {error && (
        <div className="mt-3 rounded-lg border border-risk-flagged/30 bg-risk-flagged/5 p-4 text-xs leading-relaxed text-risk-flagged">
          {error}
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-lg border border-white/10 bg-base-800 p-4"
          >
            <div className="text-xs text-zinc-400">
              Extraction confidence:{" "}
              <span className="font-mono text-accent">{Math.round(result.confidence * 100)}%</span>
            </div>
            <pre className="mt-2 overflow-x-auto font-mono text-xs text-zinc-500">
              {JSON.stringify(result.extracted_fields, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const EMPTY_FORM = {
  ulpin: "", seller: "", buyer: "", claimed_area_sqm: "",
  transaction_date: "", claimed_boundary: "",
};

export function TransferPage({ auth }) {
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [assessment, setAssessment] = useState(null);
  const [commitResult, setCommitResult] = useState(null);
  const [certResult, setCertResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isRegistrar = auth.isRegistrar;

  const uploadDoc = async (file) => {
    setOcrLoading(true); setOcrResult(null); setOcrError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await apiPost("/documents/upload", fd, auth.token, true);
      setOcrResult(data);
      const f = data.extracted_fields;
      setForm((prev) => ({
        ...prev,
        ulpin: f.ulpin || prev.ulpin,
        seller: f.owner_name || prev.seller,
        buyer: f.buyer_name || prev.buyer,
        claimed_area_sqm: f.area_sqm || prev.claimed_area_sqm,
        transaction_date: f.transaction_date || prev.transaction_date,
      }));
    } catch (err) {
      setOcrError(err.message);
    } finally {
      setOcrLoading(false);
    }
  };

  const runCheck = async (e) => {
    e.preventDefault();
    setError(""); setAssessment(null); setCommitResult(null); setCertResult(null);
    setShowOverride(false); setOverrideReason("");

    let claimed_boundary = null;
    if (form.claimed_boundary.trim()) {
      try {
        claimed_boundary = JSON.parse(form.claimed_boundary);
      } catch {
        setError(
          'Boundary must be valid JSON, e.g. [[0,0],[50,0],[50,30],[0,30]]'
        );
        return;
      }
    }

    setBusy(true);
    try {
      const data = await apiPost("/transfers", {
        ulpin: form.ulpin.trim(),
        seller: form.seller.trim(),
        buyer: form.buyer.trim(),
        // Send the raw string; the backend validates and reports precisely
        // what's wrong, rather than the UI silently coercing "" to NaN.
        claimed_area_sqm: form.claimed_area_sqm,
        transaction_date: form.transaction_date,
        ...(claimed_boundary ? { claimed_boundary } : {}),
      });
      setAssessment(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const commit = async (withOverride = false) => {
    setError(""); setBusy(true);
    try {
      const data = await apiPost(
        "/transfers/" + encodeURIComponent(assessment.ulpin) + "/commit",
        {
          buyer: form.buyer.trim(),
          // The assessment id is what authorises the write — the backend
          // refuses any commit without one.
          assessment_id: assessment.assessment_id,
          doc_hash: "0x" + Math.random().toString(16).slice(2),
          ...(withOverride ? { override: true, override_reason: overrideReason } : {}),
        },
        auth.token
      );
      setCommitResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const mint = async () => {
    setError(""); setBusy(true);
    try {
      const data = await apiPost(
        "/properties/" + encodeURIComponent(assessment.ulpin) + "/mint-certificate",
        {}, auth.token
      );
      setCertResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const overlapFlag = assessment?.flags?.find((f) => f.code === "BOUNDARY_OVERLAP");

  const riskTone = !assessment
    ? null
    : assessment.status === "HIGH_RISK"
    ? { border: "border-risk-high/40", glow: "shadow-[0_0_28px_-6px_rgba(255,77,77,0.35)]", bg: "bg-risk-high/[0.03]" }
    : assessment.status === "FLAGGED"
    ? { border: "border-risk-flagged/40", glow: "shadow-[0_0_28px_-6px_rgba(255,176,32,0.3)]", bg: "bg-risk-flagged/[0.03]" }
    : { border: "border-risk-approved/40", glow: "shadow-[0_0_28px_-6px_rgba(61,220,151,0.3)]", bg: "bg-risk-approved/[0.03]" };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left column: input */}
      <div className="space-y-6">
        {!isRegistrar && (
          <div className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-zinc-400">
            <FiLock className="mr-1.5 inline h-3.5 w-3.5 text-zinc-500" />
            Assessment is public — anyone can verify. Finalizing (commit + certificate)
            requires a Registrar session.{" "}
            <a onClick={() => navigate("/login")} className="cursor-pointer text-accent underline">
              Log in
            </a>
            .
          </div>
        )}

        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">Upload a scanned deed</h2>
          <DropZone onFile={uploadDoc} loading={ocrLoading} result={ocrResult} error={ocrError} />
        </div>

        <form onSubmit={runCheck} className="space-y-4 rounded-xl border border-white/10 bg-base-900/50 p-6">
          <h2 className="text-sm font-semibold text-zinc-200">Transfer details</h2>
          <input className={inputClass} placeholder="ULPIN" value={form.ulpin} onChange={set("ulpin")} required />
          <div className="grid grid-cols-2 gap-4">
            <input className={inputClass} placeholder="Seller" value={form.seller} onChange={set("seller")} required />
            <input className={inputClass} placeholder="Buyer" value={form.buyer} onChange={set("buyer")} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="number" step="any" className={inputClass} placeholder="Claimed area (sqm)" value={form.claimed_area_sqm} onChange={set("claimed_area_sqm")} required />
            <input type="date" className={inputClass} value={form.transaction_date} onChange={set("transaction_date")} required />
          </div>

          {/* Without this field the boundary-creep fraud check was
              unreachable from the UI — it could only be triggered by the
              seeded run-all endpoint. */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Claimed boundary (optional) — JSON array of [x,y] points
            </label>
            <textarea
              className={inputClass + " min-h-[60px]"}
              value={form.claimed_boundary}
              onChange={set("claimed_boundary")}
              placeholder="[[0,0],[50,0],[50,30],[0,30]]"
            />
            <p className="mt-1.5 text-xs text-zinc-600">
              Checked against every registered parcel for encroachment. Try the
              boundary above against <span className="font-mono">UP-0001-CLEAN</span> —
              it extends 10m into its neighbour.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? "Working…" : "Run fraud check"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-risk-high/30 bg-risk-high/5 p-4 text-sm text-risk-high">{error}</div>
        )}
      </div>

      {/* Right column: assessment result */}
      <div>
        <AnimatePresence mode="wait">
          {assessment && (
            <motion.div
              key={assessment.assessment_id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`rounded-xl border ${riskTone.border} ${riskTone.bg} ${riskTone.glow} p-6`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={assessment.status} />
                <span className="font-mono text-sm text-zinc-400">
                  risk score <span className="text-white">{assessment.composite_risk_score}</span>
                </span>
                {/* A registrar should always know whether they're reading a
                    deterministic report or a model's rendering of one. */}
                {assessment.explanation_source === "claude" && (
                  <span className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-violet-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-300 ring-1 ring-violet-400/30">
                    <FiCpu className="h-3 w-3" />
                    AI narration
                  </span>
                )}
              </div>

              <pre className="mt-4 whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-300">
                {assessment.explanation}
              </pre>

              {overlapFlag && <BoundaryOverlapSVG geometry={overlapFlag.geometry} />}

              <div className="mt-5 border-t border-white/10 pt-5">
                {!isRegistrar ? (
                  <div className="text-sm text-zinc-500">
                    <a onClick={() => navigate("/login")} className="cursor-pointer text-accent underline">
                      Log in as a Registrar
                    </a>{" "}
                    to commit this transfer on-chain.
                  </div>
                ) : commitResult ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-risk-approved">
                      <FiCheckCircle className="h-4 w-4" />
                      Committed — block {commitResult.onchain_entry.block_number}
                    </div>
                    <div className="font-mono text-xs text-zinc-500 break-all">
                      {commitResult.onchain_entry.tx_hash}
                    </div>

                    {commitResult.ai_verified === false && (
                      <div className="rounded-lg border border-risk-flagged/30 bg-risk-flagged/5 p-3 text-xs text-risk-flagged">
                        Recorded on-chain with <span className="font-mono">aiVerified=false</span> —
                        this transfer was authorised by a registrar, not cleared by the
                        fraud engine. The override is permanent in the event log.
                      </div>
                    )}

                    {!certResult ? (
                      <button
                        onClick={mint}
                        disabled={busy}
                        className="w-full rounded-lg border border-accent bg-accent/10 py-2.5 text-sm font-semibold text-accent shadow-glow-sm transition-colors hover:bg-accent/20 disabled:opacity-40"
                      >
                        Mint Verified Clean Title certificate
                      </button>
                    ) : (
                      <div className="rounded-lg border border-violet-400/30 bg-violet-400/5 p-4">
                        <div className="text-sm font-semibold text-violet-300">
                          Certificate #{certResult.token_id}
                          {certResult.already_minted ? " (already issued)" : " minted"}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">owner {certResult.owner}</div>
                        <div className="mt-1 font-mono text-xs text-zinc-500 break-all">{certResult.tx_hash}</div>
                        <div className="mt-2 text-xs text-zinc-600">
                          Non-transferable — attests this parcel had a clean, verified on-chain transfer as of this block.
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : assessment.status === "HIGH_RISK" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-risk-high">
                      <FiXCircle className="h-4 w-4" />
                      Blocked — the API refuses this commit, not just this button.
                    </div>
                    {!showOverride ? (
                      <button
                        onClick={() => setShowOverride(true)}
                        className="text-xs text-zinc-500 underline transition-colors hover:text-zinc-300"
                      >
                        Registrar override (requires a written justification)
                      </button>
                    ) : (
                      <div className="space-y-2 rounded-lg border border-risk-high/25 bg-risk-high/[0.04] p-4">
                        <div className="flex items-start gap-2 text-xs text-risk-high">
                          <FiAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            Overriding records <span className="font-mono">aiVerified=false</span> on-chain,
                            permanently. The parcel will also be ineligible for a clean-title certificate.
                          </span>
                        </div>
                        <textarea
                          className={inputClass + " min-h-[60px]"}
                          placeholder="e.g. Court order 2026/CIV/881 directs registration."
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                        />
                        <button
                          onClick={() => commit(true)}
                          disabled={busy || !overrideReason.trim()}
                          className="w-full rounded-lg border border-risk-high/50 bg-risk-high/10 py-2.5 text-sm font-semibold text-risk-high transition-colors hover:bg-risk-high/20 disabled:opacity-30"
                        >
                          Override and commit
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Only a clean auto-approval is recorded as engine-cleared,
                        so a registrar committing a FLAGGED transfer should know
                        before clicking that it lands as aiVerified=false. */}
                    {assessment.status === "FLAGGED" && (
                      <div className="flex items-start gap-2 rounded-lg border border-risk-flagged/25 bg-risk-flagged/[0.04] p-3 text-xs text-risk-flagged">
                        <FiAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          Flagged for manual review. Committing records{" "}
                          <span className="font-mono">aiVerified=false</span> on-chain —
                          your authorisation, not the engine's.
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => commit(false)}
                      disabled={busy}
                      className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-black shadow-glow-sm transition-colors hover:bg-accent-hover disabled:opacity-40"
                    >
                      {busy ? "Committing…" : "Commit to chain"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!assessment && (
          <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-zinc-600">
            Run a fraud check to see the risk assessment here.
          </div>
        )}
      </div>
    </div>
  );
}
