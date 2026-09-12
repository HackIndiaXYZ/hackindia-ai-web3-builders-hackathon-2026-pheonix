import React from "react";
import { Link } from "react-router-dom";
import mockData from "../../data/land-registry-ui-mock-data.json" with { type: "json" };
import { formatCurrencyINR, formatDate } from "../../lib/utils.js";
import { Landmark, ShieldCheck, CheckCircle2, Building2 } from "lucide-react";

export function BankMortgages() {
  const parcels = mockData.parcels || [];
  const encumberedParcels = parcels.filter(
    (p) => (p.encumbrances && p.encumbrances.length > 0) || p.ulpin === "UP-NOI-0005-ENCUMBERED"
  );

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">Active Mortgages & Encumbrances Registry</h1>
        <p className="mt-1 text-xs text-[#475467]">
          Statutory register of institutional equitable mortgages, hypothecation charges, and CERSAI filings.
        </p>
      </div>

      {/* SCN-06 Highlight Banner */}
      <div className="rounded-xl border border-[#A6F4C5] bg-[#ECFDF3] p-5 text-xs text-[#027A48] space-y-2">
        <div className="flex items-start gap-3">
          <Landmark className="h-5 w-5 shrink-0 text-[#027A48] mt-0.5" />
          <div>
            <span className="font-bold text-sm text-[#054F31]">
              INSTITUTIONAL MORTGAGE CLEARANCE DESK (SCN-06)
            </span>
            <p className="mt-1 leading-relaxed">
              TitleLock synchronizes directly with institutional lending divisions.
              Active charges on parcel <strong>UP-NOI-0005-ENCUMBERED</strong> are validated against State Bank records before any conveyance is permitted.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {encumberedParcels.map((parcel) => (
          <div key={parcel.ulpin} className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-[#0B3A67]">{parcel.ulpin}</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#FEF6EE] text-[#B54708] border border-[#F9DBAF]">
                    ACTIVE MORTGAGE
                  </span>
                </div>
                <p className="text-xs text-[#475467] mt-1">{parcel.locality}, {parcel.district} · Owner: {parcel.owners?.[0]?.name}</p>
              </div>

              <div className="text-right text-xs">
                <span className="text-[#667085] block">Title Health:</span>
                <span className="font-mono font-bold text-emerald-700">{parcel.title_health_score}/100</span>
              </div>
            </div>

            {/* Mortgages List */}
            <div className="space-y-2">
              {(parcel.encumbrances || [
                { type: "EQUITABLE_MORTGAGE", holder: "State Bank of India", amount_inr: 4500000, status: "ACTIVE" }
              ]).map((enc, idx) => (
                <div key={idx} className="p-4 bg-[#F8FAFC] rounded-xl border border-[#EAECF0] text-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[#667085] block">Charge Type:</span>
                    <span className="font-bold text-[#101828]">{enc.type}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] block">Mortgagee Bank:</span>
                    <span className="font-bold text-[#027A48]">{enc.holder}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] block">Secured Consideration:</span>
                    <span className="font-mono font-bold text-[#0B3A67] text-sm">
                      {formatCurrencyINR(enc.amount_inr || 4500000)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block">CERSAI Registration:</span>
                    <span className="font-mono text-[11px] text-[#027A48] font-bold">CR-2024-91024 (ACTIVE)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BankMortgages;
