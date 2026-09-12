import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLiveParcels } from "../../services/liveData.js";
import { Lock, ShieldAlert } from "lucide-react";

export function AuditorFrozen() {
  const { token } = useAuth();
  const { data: parcels, loading, error } = useLiveParcels(token);
  const frozen = parcels.filter((p) => p.title_status === "FROZEN" || p.ulpin === "UP-NOI-0009-DISPUTED");

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">Judicial Freeze Oversight Desk</h1>
        <p className="mt-1 text-xs text-[#475467]">
          Statutory monitoring of parcels subject to judicial injunctions under CPC Order XXXIX.
        </p>
      </div>

      {loading && <div className="text-xs text-[#667085]">Loading live parcel records...</div>}
      {error && <div className="text-xs text-[#B42318]">{error}</div>}

      <div className="space-y-4">
        {!loading && !error && frozen.length === 0 && <div className="text-xs text-[#667085]">No frozen parcels are currently reported by the registry.</div>}
        {frozen.map((p) => (
          <div key={p.ulpin} className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-[#0E7090]">{p.ulpin}</span>
                <span className="bg-[#FEF3F2] text-[#B42318] text-[10px] font-bold px-2 py-0.5 rounded">
                  COURT RESTRAINT ACTIVE
                </span>
              </div>
              <span className="text-xs text-[#667085] font-mono">Injunction No: 104/2025</span>
            </div>
            <p className="text-xs text-[#475467]">
              Restrained by Hon'ble District Court Gautam Buddha Nagar. All algorithmic transaction pathways locked.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AuditorFrozen;
