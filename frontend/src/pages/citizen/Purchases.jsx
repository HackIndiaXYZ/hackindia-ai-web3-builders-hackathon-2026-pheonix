import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import mockData from "../../data/land-registry-ui-mock-data.json" with { type: "json" };
import { formatCurrencyINR, formatDate } from "../../lib/utils.js";
import {
  ShoppingBag,
  CheckCircle2,
  Boxes,
  FileCheck,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Clock,
  Printer
} from "lucide-react";

export function Purchases() {
  const { user } = useAuth();
  const transfers = mockData.transfer_requests || [];

  // Completed transfer TR-2026-007 (SCN-14)
  const completedTransfer = transfers.find((t) => t.request_id === "TR-2026-007") || transfers[0];

  // Active purchases
  const activePurchases = transfers.filter(
    (t) => t.buyer_user_id === "USR-BUY-001" || t.buyer_user_id === user?.id
  );

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      {/* Header */}
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">
          Purchases, Conveyance Deeds & Minted Titles
        </h1>
        <p className="mt-1 text-xs text-[#475467]">
          Track land acquisition petitions, digital conveyance counter-signing, and immutable blockchain deeds.
        </p>
      </div>

      {/* SCN-14: Completed Transfer Highlight Card */}
      {completedTransfer && (
        <div className="rounded-xl border-2 border-[#12B76A] bg-[#F6FEF9] p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#A6F4C5] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#ECFDF3] border border-[#12B76A] text-[#027A48] px-3 py-0.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#12B76A]" />
                  <span>CONVEYANCE COMPLETE (SCN-14)</span>
                </span>
                <span className="font-mono text-xs font-bold text-[#101828]">
                  {completedTransfer.request_id}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-bold text-[#101828]">
                Digital Title Deed Minted & Transferred
              </h2>
              <p className="text-xs text-[#475467]">
                Parcel: <span className="font-mono font-bold text-[#0B3A67]">{completedTransfer.ulpin}</span> · Consideration: {formatCurrencyINR(completedTransfer.agreed_price_inr)}
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#027A48] px-4 py-2 text-xs font-semibold text-white hover:bg-[#054F31] shadow-sm self-start sm:self-auto"
            >
              <Printer className="h-4 w-4" />
              <span>Print Deed Certificate</span>
            </button>
          </div>

          {/* Blockchain Confirmation Box */}
          <div className="bg-white rounded-lg border border-[#A6F4C5] p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#027A48]">
              <Boxes className="h-4 w-4" />
              <span>Immutable Ledger Confirmation (Ethereum Network)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
              <div>
                <span className="text-[#667085] block">Transaction Hash:</span>
                <span className="text-[#101828] font-bold">
                  {completedTransfer.blockchain_tx_hash || "0x8f2a74c109e2b4f91d847c2098b1a3e"}...
                </span>
              </div>
              <div>
                <span className="text-[#667085] block">Block Height:</span>
                <span className="text-[#101828] font-bold">19,482,714</span>
              </div>
              <div>
                <span className="text-[#667085] block">Status:</span>
                <span className="text-[#027A48] font-bold">Finalized (128 Confirmations)</span>
              </div>
            </div>
          </div>

          {/* Stepper Progression */}
          <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
            <div className="p-2.5 rounded bg-[#ECFDF3] border border-[#A6F4C5] text-[#027A48] font-semibold">
              ✓ Seller Quorum Consent
            </div>
            <div className="p-2.5 rounded bg-[#ECFDF3] border border-[#A6F4C5] text-[#027A48] font-semibold">
              ✓ Sell Token Verified
            </div>
            <div className="p-2.5 rounded bg-[#ECFDF3] border border-[#A6F4C5] text-[#027A48] font-semibold">
              ✓ Registrar Adjudication
            </div>
            <div className="p-2.5 rounded bg-[#ECFDF3] border border-[#A6F4C5] text-[#027A48] font-bold">
              ✓ Title Minted
            </div>
          </div>
        </div>
      )}

      {/* All Purchases Table */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-[#101828]">All Purchase Petitions</h2>
        <div className="divide-y divide-[#EAECF0]">
          {activePurchases.map((p) => (
            <div
              key={p.request_id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#0B3A67]">{p.request_id}</span>
                  <span className="font-mono text-[#475467]">({p.ulpin})</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.status === 'COMMITTED' ? 'bg-[#ECFDF3] text-[#027A48]' : 'bg-[#FEF6EE] text-[#B54708]'}`}>
                    {p.status}
                  </span>
                </div>
                <div className="mt-1 text-[#475467]">
                  Consideration: {formatCurrencyINR(p.agreed_price_inr)} · Initiated: {formatDate(p.created_at)}
                </div>
              </div>

              <Link
                to={`/citizen/transfers/${p.request_id}`}
                className="inline-flex items-center gap-1 rounded-md border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC]"
              >
                <span>Track Progress</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Purchases;
