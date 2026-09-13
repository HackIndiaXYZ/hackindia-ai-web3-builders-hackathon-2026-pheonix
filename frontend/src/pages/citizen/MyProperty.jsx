import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { transferService, useLiveParcels, useLiveTransfers } from "../../services/liveData.js";
import { StatusChip } from "../../components/StatusChip.jsx";
import { formatArea, formatCurrencyINR, formatDate } from "../../lib/utils.js";
import { generateStandardSellToken, getStoredSellTokens, revokeStoredSellToken } from "../../lib/sellTokenEngine.js";
import {
  Building2,
  KeyRound,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  XCircle,
  QrCode,
  Copy,
  Check,
  X
} from "lucide-react";

export function MyProperty() {
  const { user, token } = useAuth();
  const { data: parcels, loading: parcelsLoading, error: parcelsError } = useLiveParcels(token);
  const { data: liveTransfers, loading: transfersLoading, error: transfersError } = useLiveTransfers(token);

  const transfers = liveTransfers;
  const [tokens, setTokens] = useState(() => getStoredSellTokens());
  const [activeTokenModal, setActiveTokenModal] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Target buyer selector for sell token generation
  const [targetBuyer, setTargetBuyer] = useState("USR-BUY-001");

  // User's parcels
  const userParcels = React.useMemo(() => {
    if (!user) return [];
    return parcels.filter((p) =>
      (p.owners || []).some(
        (o) => o.user_id === user.id || o.name?.toLowerCase() === user.name?.toLowerCase()
      )
    );
  }, [parcels, user]);

  const handleGenerateToken = async (parcel, requestId = null) => {
    setErrorMsg("");

    // Guardrail checks
    if (parcel.title_status === "FROZEN" || parcel.title_status === "DISPUTED") {
      setErrorMsg(`Token generation prohibited: Parcel ${parcel.ulpin} is subject to a Judicial Court Freeze.`);
      return;
    }
    if (parcel.title_status === "SUCCESSION_PENDING") {
      setErrorMsg(`Token generation prohibited: Legal heir succession proceeding active.`);
      return;
    }
    if (parcel.title_status === "CREDENTIAL_RECOVERY") {
      setErrorMsg(`Token generation prohibited: Parcel is under credential recovery cooling-off period.`);
      return;
    }

    try {
      const generated = await generateStandardSellToken({
        ulpin: parcel.ulpin,
        ownerUserId: user?.id || "USR-OWN-001",
        buyerUserId: targetBuyer,
        transferRequestId: requestId || `TR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        scope: "FULL_CONVEYANCE",
        ttlHours: 24,
      }, token);

      setTokens(getStoredSellTokens());
      setActiveTokenModal(generated);
    } catch (err) {
      setErrorMsg(err.message || "Failed to generate sell token.");
    }
  };

  const handleApproveTransfer = async (requestId) => {
    try { await transferService.approve(requestId, {}, token); window.location.reload(); }
    catch (err) { setErrorMsg(err.message || "The registry could not record this approval."); }
  };

  const handleRejectTransfer = () => {
    setErrorMsg("Owner rejection is not supported by the live registry endpoint.");
  };

  const handleCopyToken = (str) => {
    navigator.clipboard.writeText(str);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAECF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            My Registered Properties & Transfer Authorization
          </h1>
          <p className="mt-1 text-xs text-[#475467]">
            Review cadastral titles, consent to conveyance petitions, and issue single-use cryptographic Sell Tokens.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/citizen/sell-keys"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB]"
          >
            <KeyRound className="h-3.5 w-3.5 text-[#0B3A67]" />
            <span>View All Sell Tokens ({tokens.length})</span>
          </Link>
        </div>
      </div>

      {(parcelsLoading || transfersLoading) && <div className="text-xs text-[#667085]">Loading live property and transfer records...</div>}
      {(parcelsError || transfersError) && <div className="text-xs text-[#B42318]">{parcelsError || transfersError}</div>}

      {errorMsg && (
        <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-xs text-[#B42318] flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 shrink-0 text-[#D92D20] mt-0.5" />
          <div>
            <span className="font-bold">Security Constraint Enforced:</span>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Target Buyer Quick Selector */}
      <div className="bg-white border border-[#D0D5DD] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#0B3A67]" />
          <span className="font-bold text-[#101828]">Target Buyer for Sell Token Issuance:</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={targetBuyer}
            onChange={(e) => setTargetBuyer(e.target.value)}
            className="rounded-md border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs text-[#101828] font-medium"
          >
            <option value="USR-BUY-001">Amit Sharma (USR-BUY-001)</option>
            <option value="USR-OWN-001">Rajesh Kumar (USR-OWN-001)</option>
            <option value="USR-SUC-001">Rohan Nair (USR-SUC-001)</option>
          </select>
        </div>
      </div>

      {/* Properties List */}
      <div className="space-y-4">
        {userParcels.map((parcel) => {
          const isBlocked =
            parcel.title_status === "FROZEN" ||
            parcel.title_status === "SUCCESSION_PENDING" ||
            parcel.title_status === "CREDENTIAL_RECOVERY";

          // Active token for this parcel
          const activeToken = tokens.find((t) => t.ulpin === parcel.ulpin && !t.revoked);

          // Associated transfer petition
          const request = transfers.find((tr) => tr.ulpin === parcel.ulpin);

          return (
            <div
              key={parcel.ulpin}
              className="rounded-xl border border-[#D0D5DD] bg-white shadow-sm overflow-hidden"
            >
              {/* Cadastral Bar */}
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F2F4F7]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-[#0B3A67]">
                      {parcel.ulpin}
                    </span>
                    <StatusChip status={parcel.title_status} isPublic={false} size="sm" />
                    <span className="text-xs text-[#667085] font-semibold bg-[#F2F4F7] px-2 py-0.5 rounded">
                      Health: {parcel.title_health_score}/100
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#475467]">
                    <span>{parcel.locality}, {parcel.district}</span>
                    <span>·</span>
                    <span>Survey: {parcel.survey_number}</span>
                    <span>·</span>
                    <span>Area: {formatArea(parcel.area_sqm)}</span>
                    <span>·</span>
                    <span>Tenure: {parcel.ownership_type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/citizen/properties/${parcel.ulpin}`}
                    className="inline-flex items-center gap-1 rounded-md border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB]"
                  >
                    <span>Full Deed Record</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>

                  <button
                    onClick={() => handleGenerateToken(parcel, request?.request_id)}
                    disabled={isBlocked}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#0B3A67] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1769AA] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isBlocked ? "Token issuance prohibited on blocked parcel" : "Generate 24h HMAC-SHA256 Sell Token"}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Generate Sell Token</span>
                  </button>
                </div>
              </div>

              {/* Active Token Notice */}
              {activeToken && (
                <div className="px-5 py-3 bg-[#EFF8FF] border-b border-[#B2DDFF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#0B3A67] animate-pulse" />
                    <span className="font-bold text-[#0B3A67]">Active Sell Token:</span>
                    <span className="font-mono text-[11px] text-[#175CD3]">{activeToken.key_id}</span>
                    <span className="text-[#667085]">·</span>
                    <span className="text-[#344054]">Recipient: {activeToken.buyer_user_id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#027A48] font-bold">Expires in ~24h</span>
                    <button
                      onClick={() => {
                        revokeStoredSellToken(activeToken.key_id);
                        setTokens(getStoredSellTokens());
                      }}
                      className="text-[11px] text-[#B42318] hover:underline font-semibold"
                    >
                      Revoke Token
                    </button>
                  </div>
                </div>
              )}

              {/* Transfer Request Section */}
              {request && (
                <div className="p-5 bg-[#F8FAFC] border-t border-[#EAECF0] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#101828]">Transfer Request {request.request_id}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#FEF6EE] text-[#B54708] border border-[#F9DBAF]">
                          {request.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[#475467]">
                        <span>Buyer: {request.buyer_user_id}</span> · <span>Value: {formatCurrencyINR(request.agreed_price_inr)}</span> · <span>Date: {formatDate(request.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/citizen/transfers/${request.request_id}`}
                        className="rounded-md border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7]"
                      >
                        Details
                      </Link>
                      {request.status === "PENDING_OWNER_CONSENT" && (
                        <>
                          <button
                            onClick={() => handleApproveTransfer(request.request_id)}
                            className="rounded-md bg-[#027A48] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#054F31] shadow-sm flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Consent</span>
                          </button>
                          <button
                            onClick={() => handleRejectTransfer(request.request_id)}
                            className="rounded-md border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-semibold text-[#B42318] hover:bg-[#FEF2F2]"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Generated Token Modal with QR */}
      {activeTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-[#EFF8FF] text-[#0B3A67] flex items-center justify-center">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#101828]">
                    Standard Sell Token Issued (HMAC-SHA256)
                  </h3>
                  <p className="text-[11px] text-[#667085]">
                    Single-use 24h authorization for {activeTokenModal.buyer_user_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTokenModal(null)}
                className="p-1 rounded text-[#667085] hover:bg-[#F2F4F7]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Token String Box */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#475467] uppercase tracking-wider">
                Cryptographic Token String
              </span>
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] font-mono text-xs text-[#0B3A67] break-all select-all">
                {activeTokenModal.token_string || activeTokenModal.key_id}
              </div>
            </div>

            {/* Token Claims */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-[#F7F9FC] p-3 rounded-lg border border-[#EAECF0]">
              <div>
                <span className="text-[#667085]">Key ID: </span>
                <span className="font-mono font-bold text-[#101828]">{activeTokenModal.key_id}</span>
              </div>
              <div>
                <span className="text-[#667085]">ULPIN: </span>
                <span className="font-mono font-bold text-[#101828]">{activeTokenModal.ulpin}</span>
              </div>
              <div>
                <span className="text-[#667085]">Buyer: </span>
                <span className="font-bold text-[#101828]">{activeTokenModal.buyer_user_id}</span>
              </div>
              <div>
                <span className="text-[#667085]">Expires: </span>
                <span className="font-mono text-[#027A48]">{new Date(activeTokenModal.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleCopyToken(activeTokenModal.token_string || activeTokenModal.key_id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-4 py-2 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB]"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#027A48]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied Token" : "Copy Token"}</span>
              </button>

              <button
                onClick={() => setActiveTokenModal(null)}
                className="rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyProperty;
