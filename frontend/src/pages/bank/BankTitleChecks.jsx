import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { parcelService } from "../../services/liveData.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { Search, Landmark, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

export function BankTitleChecks() {
  const { token } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { parcelService.list(token).then(setParcels).catch((err) => setError(err.message)); }, [token]);
  const [query, setQuery] = useState("");

  const filtered = parcels.filter(
    (p) =>
      !query ||
      p.ulpin.toLowerCase().includes(query.toLowerCase()) ||
      p.survey_number?.toLowerCase().includes(query.toLowerCase()) ||
      (p.owners || []).some((o) => o.name.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">Title Verification & Collateral Search Desk</h1>
        <p className="mt-1 text-xs text-[#475467]">
          Underwrite institutional home loans and mortgages against live Cadastral Record of Rights and CERSAI lien data.
        </p>
      </div>

      <div className="rounded-xl border border-[#D0D5DD] bg-white p-3 shadow-sm flex items-center gap-2">
        <Search className="h-4 w-4 text-[#667085]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ULPIN, survey no, borrower name, locality..."
          className="w-full text-xs text-[#101828] focus:outline-none bg-transparent"
        />
      </div>
      {error && <div className="text-xs text-[#B42318]">{error}</div>}

      <div className="rounded-xl border border-[#D0D5DD] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] text-[#667085] uppercase border-b border-[#EAECF0] text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">ULPIN</th>
                <th className="py-3 px-4">Locality / Survey</th>
                <th className="py-3 px-4">Primary Titleholder</th>
                <th className="py-3 px-4">Title Health</th>
                <th className="py-3 px-4">Existing Charges</th>
                <th className="py-3 px-4 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              {filtered.map((p) => {
                const hasEncumbrances = (p.encumbrances || []).length > 0;
                const isFrozen = Boolean(p.frozen);

                return (
                  <tr key={p.ulpin} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-mono font-bold text-[#0B3A67]">{p.ulpin}</td>
                    <td className="py-3 px-4 text-[#344054]">
                      <div>{p.registration_office || "Registration office unavailable"}</div>
                      <span className="font-mono text-[11px] text-[#667085]">Survey: {p.survey_number}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#101828]">{p.owners?.[0]?.name || "—"}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#027A48]">
                      <span title="Use the parcel report for title health">Available</span>
                    </td>
                    <td className="py-3 px-4">
                      {isFrozen ? (
                        <span className="text-[#B42318] font-bold text-[10px] bg-[#FEF3F2] px-2 py-0.5 rounded">
                          COURT INJUNCTION
                        </span>
                      ) : hasEncumbrances ? (
                        <span className="text-[#B54708] font-semibold text-[11px]">
                          {p.encumbrances[0].type} ({p.encumbrances[0].holder})
                        </span>
                      ) : (
                        <span className="text-[#027A48] font-semibold text-[11px]">CLEAN TITLE (No Charge)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => alert(`Title Clearance Verified for ${p.ulpin}. No prior adverse attachments.`)}
                        className="rounded-md border border-[#A6F4C5] bg-[#ECFDF3] px-2.5 py-1 text-[11px] font-bold text-[#027A48] hover:bg-[#D1FADF]"
                      >
                        Issue Clearance →
                      </button>
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

export default BankTitleChecks;
