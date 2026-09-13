import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getStoredSellTokens, revokeStoredSellToken, generateStandardSellToken } from "../../lib/sellTokenEngine.js";
import { useLiveParcels } from "../../services/liveData.js";
import {
  KeyRound,
  QrCode,
  ShieldCheck,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  Plus,
  X,
  Clock
} from "lucide-react";

export function SellKeys() {
  const { keyId: routeKeyId } = useParams();
  const { user, token } = useAuth();
  const { data: parcels, loading, error } = useLiveParcels(token);

  const [tokens, setTokens] = useState(() => getStoredSellTokens());
  const [selectedToken, setSelectedToken] = useState(() => {
    if (routeKeyId) {
      return tokens.find((t) => t.key_id === routeKeyId) || null;
    }
    return tokens[0] || null;
  });

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedUlpin, setSelectedUlpin] = useState(parcels[0]?.ulpin || "");
  const [targetBuyer, setTargetBuyer] = useState("USR-BUY-001");
  const [copied, setCopied] = useState(false);

  const handleRevoke = (keyId) => {
    revokeStoredSellToken(keyId);
    const updated = getStoredSellTokens();
    setTokens(updated);
    if (selectedToken?.key_id === keyId) {
      setSelectedToken({ ...selectedToken, revoked: true });
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      const generated = await generateStandardSellToken({
        ulpin: selectedUlpin,
        ownerUserId: user?.id || "USR-OWN-001",
        buyerUserId: targetBuyer,
        transferRequestId: `TR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        scope: "FULL_CONVEYANCE",
        ttlHours: 24,
      }, token);
      const updated = getStoredSellTokens();
      setTokens(updated);
      setSelectedToken(generated);
      setShowGenerateModal(false);
    } catch (err) {
      alert(err.message || "Failed to issue sell token.");
    }
  };

  const handleCopy = (str) => {
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
            Cryptographic Sell Tokens (HMAC-SHA256)
          </h1>
          <p className="mt-1 text-xs text-[#475467]">
            Section 5 Standard: Single-use 24-hour authorization tokens binding seller, buyer, ULPIN, and nonce.
          </p>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA] shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Generate New Sell Token</span>
        </button>
      </div>

      {loading && <div className="text-xs text-[#667085]">Loading live properties...</div>}
      {error && <div className="text-xs text-[#B42318]">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
            Issued Tokens ({tokens.length})
          </h2>

          {tokens.length === 0 ? (
            <div className="p-4 rounded-xl border border-[#D0D5DD] bg-white text-center text-xs text-[#667085]">
              No Sell Tokens issued yet in this demo session.
            </div>
          ) : (
            tokens.map((token) => {
              const isSelected = selectedToken?.key_id === token.key_id;
              const isExpired = new Date(token.expires_at) < new Date();
              return (
                <div
                  key={token.key_id}
                  onClick={() => setSelectedToken(token)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#0B3A67] bg-[#F0F7FF] shadow-sm ring-1 ring-[#0B3A67]"
                      : "border-[#D0D5DD] bg-white hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0B3A67]">
                      {token.key_id}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                        token.revoked
                          ? "bg-[#FEF3F2] text-[#B42318]"
                          : isExpired
                          ? "bg-[#F2F4F7] text-[#667085]"
                          : "bg-[#ECFDF3] text-[#027A48]"
                      }`}
                    >
                      {token.revoked ? "REVOKED" : isExpired ? "EXPIRED" : "ACTIVE"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-[#475467]">
                    <span className="font-mono">{token.ulpin}</span> · <span>Buyer: {token.buyer_user_id}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Token Detail Console */}
        <div className="lg:col-span-2">
          {selectedToken ? (
            <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#EAECF0] pb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-[#0B3A67]">
                      {selectedToken.key_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        selectedToken.revoked
                          ? "bg-[#FEF3F2] text-[#B42318]"
                          : "bg-[#ECFDF3] text-[#027A48]"
                      }`}
                    >
                      {selectedToken.revoked ? "REVOKED" : "VALID 24H"}
                    </span>
                  </div>
                  <p className="text-xs text-[#667085] mt-1">
                    Standard TLK1 Token format with Web Crypto HMAC-SHA256 signature
                  </p>
                </div>

                {!selectedToken.revoked && (
                  <button
                    onClick={() => handleRevoke(selectedToken.key_id)}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-md border border-[#FECACA] bg-white text-xs font-semibold text-[#B42318] hover:bg-[#FEF2F2]"
                  >
                    Revoke Token
                  </button>
                )}
              </div>

              {/* Raw Token String */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
                    Serialized Token String
                  </span>
                  <button
                    onClick={() => handleCopy(selectedToken.token_string || selectedToken.key_id)}
                    className="text-xs text-[#0B3A67] hover:underline flex items-center gap-1"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] font-mono text-xs text-[#0B3A67] break-all select-all">
                  {selectedToken.token_string || selectedToken.key_id}
                </div>
              </div>

              {/* Claims Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-[#F7F9FC] p-4 rounded-lg border border-[#EAECF0]">
                <div>
                  <span className="text-[#667085] block">ULPIN:</span>
                  <span className="font-mono font-bold text-[#101828]">{selectedToken.ulpin}</span>
                </div>
                <div>
                  <span className="text-[#667085] block">Buyer:</span>
                  <span className="font-bold text-[#101828]">{selectedToken.buyer_user_id}</span>
                </div>
                <div>
                  <span className="text-[#667085] block">Seller:</span>
                  <span className="font-bold text-[#101828]">{selectedToken.owner_user_id}</span>
                </div>
                <div>
                  <span className="text-[#667085] block">Scope:</span>
                  <span className="font-mono text-[#0B3A67] font-semibold">{selectedToken.scope || "FULL_CONVEYANCE"}</span>
                </div>
                <div>
                  <span className="text-[#667085] block">Nonce:</span>
                  <span className="font-mono text-[#667085]">{selectedToken.nonce}</span>
                </div>
                <div>
                  <span className="text-[#667085] block">Expires At:</span>
                  <span className="font-mono font-bold text-[#027A48]">
                    {new Date(selectedToken.expires_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#D0D5DD] bg-white p-12 text-center text-xs text-[#667085]">
              Select a Sell Token from the left list to inspect its cryptographic payload.
            </div>
          )}
        </div>
      </div>

      {/* Issuance Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <h3 className="text-sm font-bold text-[#101828]">Issue Standard Sell Token</h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1 rounded text-[#667085] hover:bg-[#F2F4F7]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#344054] mb-1">Select Property (ULPIN)</label>
                <select
                  value={selectedUlpin}
                  onChange={(e) => setSelectedUlpin(e.target.value)}
                  className="w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2"
                >
                  {parcels.map((p) => (
                    <option key={p.ulpin} value={p.ulpin}>
                      {p.ulpin} ({p.locality})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#344054] mb-1">Named Buyer Recipient</label>
                <select
                  value={targetBuyer}
                  onChange={(e) => setTargetBuyer(e.target.value)}
                  className="w-full rounded-md border border-[#D0D5DD] bg-white px-3 py-2"
                >
                  <option value="USR-BUY-001">Amit Sharma (USR-BUY-001)</option>
                  <option value="USR-OWN-001">Rajesh Kumar (USR-OWN-001)</option>
                  <option value="USR-SUC-001">Rohan Nair (USR-SUC-001)</option>
                </select>
              </div>

              <div className="p-3 bg-[#EFF8FF] rounded-lg border border-[#B2DDFF] text-[11px] text-[#0B3A67]">
                Tokens expire automatically after 24 hours and can be consumed exactly once at the Registrar desk.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-lg border border-[#D0D5DD] bg-white px-4 py-2 text-xs font-semibold text-[#344054]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA]"
                >
                  Generate Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SellKeys;
