import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { parcelService, transferService, useLiveResource } from "../../services/liveData.js";
import {
  getStoredSellTokens,
  verifyStandardSellToken,
} from "../../lib/sellTokenEngine.js";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  KeyRound,
  ArrowLeft,
  Boxes,
  Lock,
  FileCheck2,
  RotateCcw
} from "lucide-react";

export function TransferVerify() {
  const { requestId } = useParams();
  const { user, token, isRestricted } = useAuth();
  const navigate = useNavigate();

  const { data: transfer, loading, error } = useLiveResource(
    (sessionToken) => (requestId ? transferService.get(requestId, sessionToken) : Promise.resolve(null)),
    token,
    [requestId]
  );
  const { data: parcel } = useLiveResource(
    (sessionToken) => (transfer?.ulpin ? parcelService.get(transfer.ulpin, sessionToken) : Promise.resolve(null)),
    token,
    [transfer?.ulpin]
  );

  // State
  const [tokenInput, setTokenInput] = useState("");
  const [checklist, setChecklist] = useState(null);
  const [overallValid, setOverallValid] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Load a previously issued token for this petition; never synthesize credentials in production.
  useEffect(() => {
    async function initToken() {
      if (!transfer) return;
      // Check stored tokens first
      const stored = getStoredSellTokens();
      const existing = stored.find(
        (t) => t.transfer_request_id === transfer.request_id || t.ulpin === transfer.ulpin
      );

      if (existing && existing.token_string) {
        setTokenInput(existing.token_string);
        runCheck(existing.token_string);
      }
    }
    initToken();
  }, [transfer, parcel]);

  const runCheck = async (str) => {
    if (!str.trim() || !transfer) return;
    setIsEvaluating(true);
    setErrorMessage("");
    try {
      const result = await verifyStandardSellToken(str.trim(), transfer);
      setChecklist(result.checklist);
      setOverallValid(result.valid);
    } catch (err) {
      setErrorMessage(err.message || "Cryptographic evaluation error.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleManualVerify = (e) => {
    e.preventDefault();
    runCheck(tokenInput);
  };

  const handleCommit = async () => {
    if (!overallValid || !tokenInput.trim()) return;

    if (isRestricted) {
      alert("RESTRICTED REGISTRAR MODE: Officer Neha Verma is subject to dual-control constraints (CANNOT_FINALIZE_OWN_TRANSFER). Final commit is prohibited.");
      return;
    }

    try {
      const res = await transferService.submit(transfer.request_id, token);
      setCommitSuccess(res);
    } catch (err) {
      setErrorMessage(err.message || "Failed to commit conveyance.");
    }
  };

  if (loading) return <div className="text-xs text-[#667085]">Loading live transfer verification data...</div>;
  if (error) return <div className="text-xs text-[#B42318]">{error}</div>;
  if (!transfer) {
    return (
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-8 text-center max-w-md mx-auto my-12">
        <h2 className="text-lg font-bold text-[#101828]">Transfer Request Not Found</h2>
        <Link to="/registrar/transfers" className="mt-4 inline-block font-semibold text-[#0B3A67]">
          Return to Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      {/* Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Link
          to={`/registrar/transfers/${transfer.request_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3A67] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Adjudication Desk</span>
        </Link>
        <span className="font-mono text-xs text-[#667085]">
          Petition ID: {transfer.request_id} · ULPIN: {transfer.ulpin}
        </span>
      </div>

      {/* Restricted Warning (SCN-16) */}
      {isRestricted && (
        <div className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4 text-xs text-[#B42318] flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-[#D92D20] mt-0.5" />
          <div>
            <span className="font-bold text-sm">DUAL-ROLE CONSTRAINT (SCN-16):</span>
            <p className="mt-1 leading-relaxed">
              Officer Neha Verma is in RESTRICTED administrative mode. You may evaluate the 15 verification criteria, but final conveyance commitment is blocked.
            </p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {commitSuccess && (
        <div className="rounded-xl border-2 border-[#12B76A] bg-[#F6FEF9] p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-[#027A48] font-bold text-base">
            <CheckCircle2 className="h-5 w-5 text-[#12B76A]" />
            <span>Conveyance Deed Committed Successfully!</span>
          </div>
          <p className="text-xs text-[#344054] leading-relaxed">
            Nonce consumed in <code className="font-mono bg-[#EBFDF3] px-1 py-0.5 rounded">tl_nonces_v1</code>.
            Transfer status updated to <strong className="text-[#027A48]">COMMITTED</strong>. Immutable audit record appended.
          </p>
          <div className="p-3 bg-white rounded-lg border border-[#A6F4C5] font-mono text-xs text-[#0B3A67] break-all">
            Audit ID: {commitSuccess.audit_event?.id} · Tx: {commitSuccess.audit_event?.tx_hash?.slice(0, 16)}...
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate("/registrar/transfers")}
              className="w-full sm:w-auto rounded-lg bg-[#027A48] px-4 py-2 text-xs font-semibold text-white hover:bg-[#054F31]"
            >
              Return to Transfer Queue
            </button>
          </div>
        </div>
      )}

      {/* Token Input Box */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#EAECF0] pb-3 gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#0B3A67] shrink-0" />
            <h1 className="text-sm sm:text-base font-bold text-[#101828]">
              Cryptographic Sell Token Verification Console (15-Point Checklist)
            </h1>
          </div>
          <span className="text-[10px] font-mono uppercase bg-[#EFF8FF] text-[#0B3A67] px-2 py-1 rounded font-bold shrink-0 self-start sm:self-auto">
            HMAC-SHA256 Web Crypto
          </span>
        </div>

        <form onSubmit={handleManualVerify} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Plaintext Serialized Sell Token String (Format: <code className="font-mono text-[#0B3A67]">TLK1.&lt;payload&gt;.&lt;signature&gt;</code>)
            </label>
            <textarea
              rows={2}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full rounded-lg border border-[#D0D5DD] bg-[#F8FAFC] p-3 font-mono text-xs text-[#0B3A67] focus:border-[#0B3A67] focus:outline-none"
              placeholder="Paste TLK1 token string..."
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="submit"
              disabled={isEvaluating}
              className="w-full sm:w-auto rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA] disabled:opacity-50"
            >
              {isEvaluating ? "Evaluating..." : "Re-evaluate Token"}
            </button>

            {checklist && (
              <div className="text-xs font-bold">
                Status:{" "}
                <span className={overallValid ? "text-[#027A48]" : "text-[#B42318]"}>
                  {overallValid ? "15/15 CRITERIA PASSED" : "FAILED / GATE BLOCKED"}
                </span>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* 15-Point Criteria Checklist Grid */}
      {checklist && (
        <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] border-b border-[#EAECF0] pb-2">
            Section 5 Verification Checklist (All 15 Mandatory Gates)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {checklist.map((item, idx) => {
              const isPass = item.status === "PASS";
              const isWarn = item.status === "WARN";
              const isFail = item.status === "FAIL";

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex items-start justify-between gap-2 ${
                    isPass
                      ? "border-[#A6F4C5] bg-[#F6FEF9]"
                      : isWarn
                      ? "border-[#FDE68A] bg-[#FFFBEB]"
                      : "border-[#FECDCA] bg-[#FEF3F2]"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-bold">
                      {isPass ? (
                        <CheckCircle2 className="h-4 w-4 text-[#027A48] shrink-0" />
                      ) : isWarn ? (
                        <AlertTriangle className="h-4 w-4 text-[#B54708] shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[#B42318] shrink-0" />
                      )}
                      <span className="text-[#101828]">
                        {idx + 1}. {item.label}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-[#475467] font-mono">
                      Reason: <span className="font-bold">{item.code}</span> · {item.details}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      isPass
                        ? "bg-[#ECFDF3] text-[#027A48]"
                        : isWarn
                        ? "bg-[#FEF6EE] text-[#B54708]"
                        : "bg-[#FEF3F2] text-[#B42318]"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Commit Action Bar */}
          {!commitSuccess && (
            <div className="pt-4 border-t border-[#EAECF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[#667085]">
                {overallValid
                  ? "All statutory gates verified. Ready to seal conveyance and consume single-use nonce."
                  : "Conveyance cannot be committed until all blocking criteria are resolved."}
              </div>

              <button
                onClick={handleCommit}
                disabled={!overallValid || isRestricted}
                className="w-full sm:w-auto shrink-0 rounded-lg bg-[#027A48] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#054F31] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FileCheck2 className="h-4 w-4" />
                <span>Commit Conveyance & Seal Title</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TransferVerify;
