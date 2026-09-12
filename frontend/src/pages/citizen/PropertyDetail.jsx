import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { parcelService, useLiveResource } from "../../services/liveData.js";
import { StatusChip } from "../../components/StatusChip.jsx";
import { formatArea, formatCurrencyINR, formatDate } from "../../lib/utils.js";
import { generateStandardSellToken, checkTokenEligibility } from "../../lib/sellTokenEngine.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Users,
  Building,
  History,
  Lock,
  GitFork,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
  X
} from "lucide-react";

export function PropertyDetail() {
  const { ulpin } = useParams();
  const { user, token } = useAuth();
  const { data: parcel, loading, error } = useLiveResource(
    (sessionToken) => (ulpin ? parcelService.get(ulpin, sessionToken) : Promise.resolve(null)),
    token,
    [ulpin]
  );

  const [activeTokenModal, setActiveTokenModal] = useState(null);
  const [eligibilityError, setEligibilityError] = useState("");
  const [copied, setCopied] = useState(false);

  if (loading) return <div className="text-xs text-[#667085]">Loading live cadastral record...</div>;
  if (error) return <div className="text-xs text-[#B42318]">{error}</div>;
  if (!parcel) {
    return (
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-8 text-center max-w-md mx-auto shadow-sm my-12">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[#FEF3F2] text-[#D92D20] flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-[#101828]">Cadastral Record Not Found</h2>
        <p className="mt-2 text-xs text-[#667085]">
          No cadastral record matching ULPIN "{ulpin}" was found in the title directory.
        </p>
        <Link
          to="/citizen/my-properties"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to My Properties</span>
        </Link>
      </div>
    );
  }

  // Guardrail checks: FROZEN, SUCCESSION_PENDING, CREDENTIAL_RECOVERY
  const isFrozen = parcel.title_status === "FROZEN" || parcel.title_status === "DISPUTED";
  const isSuccessionPending = parcel.title_status === "SUCCESSION_PENDING";
  const isCredentialRecovery = parcel.title_status === "CREDENTIAL_RECOVERY";
  const isTransferBlocked = isFrozen || isSuccessionPending || isCredentialRecovery;

  // SCN-11: History Gap detection
  const isHistoryGap = parcel.ulpin === "UP-NOI-0010-HISTORY-GAP" || parcel.title_status?.includes("HISTORY_GAP");

  // SCN-12: Partition detection
  const isPartitioned = parcel.ulpin === "UP-NOI-0011-PARTITION" || parcel.title_status === "PARTITIONED";

  const handleIssueToken = async () => {
    setEligibilityError("");
    const elig = checkTokenEligibility(parcel);
    if (!elig.eligible) {
      setEligibilityError(elig.reason);
      return;
    }

    try {
      const generated = await generateStandardSellToken({
        ulpin: parcel.ulpin,
        ownerUserId: user?.id || parcel.owners?.[0]?.user_id || "USR-OWN-001",
        buyerUserId: "USR-BUY-001",
        transferRequestId: `TR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        scope: "FULL_CONVEYANCE",
        ttlHours: 24,
      });
      setActiveTokenModal(generated);
    } catch (err) {
      setEligibilityError(err.message || "Failed to generate token.");
    }
  };

  const handleCopyToken = (str) => {
    navigator.clipboard.writeText(str);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/citizen/my-properties"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3A67] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to My Properties</span>
        </Link>
        <button
          onClick={handleIssueToken}
          disabled={isTransferBlocked}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B3A67] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1769AA] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          title={isTransferBlocked ? "Transfer actions are disabled on this title status" : "Generate Sell Token"}
        >
          <KeyRound className="h-3.5 w-3.5" />
          <span>Issue Sell Token</span>
        </button>
      </div>

      {/* Blocked Status Banners */}
      {isFrozen && (
        <div className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4 text-xs text-[#B42318] flex items-start gap-3">
          <Lock className="h-5 w-5 shrink-0 text-[#D92D20] mt-0.5" />
          <div>
            <span className="font-bold text-sm">JUDICIAL COURT FREEZE ACTIVE (SCN-10):</span>
            <p className="mt-1 leading-relaxed">
              Conveyance actions on this parcel are locked pursuant to Hon'ble District Court Injunction Order O.S. No. 412/2025.
              Transfer key generation, mortgaging, and boundary alterations are prohibited.
            </p>
          </div>
        </div>
      )}

      {isSuccessionPending && (
        <div className="rounded-xl border border-[#FEDF89] bg-[#FFFAEB] p-4 text-xs text-[#B54708] flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#D92D20] mt-0.5" />
          <div>
            <span className="font-bold text-sm">SUCCESSION PROCEEDING ACTIVE (SCN-04):</span>
            <p className="mt-1 leading-relaxed">
              This parcel is undergoing statutory heir mutation under Case SUC-2026-001. Direct transfer actions are locked until succession is certified.
            </p>
            <Link to="/citizen/succession" className="mt-2 inline-block font-bold underline">
              View Succession Case Status →
            </Link>
          </div>
        </div>
      )}

      {isCredentialRecovery && (
        <div className="rounded-xl border border-[#BAE6FD] bg-[#F0F9FF] p-4 text-xs text-[#026AA2] flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-[#0284C7] mt-0.5" />
          <div>
            <span className="font-bold text-sm">CREDENTIAL RECOVERY COOLING-OFF (SCN-13):</span>
            <p className="mt-1 leading-relaxed">
              Owner credential rotation is in a mandatory 7-day cooling-off review period. Title transfers are temporarily suspended.
            </p>
            <Link to="/citizen/key-recovery" className="mt-2 inline-block font-bold underline">
              View Key Recovery Status →
            </Link>
          </div>
        </div>
      )}

      {eligibilityError && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-xs text-[#B42318]">
          <span className="font-bold">Token Generation Refused: </span>
          <span>{eligibilityError}</span>
        </div>
      )}

      {/* Main Deed Card */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAECF0] pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono text-xl font-bold text-[#0B3A67]">
                {parcel.ulpin}
              </h1>
              <StatusChip status={parcel.title_status} isPublic={false} />
            </div>
            <p className="mt-1.5 text-xs text-[#475467]">
              {parcel.locality}, {parcel.district}, {parcel.state}
            </p>
          </div>

          {/* Title Health Score */}
          <div className="rounded-xl border border-[#A6F4C5] bg-[#ECFDF3] p-3 text-right">
            <span className="text-[10px] font-bold text-[#027A48] uppercase tracking-wider">
              Title Health Index
            </span>
            <div className="font-mono text-2xl font-bold text-[#027A48]">
              {parcel.title_health_score || 95} / 100
            </div>
            <span className="text-[10px] text-[#054F31]">Statutory Confidence</span>
          </div>
        </div>

        {/* Basic Cadastral Metadata */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[#667085] block">Survey Number:</span>
            <span className="font-mono font-bold text-[#101828]">{parcel.survey_number}</span>
          </div>
          <div>
            <span className="text-[#667085] block">Registered Area:</span>
            <span className="font-mono font-bold text-[#101828]">{formatArea(parcel.area_sqm)}</span>
          </div>
          <div>
            <span className="text-[#667085] block">Classification:</span>
            <span className="font-semibold text-[#101828]">{parcel.land_use}</span>
          </div>
          <div>
            <span className="text-[#667085] block">Sub-Registrar Office:</span>
            <span className="font-semibold text-[#101828]">{parcel.registration_office}</span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Co-Owners & Encumbrances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Co-Owners & Quorum Policy */}
        <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#101828]">
              <Users className="h-4 w-4 text-[#0B3A67]" />
              <span>Registered Co-Owners & Quorum</span>
            </div>
            <span className="text-xs font-mono font-semibold text-[#0B3A67] bg-[#EFF8FF] px-2 py-0.5 rounded">
              Quorum: {parcel.required_owner_approvals || parcel.owners?.length || 1} of {parcel.owners?.length || 1}
            </span>
          </div>

          <div className="space-y-2">
            {(parcel.owners || []).map((owner, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-[#101828]">{owner.name}</span>
                  <div className="text-[11px] text-[#667085] font-mono">ID: {owner.user_id}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-[#0B3A67]">{owner.share_percent}%</span>
                  <span className="block text-[10px] text-emerald-600 font-medium">Active Titleholder</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Encumbrances & Mortgages */}
        <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#101828]">
              <Building className="h-4 w-4 text-[#0B3A67]" />
              <span>Encumbrances & Mortgages</span>
            </div>
            <span className="text-xs text-[#667085]">
              {(parcel.encumbrances || []).length} registered
            </span>
          </div>

          {(parcel.encumbrances || []).length === 0 ? (
            <div className="p-3 bg-[#ECFDF3] rounded-lg border border-[#A6F4C5] text-xs text-[#027A48] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Clean Title: No active mortgages, bank liens, or revenue attachments.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {parcel.encumbrances.map((enc, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-[#101828]">
                    <span>{enc.type}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FEF6EE] text-[#B54708]">
                      {enc.status}
                    </span>
                  </div>
                  <div className="text-[#475467]">Institution: {enc.holder}</div>
                  {enc.amount_inr && (
                    <div className="font-mono text-[#0B3A67] font-semibold">
                      Charge Amount: {formatCurrencyINR(enc.amount_inr)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SCN-12: Partition Split Graph (If Partitioned) */}
      {isPartitioned && (
        <div className="rounded-xl border border-[#B9D5F4] bg-[#F0F7FF] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-[#0B3A67] border-b border-[#B9D5F4] pb-2">
            <GitFork className="h-4 w-4" />
            <span>Cadastral Partition Hierarchy (SCN-12)</span>
          </div>
          <p className="text-xs text-[#344054]">
            This parcel was partitioned under Civil Court Decree 1950. The original polygon was divided into child cadastral units:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-white rounded-lg border border-[#B9D5F4] text-xs space-y-1">
              <span className="font-mono font-bold text-[#0B3A67]">UP-NOI-0011-A</span>
              <p className="text-[#475467]">Area: 750.0 m² · North Section</p>
              <span className="text-[10px] bg-[#ECFDF3] text-[#027A48] px-1.5 py-0.5 rounded font-semibold">Separate ULPIN Minted</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-[#B9D5F4] text-xs space-y-1">
              <span className="font-mono font-bold text-[#0B3A67]">UP-NOI-0011-B</span>
              <p className="text-[#475467]">Area: 750.0 m² · South Section</p>
              <span className="text-[10px] bg-[#ECFDF3] text-[#027A48] px-1.5 py-0.5 rounded font-semibold">Separate ULPIN Minted</span>
            </div>
          </div>
        </div>
      )}

      {/* Cadastral Chain of Custody (Timeline) */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2">
          <div className="flex items-center gap-2 font-bold text-sm text-[#101828]">
            <History className="h-4 w-4 text-[#0B3A67]" />
            <span>Cadastral History & Chain of Custody</span>
          </div>
          <span className="text-xs text-[#667085]">
            {(parcel.history || []).length} registered events
          </span>
        </div>

        <div className="space-y-3">
          {(parcel.history || []).map((event, idx) => (
            <React.Fragment key={idx}>
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-[#101828]">{event.event_type?.replace(/_/g, " ")}</span>
                  <p className="text-[#475467] text-[11px] mt-0.5">{event.details || event.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-[#344054] font-semibold">{formatDate(event.date)}</span>
                  {event.tx_hash && (
                    <span className="block font-mono text-[10px] text-[#98A2B3]">
                      tx: {event.tx_hash.slice(0, 10)}...
                    </span>
                  )}
                </div>
              </div>

              {/* SCN-11: Explicit Historical Gap Warning Segment in Timeline */}
              {isHistoryGap && idx === 0 && (
                <div className="p-4 rounded-lg border border-[#FECDCA] bg-[#FEF3F2] text-xs text-[#B42318] space-y-1">
                  <div className="flex items-center gap-2 font-bold text-[#D92D20]">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>HISTORICAL GAP SEGMENT DETECTED (1978 — 1994) [SCN-11]</span>
                  </div>
                  <p className="text-[11px] text-[#7A271A] leading-relaxed">
                    A 16-year chain-of-custody hiatus exists between registered deeds. Journal Entry No. 412 is missing from district archives.
                    Special statutory indemnity affidavit required for conveyance.
                  </p>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Generated Token Modal */}
      {activeTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-[#EFF8FF] text-[#0B3A67] flex items-center justify-center">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#101828]">Sell Token Issued</h3>
                  <p className="text-[11px] text-[#667085]">24-hour single use authorization</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTokenModal(null)}
                className="p-1 rounded text-[#667085] hover:bg-[#F2F4F7]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#475467] uppercase tracking-wider">
                Cryptographic Token (HMAC-SHA256)
              </span>
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] font-mono text-xs text-[#0B3A67] break-all select-all">
                {activeTokenModal.token_string}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleCopyToken(activeTokenModal.token_string)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-4 py-2 text-xs font-semibold text-[#344054]"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy Token"}</span>
              </button>
              <button
                onClick={() => setActiveTokenModal(null)}
                className="rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyDetail;
