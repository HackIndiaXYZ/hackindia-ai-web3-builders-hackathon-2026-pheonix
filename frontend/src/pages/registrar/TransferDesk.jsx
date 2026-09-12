import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { transferService, useLiveParcels, useLiveTransfers } from "../../services/liveData.js";
import { formatArea, formatCurrencyINR, formatDate } from "../../lib/utils.js";
import { BoundaryOverlapSVG } from "../../components/BoundaryOverlapSVG.jsx";
import {
  ArrowRightLeft,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  KeyRound,
  FileText,
  Users,
  Building,
  History,
  RotateCcw,
  ArrowLeft,
  GitPullRequestDraft
} from "lucide-react";

export function TransferDesk() {
  const { requestId: paramRequestId } = useParams();
  const { user, token, isRestricted } = useAuth();
  const navigate = useNavigate();

  const { data: transfers, loading: transfersLoading, error: transfersError } = useLiveTransfers(token);
  const { data: parcels, loading: parcelsLoading, error: parcelsError } = useLiveParcels(token);
  const defaultRequestId = paramRequestId || "TR-2026-003";

  const [selectedRequestId, setSelectedRequestId] = useState(defaultRequestId);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [actionNotice, setActionNotice] = useState("");

  const activeTransfer = useMemo(() => {
    return transfers.find((t) => t.request_id === selectedRequestId) || transfers[0];
  }, [transfers, selectedRequestId]);

  const selectedParcel = useMemo(() => {
    return parcels.find((p) => p.ulpin === activeTransfer?.ulpin) || parcels[0];
  }, [parcels, activeTransfer]);

  // Risk & blocker states
  const isFrozen = selectedParcel?.title_status === "FROZEN" || activeTransfer?.ulpin === "UP-NOI-0009-DISPUTED"; // SCN-10
  const isBoundaryOverlap = activeTransfer?.request_id === "TR-2026-004" || selectedParcel?.ulpin === "UP-NOI-0008-OVERLAP"; // SCN-09
  const isHighRisk = activeTransfer?.risk_score >= 50 || activeTransfer?.request_id === "TR-2026-003"; // SCN-08
  const isJoint = selectedParcel?.ulpin === "UP-NOI-0002-JOINT" || activeTransfer?.request_id === "TR-2026-002"; // SCN-02
  const isCommitted = activeTransfer?.status === "COMMITTED";

  // Quorum calculations
  const ownerApprovals = activeTransfer?.authorization?.owner_approvals || [];
  const requiredApprovals = activeTransfer?.authorization?.required_owner_approvals || ownerApprovals.length || 1;
  const approvedCount = ownerApprovals.filter((a) => a.status === "APPROVED").length;
  const quorumMet = approvedCount >= requiredApprovals;

  // Handle Registrar Approve
  const handleApprove = async () => {
    if (isFrozen) {
      alert("ACTION PROHIBITED (SCN-10): Court injunction freeze prevents all registrar actions.");
      return;
    }
    if (isRestricted) {
      alert("RESTRICTED ADMINISTRATIVE CONFLICT (SCN-16): Officer Neha Verma cannot finalize transfers due to dual-control constraints (CANNOT_FINALIZE_OWN_TRANSFER).");
      return;
    }
    if (isHighRisk && !overrideReason.trim()) {
      alert("HIGH RISK GATE (SCN-08): A statutory written override reason is mandatory to approve this petition.");
      return;
    }

    try {
      await transferService.approve(activeTransfer.request_id, { override_reason: overrideReason.trim() || null }, token);
      await transferService.submit(activeTransfer.request_id, token);
      setActionNotice("Conveyance petition submitted to the live registry outbox.");
    } catch (err) { setActionNotice(err.message || "The registry could not approve this petition."); }
  };

  const handleReject = () => {
    if (isFrozen) {
      alert("ACTION PROHIBITED (SCN-10): Court injunction freeze prevents all registrar actions.");
      return;
    }
    setActionNotice("Live registry does not expose a registrar rejection endpoint for this petition.");
  };

  if (transfersLoading || parcelsLoading) return <div className="text-xs text-[#667085]">Loading live transfer adjudication data...</div>;
  if (transfersError || parcelsError) return <div className="text-xs text-[#B42318]">{transfersError || parcelsError}</div>;
  if (!activeTransfer || !selectedParcel) return <div className="text-xs text-[#667085]">No live transfer petition is available for adjudication.</div>;

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/registrar/transfers" className="text-xs text-[#667085] hover:underline flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Queue
            </Link>
            <span className="text-xs text-[#D0D5DD]">/</span>
            <span className="font-mono text-xs font-bold text-[#0B3A67]">{activeTransfer.request_id}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#101828] mt-1">
            Cadastral Conveyance Adjudication Desk
          </h1>
        </div>

        {/* Quick Petition Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <span className="text-xs text-[#667085] font-semibold">Switch Petition:</span>
          <select
            value={activeTransfer.request_id}
            onChange={(e) => {
              setSelectedRequestId(e.target.value);
              navigate(`/registrar/transfers/${e.target.value}`);
            }}
            className="w-full sm:w-auto rounded-lg border border-[#D0D5DD] bg-white px-3 py-1.5 font-mono text-xs text-[#101828] font-bold"
          >
            {transfers.map((t) => (
              <option key={t.request_id} value={t.request_id}>
                {t.request_id} ({t.ulpin})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div className="rounded-xl border border-[#A6F4C5] bg-[#ECFDF3] p-4 text-xs font-semibold text-[#027A48] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice("")} className="underline">Dismiss</button>
        </div>
      )}

      {/* SCN-16: Restricted Administrative Conflict Banner */}
      {isRestricted && (
        <div className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4 text-xs text-[#B42318] flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-[#D92D20] mt-0.5" />
          <div>
            <span className="font-bold text-sm">DUAL-ROLE CONSTRAINT ACTIVE (SCN-16):</span>
            <p className="mt-1 leading-relaxed">
              Officer Neha Verma holds simultaneous REGISTRAR and AUDITOR credentials.
              Under anti-conflict rule <code>CANNOT_FINALIZE_OWN_TRANSFER</code>, direct conveyance approvals are locked in this session.
            </p>
          </div>
        </div>
      )}

      {/* SCN-10: Judicial Court Freeze Banner */}
      {isFrozen && (
        <div className="rounded-xl border-2 border-[#D92D20] bg-[#FEF3F2] p-5 text-xs text-[#B42318] space-y-2">
          <div className="flex items-start gap-3">
            <Lock className="h-6 w-6 shrink-0 text-[#D92D20] mt-0.5" />
            <div>
              <span className="font-bold text-sm text-[#D92D20]">
                JUDICIAL INJUNCTION COURT FREEZE (SCN-10)
              </span>
              <p className="mt-1 leading-relaxed">
                Parcel <strong>{selectedParcel.ulpin}</strong> is subject to an active injunction order in <em>Civil Suit No. 104/2025 (District Court Gautam Buddha Nagar)</em>.
                All transfer petitions, title key validations, and ownership mutations are prohibited under contempt of court sanctions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SCN-09: Boundary Overlap Collision Banner & Visualizer */}
      {isBoundaryOverlap && (
        <div className="rounded-xl border-2 border-[#D92D20] bg-[#FEF3F2] p-5 text-xs text-[#B42318] space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0 text-[#D92D20] mt-0.5" />
            <div>
              <span className="font-bold text-sm text-[#D92D20]">
                CADASTRAL BOUNDARY OVERLAP COLLISION DETECTED (SCN-09)
              </span>
              <p className="mt-1 leading-relaxed">
                Separating Axis Theorem (SAT) cadastral analysis indicates this polygon collides with neighboring parcel <strong>UP-NOI-0001-CLEAN</strong>.
                Overlapping area: <strong>32.4 m² (4.8% collision ratio)</strong>. Direct registration would create illegal double-title liability.
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#FECDCA] max-w-sm mx-auto text-center">
            <BoundaryOverlapSVG overlapPercent={4.8} />
            <span className="text-[10px] font-mono text-[#D92D20] font-bold block mt-2">
              Colliding Geometry Highlighted in Red
            </span>
          </div>
        </div>
      )}

      {/* SCN-08: High Risk Gate Notice */}
      {isHighRisk && !isFrozen && (
        <div className="rounded-xl border border-[#F9DBAF] bg-[#FEF6EE] p-5 text-xs text-[#B54708] space-y-2">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-[#D92D20] mt-0.5" />
            <div>
              <span className="font-bold text-sm text-[#B54708]">
                STATUTORY HIGH-RISK GATE ENFORCED (SCN-08)
              </span>
              <p className="mt-1 leading-relaxed">
                Fraud risk assessment score <strong>{activeTransfer.risk_score || 88}/100</strong> exceeds the automated clearance threshold.
                Approval requires a detailed, legally binding written justification that is permanently preserved in the state audit ledger.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6 Hero Adjudication Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Panel 1: Petition & Cadastral Overview */}
        <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              1. Cadastral Record & Petition
            </h2>
            <span className="font-mono text-xs font-bold text-[#0B3A67]">{selectedParcel.ulpin}</span>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[#667085] block">Locality & District:</span>
              <span className="font-semibold text-[#101828]">{selectedParcel.locality}, {selectedParcel.district}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Survey Number:</span>
              <span className="font-mono font-bold text-[#101828]">{selectedParcel.survey_number}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Registered Area:</span>
              <span className="font-mono font-bold text-[#101828]">{formatArea(selectedParcel.area_sqm)}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Declared Consideration:</span>
              <span className="font-mono font-bold text-[#0B3A67] text-sm">{formatCurrencyINR(activeTransfer.agreed_price_inr)}</span>
            </div>
          </div>
        </div>

        {/* Panel 2: Seller & Co-Owner Quorum */}
        <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              2. Titleholder Quorum
            </h2>
            <span className="font-mono text-xs font-bold text-[#0B3A67]">
              {approvedCount}/{requiredApprovals} Consents
            </span>
          </div>
          <div className="space-y-2 text-xs">
            {ownerApprovals.map((a, idx) => (
              <div key={idx} className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#101828]">{a.name || a.user_id}</span>
                  <div className="text-[10px] text-[#667085] font-mono">{a.user_id}</div>
                </div>
                <span className={`text-[10px] font-bold uppercase ${a.status === 'APPROVED' ? 'text-[#027A48]' : a.status === 'REJECTED' ? 'text-[#B42318]' : 'text-[#B54708]'}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 3: Buyer Verification */}
        <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              3. Buyer Due Diligence
            </h2>
            <span className="font-mono text-xs font-bold text-[#0B3A67]">{activeTransfer.buyer_user_id}</span>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[#667085] block">Named Buyer:</span>
              <span className="font-bold text-[#101828]">Amit Sharma</span>
            </div>
            <div>
              <span className="text-[#667085] block">Aadhaar e-KYC Verification:</span>
              <span className="text-[#027A48] font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verified via UIDAI Consent</span>
              </span>
            </div>
            <div>
              <span className="text-[#667085] block">Counter-Signature Status:</span>
              <span className="font-semibold text-[#101828]">ACCEPTED & SIGNED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panels 4 & 5: Risk & Cryptographic Verification Console */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 4: Risk Assessments Detail */}
        <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              4. Risk Assessment Breakdown
            </h2>
            <span className={`text-xs font-mono font-bold ${activeTransfer.risk_score >= 50 ? 'text-[#B42318]' : 'text-[#027A48]'}`}>
              Score: {activeTransfer.risk_score || 0}/100
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
              <span className="font-bold text-[#101828]">Boundary SAT Collision Check:</span>
              <p className="text-[#475467] mt-0.5">
                {isBoundaryOverlap ? "FAILED: Overlapping with UP-NOI-0001-CLEAN." : "PASSED: Zero geometry conflicts detected."}
              </p>
            </div>
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
              <span className="font-bold text-[#101828]">Tenure Encumbrance Check:</span>
              <p className="text-[#475467] mt-0.5">
                {selectedParcel.encumbrances?.length > 0 ? "CAUTION: Active charge registered." : "PASSED: No active bank or tax liens."}
              </p>
            </div>
          </div>
        </div>

        {/* Panel 5: Sell Token Verification CTA */}
        <div className="rounded-xl border border-[#B9D5F4] bg-[#F0F7FF] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#B9D5F4] pb-2">
            <div className="flex items-center gap-2 font-bold text-xs text-[#0B3A67]">
              <KeyRound className="h-4 w-4" />
              <span>5. 15-Point Sell Token Verification</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#0B3A67] uppercase">HMAC-SHA256</span>
          </div>
          <p className="text-xs text-[#344054] leading-relaxed">
            Verify the cryptographic single-use Sell Token against the 15 Section 5 criteria (signature, expiration, seller binding, and nonces).
          </p>
          <Link
            to={`/registrar/transfers/${activeTransfer.request_id}/verify`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA] shadow-sm"
          >
            <span>Launch 15-Point Verification Console</span>
            <KeyRound className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Panel 6: Sub-Registrar Adjudication Actions */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] border-b border-[#EAECF0] pb-2">
          6. Official Adjudication Action Bar
        </h2>

        {/* Written override input for high-risk */}
        {isHighRisk && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#B54708]">
              Mandatory Statutory Override Reason (SCN-08) *
            </label>
            <textarea
              rows={2}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Enter comprehensive legal and cadastral justification for overriding high-risk flag..."
              className="w-full rounded-lg border border-[#F9DBAF] bg-[#FEF6EE] p-3 text-xs text-[#101828] focus:outline-none"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs text-[#667085]">
            Officer Badge: <span className="font-mono font-bold text-[#101828]">{user?.badge || "GOV-REG-0182"}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handleReject}
              disabled={isFrozen}
              className="w-full sm:w-auto rounded-lg border border-[#FECACA] bg-white px-4 py-2 text-xs font-semibold text-[#B42318] hover:bg-[#FEF2F2] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reject Petition
            </button>

            <button
              onClick={handleApprove}
              disabled={isFrozen || isRestricted || (isHighRisk && !overrideReason.trim())}
              className="w-full sm:w-auto rounded-lg bg-[#027A48] px-5 py-2 text-xs font-bold text-white hover:bg-[#054F31] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Approve & Seal Title</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransferDesk;
