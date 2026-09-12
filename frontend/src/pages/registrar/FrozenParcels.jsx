import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLiveParcels } from "../../services/liveData.js";
import { formatArea, formatDate } from "../../lib/utils.js";
import { Lock, AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";

export function FrozenParcels() {
  const { token } = useAuth();
  const { data: parcels, loading, error } = useLiveParcels(token);
  const frozen = parcels.filter((p) => p.title_status === "FROZEN" || p.ulpin === "UP-NOI-0009-DISPUTED");

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">
          Judicial Injunctions & Frozen Parcels Desk
        </h1>
        <p className="mt-1 text-xs text-[#475467]">
          Statutory register of parcels restrained by High Court or District Court injunction orders. All conveyance actions are locked.
        </p>
      </div>

      {loading && <div className="text-xs text-[#667085]">Loading live parcel records...</div>}
      {error && <div className="text-xs text-[#B42318]">{error}</div>}

      {/* SCN-10: Injunction Warning */}
      <div className="rounded-xl border-2 border-[#D92D20] bg-[#FEF3F2] p-5 text-xs text-[#B42318] space-y-2">
        <div className="flex items-start gap-3">
          <Lock className="h-6 w-6 shrink-0 text-[#D92D20] mt-0.5" />
          <div>
            <span className="font-bold text-sm text-[#D92D20]">
              MANDATORY STATUTORY FREEZE PROTOCOL (SCN-10)
            </span>
            <p className="mt-1 leading-relaxed">
              When a judicial restraint order is endorsed in the cadastral register, TitleLock enforces an immediate algorithmic block.
              Sell token issuance, title deed counter-signing, mortgage lien registration, and boundary alterations are disabled across all portals.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {!loading && !error && frozen.length === 0 && <div className="text-xs text-[#667085]">No frozen parcels are currently reported by the registry.</div>}
        {frozen.map((p) => (
          <div
            key={p.ulpin}
            className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-[#0B3A67]">{p.ulpin}</span>
                  <span className="rounded-full bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] px-2.5 py-0.5 text-[10px] font-bold uppercase">
                    COURT FROZEN
                  </span>
                </div>
                <p className="text-xs text-[#475467] mt-1">{p.locality}, {p.district} · Survey No: {p.survey_number}</p>
              </div>

              <Link
                to={`/registrar/parcels/${p.ulpin}`}
                className="rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC]"
              >
                Inspect RoR →
              </Link>
            </div>

            {/* Injunction Case Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#EAECF0] text-xs">
              <div>
                <span className="text-[#667085] block">Judicial Case Citation:</span>
                <span className="font-bold text-[#101828]">Civil Suit No. 104/2025</span>
                <span className="text-[11px] text-[#667085] block">Court of District Judge Gautam Buddha Nagar</span>
              </div>
              <div>
                <span className="text-[#667085] block">Restraining Injunction:</span>
                <span className="font-bold text-[#B42318]">ORDER XXXIX RULES 1 & 2 CPC</span>
                <span className="text-[11px] text-[#475467] block">Status quo on title and possession</span>
              </div>
              <div>
                <span className="text-[#667085] block">Transaction Capability:</span>
                <span className="font-bold text-[#B42318] inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>TOTAL FREEZE ACTIVE</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FrozenParcels;
