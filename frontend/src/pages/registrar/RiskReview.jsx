import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLiveParcels } from "../../services/liveData.js";
import { ShieldAlert, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

export function RiskReview() {
  const { token } = useAuth();
  const { data: parcels, loading, error } = useLiveParcels(token);
  const flagged = parcels.filter(
    (p) => p.title_status?.includes("REVIEW") || p.title_status?.includes("GAP") || p.title_status === "FROZEN" || p.title_health_score < 90
  );

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">
          Cadastral Risk & Fraud Assessments Register
        </h1>
        <p className="mt-1 text-xs text-[#475467]">
          Automated risk scoring, boundary conflict checks, and historical gap inspections across all 12 parcels.
        </p>
      </div>

      {loading && <div className="text-xs text-[#667085]">Loading live risk records...</div>}
      {error && <div className="text-xs text-[#B42318]">{error}</div>}

      <div className="space-y-4">
        {!loading && !error && flagged.length === 0 && <div className="text-xs text-[#667085]">No flagged parcels are currently reported.</div>}
        {flagged.map((p) => (
          <div
            key={p.ulpin}
            className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#0B3A67]">{p.ulpin}</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
                    {p.title_status}
                  </span>
                </div>
                <p className="text-xs text-[#475467] mt-1">{p.locality}, {p.district}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-[#667085] uppercase block">Health Score</span>
                  <span className="font-mono text-base font-bold text-[#B42318]">
                    {p.title_health_score}/100
                  </span>
                </div>
                <Link
                  to={`/registrar/parcels/${p.ulpin}`}
                  className="rounded-lg bg-[#0B3A67] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1769AA]"
                >
                  Inspect Deed →
                </Link>
              </div>
            </div>

            <div className="text-xs text-[#475467] space-y-1">
              <div><strong>Survey Number:</strong> {p.survey_number} · <strong>Registered Area:</strong> {p.area_sqm} m²</div>
              <div><strong>Primary Owner:</strong> {p.owners?.[0]?.name || "N/A"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RiskReview;
