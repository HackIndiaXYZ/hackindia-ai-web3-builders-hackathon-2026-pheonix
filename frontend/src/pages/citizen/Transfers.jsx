import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getDemoTransfers } from "../../lib/store.js";
import { formatCurrencyINR, formatDate } from "../../lib/utils.js";
import {
  ArrowRightLeft,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText
} from "lucide-react";

export function Transfers() {
  const { user } = useAuth();
  const transfers = getDemoTransfers();

  const [filter, setFilter] = useState("ALL");

  const filteredTransfers = transfers.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return t.status === "PENDING_OWNER_CONSENT" || t.status === "AWAITING_REGISTRAR" || t.status === "SUBMITTED_TO_REGISTRAR";
    if (filter === "COMPLETED") return t.status === "COMMITTED" || t.status === "SETTLED" || t.status === "COMPLETED";
    if (filter === "REJECTED") return t.status === "REJECTED" || t.status === "EXPIRED";
    return true;
  });

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAECF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            Transfer Petitions & Conveyance Ledger
          </h1>
          <p className="mt-1 text-xs text-[#475467]">
            Review all conveyance petitions filed across owned, associated, and purchased cadastral parcels.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1 rounded-lg bg-[#F2F4F7] p-1 border border-[#D0D5DD] text-xs">
          {["ALL", "ACTIVE", "COMPLETED", "REJECTED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md font-semibold transition-colors flex-1 sm:flex-initial text-center ${
                filter === f ? "bg-[#0B3A67] text-white shadow-sm" : "text-[#475467] hover:text-[#101828]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Transfers List */}
      <div className="space-y-3">
        {filteredTransfers.map((tr) => (
          <div
            key={tr.request_id}
            className="rounded-xl border border-[#D0D5DD] bg-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#0B3A67]">
                  {tr.request_id}
                </span>
                <span className="font-mono text-xs text-[#475467]">({tr.ulpin})</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    tr.status === "COMMITTED"
                      ? "bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]"
                      : tr.status === "REJECTED" || tr.status === "EXPIRED"
                      ? "bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]"
                      : "bg-[#FFFBEB] text-[#B54708] border border-[#FDE68A]"
                  }`}
                >
                  {tr.status}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#475467]">
                <span>Buyer: <strong className="text-[#101828]">{tr.buyer_user_id}</strong></span>
                <span>·</span>
                <span>Price: <strong className="font-mono text-[#0B3A67]">{formatCurrencyINR(tr.agreed_price_inr)}</strong></span>
                <span>·</span>
                <span>Created: {formatDate(tr.created_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Link
                to={`/citizen/transfers/${tr.request_id}`}
                className="w-full sm:w-auto justify-center inline-flex items-center gap-1.5 rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA] shadow-sm"
              >
                <span>View Petition</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Transfers;
