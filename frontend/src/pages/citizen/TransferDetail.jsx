import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getDemoTransfers, updateDemoTransfer } from "../../lib/store.js";
import mockData from "../../data/land-registry-ui-mock-data.json" with { type: "json" };
import { formatCurrencyINR, formatDate } from "../../lib/utils.js";
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  ShieldCheck,
  Boxes,
  KeyRound,
  FileText,
  Clock,
  RotateCcw
} from "lucide-react";

export function TransferDetail() {
  const { requestId } = useParams();
  const { user } = useAuth();
  const transfers = getDemoTransfers();
  const transfer = transfers.find((t) => t.request_id === requestId);
  const parcels = mockData.parcels || [];
  const parcel = parcels.find((p) => p.ulpin === transfer?.ulpin);

  const [currentTransfer, setCurrentTransfer] = useState(transfer);

  if (!currentTransfer) {
    return (
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-8 text-center max-w-md mx-auto shadow-sm my-12">
        <h2 className="text-lg font-bold text-[#101828]">Petition Not Found</h2>
        <p className="mt-2 text-xs text-[#667085]">
          No conveyance petition matching ID "{requestId}" exists in the directory.
        </p>
        <Link
          to="/citizen/transfers"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Transfers</span>
        </Link>
      </div>
    );
  }

  // Check specific scenario types
  const isRejected = currentTransfer.status === "REJECTED";
  const isExpired = currentTransfer.status === "EXPIRED" || currentTransfer.request_id === "TR-2026-008"; // SCN-15
  const isJoint = currentTransfer.request_id === "TR-2026-002"; // SCN-02
  const isCompleted = currentTransfer.status === "COMMITTED";

  const ownerApprovals = currentTransfer.authorization?.owner_approvals || [];
  const requiredApprovals = currentTransfer.authorization?.required_owner_approvals || ownerApprovals.length || 1;
  const approvedCount = ownerApprovals.filter((a) => a.status === "APPROVED").length;

  const handleConsent = () => {
    const updated = updateDemoTransfer(currentTransfer.request_id, {
      status: "AWAITING_REGISTRAR",
      authorization: {
        ...currentTransfer.authorization,
        owner_approvals: ownerApprovals.map(a => a.user_id === user?.id ? { ...a, status: "APPROVED", signed_at: new Date().toISOString() } : a)
      }
    });
    if (updated) setCurrentTransfer(updated);
  };

  const handleReject = () => {
    const updated = updateDemoTransfer(currentTransfer.request_id, {
      status: "REJECTED",
      rejection_reason: "SELLER_REJECTED"
    });
    if (updated) setCurrentTransfer(updated);
  };

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/citizen/transfers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3A67] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Transfers</span>
        </Link>
        <span className="text-xs font-mono text-[#667085]">
          Request ID: {currentTransfer.request_id}
        </span>
      </div>

      {/* SCN-02: Rejection Notice Banner */}
      {isJoint && (
        <div className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-5 text-xs text-[#B42318] space-y-2">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 shrink-0 text-[#D92D20] mt-0.5" />
            <div>
              <span className="font-bold text-sm text-[#D92D20]">
                TRANSFER PETITION REJECTED (SCN-02): PRICE_NOT_AGREED
              </span>
              <p className="mt-1 text-[#7A271A] leading-relaxed">
                Co-owner <strong>Anita Kumar (USR-OWN-003)</strong> withheld statutory consent with reason code:{" "}
                <code className="bg-[#FEE4E2] px-1.5 py-0.5 rounded font-mono font-bold">PRICE_NOT_AGREED</code>.
                Because this parcel requires <strong>3 of 3</strong> unanimous owner approvals, the petition cannot proceed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SCN-15: Expired Transfer Notice Banner */}
      {isExpired && (
        <div className="rounded-xl border border-[#D0D5DD] bg-[#F8FAFC] p-5 text-xs text-[#475467] space-y-2">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 shrink-0 text-[#667085] mt-0.5" />
            <div>
              <span className="font-bold text-sm text-[#101828]">
                TRANSFER PETITION EXPIRED (SCN-15)
              </span>
              <p className="mt-1 text-[#475467] leading-relaxed">
                This conveyance request reached its statutory validity limit without receiving the required owner approvals.
                Expired petitions are immutable and cannot be committed. A fresh request must be initiated by the prospective buyer.
              </p>
              <Link
                to="/citizen/my-properties"
                className="mt-3 inline-flex items-center gap-1 font-bold text-[#0B3A67] hover:underline"
              >
                <span>Initiate New Conveyance Petition →</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Petition Details Card */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono text-xl font-bold text-[#0B3A67]">
                {currentTransfer.request_id}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  currentTransfer.status === "COMMITTED"
                    ? "bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]"
                    : currentTransfer.status === "REJECTED" || isExpired
                    ? "bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]"
                    : "bg-[#FFFBEB] text-[#B54708] border border-[#FDE68A]"
                }`}
              >
                {currentTransfer.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#475467]">
              Conveyance Petition for Parcel <Link to={`/citizen/properties/${currentTransfer.ulpin}`} className="font-mono font-bold text-[#0B3A67] underline">{currentTransfer.ulpin}</Link>
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] text-[#667085] uppercase tracking-wider block">Agreed Value</span>
            <span className="font-mono text-xl font-bold text-[#0B3A67]">
              {formatCurrencyINR(currentTransfer.agreed_price_inr)}
            </span>
          </div>
        </div>

        {/* Core Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[#667085] block">Buyer ID:</span>
            <span className="font-bold text-[#101828]">{currentTransfer.buyer_user_id}</span>
          </div>
          <div>
            <span className="text-[#667085] block">Filing Date:</span>
            <span className="font-semibold text-[#101828]">{formatDate(currentTransfer.created_at)}</span>
          </div>
          <div>
            <span className="text-[#667085] block">Risk Classification:</span>
            <span className={`font-bold ${currentTransfer.risk_score >= 50 ? 'text-[#B42318]' : 'text-[#027A48]'}`}>
              Score {currentTransfer.risk_score || 0} / 100
            </span>
          </div>
          <div>
            <span className="text-[#667085] block">Deed Office:</span>
            <span className="font-semibold text-[#101828]">Noida Sub-Registry</span>
          </div>
        </div>
      </div>

      {/* Quorum Approvals Grid */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2">
          <div className="flex items-center gap-2 font-bold text-sm text-[#101828]">
            <Users className="h-4 w-4 text-[#0B3A67]" />
            <span>Titleholder Quorum Consents</span>
          </div>
          <span className="text-xs font-mono font-bold text-[#0B3A67] bg-[#EFF8FF] px-2 py-0.5 rounded">
            {approvedCount} of {requiredApprovals} Consents Granted
          </span>
        </div>

        <div className="space-y-2">
          {ownerApprovals.map((app, idx) => (
            <div
              key={idx}
              className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-[#101828]">{app.name || app.user_id}</span>
                <span className="text-[#667085] text-[11px] ml-2">ID: {app.user_id}</span>
              </div>
              <div>
                {app.status === "APPROVED" ? (
                  <span className="inline-flex items-center gap-1 font-bold text-[#027A48]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Consent Granted ({formatDate(app.signed_at)})</span>
                  </span>
                ) : app.status === "REJECTED" ? (
                  <span className="inline-flex items-center gap-1 font-bold text-[#B42318]">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Consent Withheld ({app.reason || "REJECTED"})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-[#B54708]">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Awaiting Signature</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Actions for pending transfer */}
      {currentTransfer.status === "PENDING_OWNER_CONSENT" && (
        <div className="p-4 bg-white rounded-xl border border-[#D0D5DD] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
          <div className="text-xs">
            <span className="font-bold text-[#101828]">Titleholder Consent Required</span>
            <p className="text-[#667085]">Sign cryptographic consent to forward petition to the Sub-Registrar desk.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={handleReject}
              className="w-full sm:w-auto px-3.5 py-2 rounded-lg border border-[#FECACA] bg-white text-xs font-semibold text-[#B42318] hover:bg-[#FEF2F2]"
            >
              Withhold Consent
            </button>
            <button
              onClick={handleConsent}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#0B3A67] text-xs font-semibold text-white hover:bg-[#1769AA] shadow-sm flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Grant Consent</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransferDetail;
