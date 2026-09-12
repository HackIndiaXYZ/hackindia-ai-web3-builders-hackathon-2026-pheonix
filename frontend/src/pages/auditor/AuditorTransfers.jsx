import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getDemoTransfers } from "../../lib/store.js";
import { formatCurrencyINR, formatDate } from "../../lib/utils.js";
import { Inbox, ArrowLeft, ShieldCheck, AlertTriangle } from "lucide-react";

export function AuditorTransfers() {
  const { requestId: paramRequestId } = useParams();
  const transfers = getDemoTransfers();

  const selectedTransfer = paramRequestId ? transfers.find((t) => t.request_id === paramRequestId) : null;

  if (selectedTransfer) {
    return (
      <div className="space-y-6 text-left animate-fade-slide-up">
        <div className="border-b border-[#EAECF0] pb-4 flex items-center justify-between">
          <Link to="/auditor/transfers" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E7090] hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Transfer Scrutiny</span>
          </Link>
          <span className="font-mono text-xs text-[#667085]">Transfer: {selectedTransfer.request_id}</span>
        </div>

        <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAECF0] pb-4">
            <div>
              <h1 className="font-mono text-xl font-bold text-[#0E7090]">{selectedTransfer.request_id}</h1>
              <p className="text-xs text-[#475467] mt-1">Target: {selectedTransfer.ulpin}</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full uppercase bg-[#ECFEFF] text-[#0E7090] border border-[#BAE6FD]">
              {selectedTransfer.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-[#F8FAFC] p-4 rounded-xl border border-[#EAECF0]">
            <div>
              <span className="text-[#667085] block">Declared Price:</span>
              <span className="font-mono font-bold text-[#101828]">{formatCurrencyINR(selectedTransfer.agreed_price_inr)}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Buyer:</span>
              <span className="font-bold text-[#101828]">{selectedTransfer.buyer_user_id}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Risk Score:</span>
              <span className="font-bold text-[#B42318]">{selectedTransfer.risk_score || 0}/100</span>
            </div>
            <div>
              <span className="text-[#667085] block">Filing Date:</span>
              <span className="text-[#101828]">{formatDate(selectedTransfer.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">Transfer Petitions Audit Desk</h1>
        <p className="text-xs text-[#475467]">
          Oversight scrutiny of buyer filings, titleholder quorum compliance, and statutory consideration declarations.
        </p>
      </div>

      <div className="rounded-xl border border-[#D0D5DD] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] text-[#667085] uppercase border-b border-[#EAECF0] text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Petition ID</th>
                <th className="py-3 px-4">Cadastral Target</th>
                <th className="py-3 px-4">Buyer ID</th>
                <th className="py-3 px-4">Consideration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Scrutiny</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              {transfers.map((t) => (
                <tr key={t.request_id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4 font-mono font-bold text-[#0E7090]">{t.request_id}</td>
                  <td className="py-3 px-4 font-mono text-[#0B3A67]">{t.ulpin}</td>
                  <td className="py-3 px-4 font-mono text-[#475467]">{t.buyer_user_id}</td>
                  <td className="py-3 px-4 font-mono text-[#101828]">{formatCurrencyINR(t.agreed_price_inr)}</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F2F4F7] text-[#344054]">
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link to={`/auditor/transfers/${t.request_id}`} className="font-semibold text-[#0E7090] hover:underline">
                      Audit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AuditorTransfers;
