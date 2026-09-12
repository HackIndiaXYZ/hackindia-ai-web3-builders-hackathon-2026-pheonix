import React from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLiveParcels } from "../../services/liveData.js";
import { formatArea, formatDate } from "../../lib/utils.js";
import { Building2, ArrowLeft, ShieldCheck, History } from "lucide-react";

export function AuditorParcels() {
  const { ulpin: paramUlpin } = useParams();
  const { token } = useAuth();
  const { data: parcels, loading, error } = useLiveParcels(token);

  const selectedParcel = paramUlpin ? parcels.find((p) => p.ulpin.toLowerCase() === paramUlpin.toLowerCase()) : null;

  if (loading) return <div className="text-xs text-[#667085]">Loading live parcel records...</div>;
  if (error) return <div className="text-xs text-[#B42318]">{error}</div>;

  if (selectedParcel) {
    return (
      <div className="space-y-6 text-left animate-fade-slide-up">
        <div className="border-b border-[#EAECF0] pb-4 flex items-center justify-between">
          <Link to="/auditor/parcels" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E7090] hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to All Parcels</span>
          </Link>
                  <span className="font-mono text-xs text-[#667085]">Audit Target: {selectedParcel.ulpin}</span>
        </div>

        <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAECF0] pb-4">
            <div>
              <h1 className="font-mono text-xl font-bold text-[#0E7090]">{selectedParcel.ulpin}</h1>
              <p className="text-xs text-[#475467] mt-1">{selectedParcel.locality}, {selectedParcel.district}</p>
            </div>
            <span className="font-mono text-xs bg-[#ECFEFF] text-[#0E7090] px-3 py-1 rounded-full font-bold border border-[#BAE6FD]">
              Health: {selectedParcel.title_health_score}/100
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-[#F8FAFC] p-4 rounded-xl border border-[#EAECF0]">
            <div>
              <span className="text-[#667085] block">Survey Number:</span>
              <span className="font-mono font-bold text-[#101828]">{selectedParcel.survey_number}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Area:</span>
              <span className="font-mono font-bold text-[#101828]">{formatArea(selectedParcel.area_sqm)}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Tenure:</span>
              <span className="font-semibold text-[#101828]">{selectedParcel.ownership_type}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Title Status:</span>
              <span className="font-bold text-[#0E7090]">{selectedParcel.title_status}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              Chain of Custody Events ({selectedParcel.history?.length || 0})
            </h3>
            <div className="divide-y divide-[#EAECF0]">
              {(selectedParcel.history || selectedParcel.timeline || []).map((h, idx) => (
                <div key={idx} className="py-2.5 flex justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[#101828]">{h.event_type}</span>
                    <p className="text-[11px] text-[#667085]">{h.details || h.description}</p>
                  </div>
                  <span className="font-mono text-[#475467]">{formatDate(h.date)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">Cadastral Chain of Custody Register</h1>
        <p className="text-xs text-[#475467]">
          Statutory titleholder audit, encumbrance verification, and historical deed custody tracking.
        </p>
      </div>

      <div className="rounded-xl border border-[#D0D5DD] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] text-[#667085] uppercase border-b border-[#EAECF0] text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">ULPIN</th>
                <th className="py-3 px-4">Survey No</th>
                <th className="py-3 px-4">Locality</th>
                <th className="py-3 px-4">Primary Titleholder</th>
                <th className="py-3 px-4">Area</th>
                <th className="py-3 px-4 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              {parcels.map((p) => (
                <tr key={p.ulpin} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4 font-mono font-bold text-[#0E7090]">{p.ulpin}</td>
                  <td className="py-3 px-4 font-mono text-[#475467]">{p.survey_number}</td>
                  <td className="py-3 px-4 text-[#344054]">{p.locality}</td>
                  <td className="py-3 px-4 font-medium text-[#101828]">{p.owners?.[0]?.name || "—"}</td>
                  <td className="py-3 px-4 font-mono text-[#344054]">{formatArea(p.area_sqm)}</td>
                  <td className="py-3 px-4 text-right">
                    <Link to={`/auditor/parcels/${p.ulpin}`} className="font-semibold text-[#0E7090] hover:underline">
                      Audit Deed →
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

export default AuditorParcels;
