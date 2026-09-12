import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLiveParcels } from "../../services/liveData.js";
import { Ban, Lock, AlertTriangle } from "lucide-react";

export function BankBlockedCases() {
  const { token } = useAuth();
  const { data: parcels, loading, error } = useLiveParcels(token);
  const blocked = parcels.filter(
    (p) => p.title_status === "FROZEN" || p.ulpin === "UP-NOI-0009-DISPUTED"
  );

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">Blocked Collateral & Injunction Disclosures</h1>
        <p className="mt-1 text-xs text-[#475467]">
          Statutory register of parcels disqualified from mortgage financing due to active litigation, court injunctions, or adverse claims.
        </p>
      </div>

      {loading && <div className="text-xs text-[#667085]">Loading live parcel records...</div>}
      {error && <div className="text-xs text-[#B42318]">{error}</div>}

      <div className="rounded-xl border-2 border-[#D92D20] bg-[#FEF3F2] p-5 text-xs text-[#B42318] space-y-2">
        <div className="flex items-start gap-3">
          <Ban className="h-6 w-6 shrink-0 text-[#D92D20] mt-0.5" />
          <div>
            <span className="font-bold text-sm text-[#D92D20]">
              COLLATERAL FINANCING RESTRICTION (SCN-10)
            </span>
            <p className="mt-1 leading-relaxed">
              Banks and housing finance companies are prohibited from creating equitable mortgages on restrained property.
              Title search returns an automatic <strong>REJECT_COLLATERAL</strong> decision code.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {!loading && !error && blocked.length === 0 && <div className="text-xs text-[#667085]">No blocked collateral is currently reported by the registry.</div>}
        {blocked.map((p) => (
          <div key={p.ulpin} className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <div>
                <span className="font-mono text-base font-bold text-[#0B3A67]">{p.ulpin}</span>
                <p className="text-xs text-[#475467]">{p.locality}, {p.district}</p>
              </div>
              <span className="bg-[#FEF3F2] text-[#B42318] font-bold text-xs px-3 py-1 rounded border border-[#FECDCA]">
                FINANCING PROHIBITED
              </span>
            </div>
            <p className="text-xs text-[#344054]">
              Civil Suit No. 104/2025 restraint order in effect. Disputed boundary and ownership claims pending before District Court.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BankBlockedCases;
