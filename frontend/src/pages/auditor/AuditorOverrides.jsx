import React from "react";
import { getDemoAuditEvents } from "../../lib/store.js";
import { formatDate } from "../../lib/utils.js";
import { ShieldAlert, FileText } from "lucide-react";

export function AuditorOverrides() {
  const events = getDemoAuditEvents();
  const overrides = events.filter((e) => e.action?.includes("OVERRIDE") || e.details?.includes("Override"));

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">High-Risk Overrides Scrutiny Ledger</h1>
        <p className="mt-1 text-xs text-[#475467]">
          Statutory oversight of Sub-Registrar discretionary overrides on high-risk conveyances.
        </p>
      </div>

      <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-[#101828]">Logged Administrative Overrides ({overrides.length})</h2>

        {overrides.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#667085] bg-[#F8FAFC] rounded-lg">
            No administrative overrides logged in the current audit window.
          </div>
        ) : (
          <div className="divide-y divide-[#EAECF0]">
            {overrides.map((ov, idx) => (
              <div key={idx} className="py-3 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#0E7090]">{ov.action}</span>
                  <span className="text-[#667085] font-mono text-[11px]">{formatDate(ov.timestamp)}</span>
                </div>
                <p className="text-[#344054]">{ov.details}</p>
                <div className="text-[11px] text-[#667085]">
                  Officer Badge: <strong className="text-[#101828]">{ov.actor_id}</strong> · Target: <span className="font-mono text-[#0B3A67]">{ov.ulpin}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditorOverrides;
