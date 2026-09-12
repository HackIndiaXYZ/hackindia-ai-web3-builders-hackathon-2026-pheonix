import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import mockData from "../../data/land-registry-ui-mock-data.json" with { type: "json" };
import { StatusChip } from "../../components/StatusChip.jsx";
import { formatArea, formatCurrencyINR, formatDate } from "../../lib/utils.js";
import {
  FileSpreadsheet,
  Search,
  ArrowRight,
  Filter,
  ArrowLeft,
  Building2,
  Users,
  ShieldAlert,
  AlertTriangle,
  GitFork,
  History,
  Lock
} from "lucide-react";

export function ParcelRegister() {
  const { ulpin: paramUlpin } = useParams();
  const parcels = mockData.parcels || [];

  const [filterQuery, setFilterQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // If paramUlpin is provided, show detailed RoR view for that parcel
  const detailedParcel = useMemo(() => {
    if (!paramUlpin) return null;
    return parcels.find((p) => p.ulpin.toLowerCase() === paramUlpin.toLowerCase());
  }, [paramUlpin, parcels]);

  const filtered = useMemo(() => {
    return parcels.filter((p) => {
      const matchQuery =
        !filterQuery ||
        p.ulpin.toLowerCase().includes(filterQuery.toLowerCase()) ||
        p.locality.toLowerCase().includes(filterQuery.toLowerCase()) ||
        p.survey_number.toLowerCase().includes(filterQuery.toLowerCase()) ||
        (p.owners || []).some((o) =>
          o.name.toLowerCase().includes(filterQuery.toLowerCase())
        );

      const matchStatus =
        statusFilter === "ALL" ||
        (p.title_status || "").toUpperCase().includes(statusFilter);

      return matchQuery && matchStatus;
    });
  }, [parcels, filterQuery, statusFilter]);

  if (detailedParcel) {
    const isHistoryGap = detailedParcel.ulpin === "UP-NOI-0010-HISTORY-GAP";
    const isPartitioned = detailedParcel.ulpin === "UP-NOI-0011-PARTITION";
    const isFrozen = detailedParcel.title_status === "FROZEN";

    return (
      <div className="space-y-6 text-left animate-fade-slide-up">
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-4">
          <Link
            to="/registrar/parcels"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3A67] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to All Parcels</span>
          </Link>
          <span className="font-mono text-xs text-[#667085]">
            RoR Document: {detailedParcel.ulpin}
          </span>
        </div>

        {/* Detailed Parcel Hero */}
        <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAECF0] pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-mono text-xl font-bold text-[#0B3A67]">
                  {detailedParcel.ulpin}
                </h1>
                <StatusChip status={detailedParcel.title_status} isPublic={false} />
              </div>
              <p className="mt-1 text-xs text-[#475467]">
                {detailedParcel.locality}, {detailedParcel.district} · Sub-Registry: {detailedParcel.registration_office}
              </p>
            </div>

            <div className="rounded-lg bg-[#ECFDF3] border border-[#A6F4C5] p-3 text-right">
              <span className="text-[10px] font-bold text-[#027A48] uppercase">Title Health</span>
              <div className="font-mono text-xl font-bold text-[#027A48]">
                {detailedParcel.title_health_score || 95} / 100
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[#667085] block">Survey Number:</span>
              <span className="font-mono font-bold text-[#101828]">{detailedParcel.survey_number}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Registered Area:</span>
              <span className="font-mono font-bold text-[#101828]">{formatArea(detailedParcel.area_sqm)}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Land Classification:</span>
              <span className="font-semibold text-[#101828]">{detailedParcel.land_use}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Tenure Structure:</span>
              <span className="font-semibold text-[#101828]">{detailedParcel.ownership_type}</span>
            </div>
          </div>
        </div>

        {/* Co-Owners & Encumbrances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] border-b border-[#EAECF0] pb-2">
              Registered Titleholders
            </h2>
            <div className="space-y-2 text-xs">
              {(detailedParcel.owners || []).map((o, idx) => (
                <div key={idx} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] flex justify-between">
                  <div>
                    <span className="font-bold text-[#101828]">{o.name}</span>
                    <span className="text-[10px] text-[#667085] block font-mono">{o.user_id}</span>
                  </div>
                  <span className="font-mono font-bold text-[#0B3A67]">{o.share_percent}% Share</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] border-b border-[#EAECF0] pb-2">
              Encumbrances & Injunctions
            </h2>
            {(detailedParcel.encumbrances || []).length === 0 ? (
              <p className="text-xs text-[#027A48] bg-[#ECFDF3] p-3 rounded-lg border border-[#A6F4C5]">
                Clean Cadastral Standing: No encumbrances or charges registered.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {detailedParcel.encumbrances.map((e, idx) => (
                  <div key={idx} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] space-y-1">
                    <div className="flex justify-between font-bold text-[#101828]">
                      <span>{e.type}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FEF6EE] text-[#B54708]">{e.status}</span>
                    </div>
                    <div className="text-[#475467]">Holder: {e.holder}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SCN-12: Partition Split Graph */}
        {isPartitioned && (
          <div className="rounded-xl border border-[#B9D5F4] bg-[#F0F7FF] p-5 shadow-sm space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-[#0B3A67]">
              <GitFork className="h-4 w-4" />
              <span>Cadastral Partition Split Ledger (SCN-12)</span>
            </div>
            <p className="text-[#344054]">
              Civil Court Partition Decree 1950 split this parent parcel into 2 independent cadastral titles:
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white rounded-lg border border-[#B9D5F4]">
                <span className="font-mono font-bold text-[#0B3A67]">UP-NOI-0011-A</span>
                <p className="text-[#667085] text-[11px]">Area: 750.0 m² · North Cadastre</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-[#B9D5F4]">
                <span className="font-mono font-bold text-[#0B3A67]">UP-NOI-0011-B</span>
                <p className="text-[#667085] text-[11px]">Area: 750.0 m² · South Cadastre</p>
              </div>
            </div>
          </div>
        )}

        {/* Chain of custody timeline */}
        <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3 text-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] border-b border-[#EAECF0] pb-2">
            Historical Deed Chain of Custody
          </h2>
          <div className="space-y-2">
            {(detailedParcel.history || []).map((h, idx) => (
              <React.Fragment key={idx}>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] flex justify-between">
                  <div>
                    <span className="font-bold text-[#101828]">{h.event_type?.replace(/_/g, " ")}</span>
                    <p className="text-[11px] text-[#667085]">{h.details || h.description}</p>
                  </div>
                  <span className="font-mono text-[#344054]">{formatDate(h.date)}</span>
                </div>

                {/* SCN-11 History gap warning */}
                {isHistoryGap && idx === 0 && (
                  <div className="p-3 rounded-lg border border-[#FECDCA] bg-[#FEF3F2] text-[#B42318] text-xs">
                    <span className="font-bold">HISTORICAL GAP (1978 - 1994) [SCN-11]: </span>
                    Missing Journal No. 412 in district archives.
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            Official Cadastral Parcel Register (Record of Rights)
          </h1>
          <p className="mt-1 text-xs text-[#475467]">
            Statutory RoR database containing all 12 jurisdictional cadastral parcels, tenure classifications, and health ratings.
          </p>
        </div>
        <span className="font-mono text-xs text-[#667085]">
          {filtered.length} of {parcels.length} Records
        </span>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-xl border border-[#D0D5DD] bg-white p-3 shadow-sm text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#667085]" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search by ULPIN, survey number, owner name, locality..."
            className="w-full rounded-lg border border-[#D0D5DD] bg-[#F8FAFC] py-2 pl-9 pr-3 text-xs text-[#101828] focus:border-[#0B3A67] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#667085]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-xs font-semibold text-[#344054]"
          >
            <option value="ALL">All Statuses</option>
            <option value="VERIFIED">Verified Clean</option>
            <option value="REVIEW">Review Required</option>
            <option value="FROZEN">Frozen</option>
            <option value="SUCCESSION">Succession</option>
          </select>
        </div>
      </div>

      {/* Denser Table */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] text-[#667085] uppercase border-b border-[#EAECF0] text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">ULPIN</th>
                <th className="py-3 px-4">Survey / Locality</th>
                <th className="py-3 px-4">Registered Owner</th>
                <th className="py-3 px-4">Area</th>
                <th className="py-3 px-4">Title Status</th>
                <th className="py-3 px-4">Health Score</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              {filtered.map((p) => (
                <tr key={p.ulpin} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#0B3A67]">
                    <Link to={`/registrar/parcels/${p.ulpin}`} className="hover:underline">
                      {p.ulpin}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-[#344054]">
                    <div className="font-semibold">{p.locality}</div>
                    <div className="font-mono text-[11px] text-[#667085]">Survey: {p.survey_number}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-[#101828]">
                    {p.owners?.[0]?.name || "—"}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#344054]">
                    {formatArea(p.area_sqm)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusChip status={p.title_status} isPublic={false} size="xs" />
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-[#027A48]">
                    {p.title_health_score || 95} / 100
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/registrar/parcels/${p.ulpin}`}
                      className="rounded-md border border-[#D0D5DD] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0B3A67] hover:bg-[#F2F4F7]"
                    >
                      Audit Record →
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

export default ParcelRegister;
