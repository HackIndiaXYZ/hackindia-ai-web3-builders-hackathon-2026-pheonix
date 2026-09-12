import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getDemoTransfers } from "../../lib/store.js";
import { StatusChip } from "../../components/StatusChip.jsx";
import { formatCurrencyINR, formatDate } from "../../lib/utils.js";
import {
  Inbox,
  ArrowRightLeft,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  KeyRound
} from "lucide-react";

export function Queue() {
  const transfers = getDemoTransfers();
  const [filter, setFilter] = useState("ALL");

  const filteredTransfers = transfers.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "HIGH_RISK") return t.risk_score >= 50 || t.status?.includes("HIGH_RISK") || t.status?.includes("BLOCKED");
    if (filter === "PENDING") return t.status === "PENDING_OWNER_CONSENT" || t.status === "AWAITING_REGISTRAR" || t.status === "SUBMITTED_TO_REGISTRAR";
    if (filter === "COMMITTED") return t.status === "COMMITTED" || t.status === "SETTLED";
    if (filter === "REJECTED") return t.status === "REJECTED" || t.status === "EXPIRED";
    return true;
  });

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAECF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            Sub-Registrar Transfer Petitions Queue
          </h1>
          <p className="mt-1 text-xs text-[#475467]">
            Statutory conveyance petitions awaiting registrar review, risk adjudication, and cryptographic seal.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1 rounded-lg bg-[#F2F4F7] p-1 border border-[#D0D5DD] text-xs">
          {["ALL", "PENDING", "HIGH_RISK", "COMMITTED", "REJECTED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md font-semibold transition-colors flex-1 sm:flex-initial text-center whitespace-nowrap ${
                filter === f ? "bg-[#0B3A67] text-white shadow-sm" : "text-[#475467] hover:text-[#101828]"
              }`}
            >
              {f.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Table */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] text-[#667085] uppercase border-b border-[#EAECF0] text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Cadastral Target</th>
                <th className="py-3 px-4">Parties</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4 text-right">Adjudication Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              {filteredTransfers.map((t) => {
                const isHighRisk = t.risk_score >= 50 || t.status === "HIGH_RISK_BLOCKED";
                return (
                  <tr key={t.request_id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0B3A67]">
                      {t.request_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#101828]">
                      <Link to={`/registrar/parcels/${t.ulpin}`} className="hover:underline">
                        {t.ulpin}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-[#475467]">
                      <div>To: <strong className="text-[#101828]">{t.buyer_user_id}</strong></div>
                      <div className="text-[11px] text-[#667085]">From: {t.seller_user_ids?.[0] || "Owner"}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#101828]">
                      {formatCurrencyINR(t.agreed_price_inr)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          t.status === "COMMITTED"
                            ? "bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]"
                            : t.status === "REJECTED" || t.status === "EXPIRED"
                            ? "bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]"
                            : isHighRisk
                            ? "bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]"
                            : "bg-[#FFFBEB] text-[#B54708] border border-[#FDE68A]"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-mono font-bold text-[11px] ${
                          isHighRisk ? "text-[#B42318]" : "text-[#027A48]"
                        }`}
                      >
                        {t.risk_score ? `Score: ${t.risk_score}` : "CLEARED"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/registrar/transfers/${t.request_id}/verify`}
                          className="rounded-md border border-[#B9D5F4] bg-[#EFF8FF] px-2.5 py-1 text-[11px] font-bold text-[#0B3A67] hover:bg-[#D4E6FA] flex items-center gap-1"
                        >
                          <KeyRound className="h-3 w-3" />
                          <span>Verify Key</span>
                        </Link>
                        <Link
                          to={`/registrar/transfers/${t.request_id}`}
                          className="rounded-md bg-[#0B3A67] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#1769AA]"
                        >
                          Adjudicate →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Queue;
