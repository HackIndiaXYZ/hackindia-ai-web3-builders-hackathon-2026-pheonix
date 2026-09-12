import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLiveParcels } from "../../services/liveData.js";
import { Layers, Search, ArrowRight, ShieldCheck, Scale, AlertTriangle, Landmark } from "lucide-react";
import { formatArea, formatCurrencyINR } from "../../lib/utils.js";
import { getStatusBadgeProps, getRiskBadgeProps } from "../../lib/parcelColors.js";

export function RegistrarParcels() {
  const { token } = useAuth();
  const { data: parcels, loading, error } = useLiveParcels(token);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredParcels = React.useMemo(() => {
    return parcels.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.ulpin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.survey_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.owners?.some((o) => o.name?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "VERIFIED" && (p.title_status === "VERIFIED" || p.title_status === "SUCCESSION_COMPLETED")) ||
        (statusFilter === "REVIEW" && p.title_status?.includes("REVIEW")) ||
        (statusFilter === "DISPUTED" && (p.title_status === "DISPUTED" || p.risk_status === "HIGH_RISK")) ||
        (statusFilter === "FROZEN" && (p.title_status === "FROZEN" || p.freeze != null));

      return matchesSearch && matchesStatus;
    });
  }, [parcels, searchTerm, statusFilter]);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Jurisdictional Cadastral Parcels
          </h1>
          <p className="text-xs text-slate-400">
            Official cadastral index for Sub-Registrar Noida-II · Gautam Budh Nagar.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-navy-950 hover:bg-amber-400 transition-all shadow-sm"
        >
          <span>Open 3D Map Explorer</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading && <div className="text-xs text-slate-400">Loading live parcel records...</div>}
      {error && <div className="text-xs text-rose-300">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#080e1e]/90 p-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ULPIN, Survey No, or Owner..."
            className="w-full rounded-xl border border-white/10 bg-[#050914] pl-10 pr-4 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          {["ALL", "VERIFIED", "REVIEW", "DISPUTED", "FROZEN"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                statusFilter === st
                  ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Parcels Table */}
      <div className="rounded-3xl border border-white/10 bg-[#080e1e]/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 font-mono text-[11px] text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">ULPIN & Survey</th>
                <th className="py-3.5 px-4">Primary Titleholder</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Cadastral Area</th>
                <th className="py-3.5 px-4">Health Score</th>
                <th className="py-3.5 px-4">Active Flags</th>
                <th className="py-3.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!loading && !error && filteredParcels.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-xs text-slate-400">No parcels match this filter.</td></tr>}
              {filteredParcels.map((parcel) => {
                const statusBadge = getStatusBadgeProps(parcel.title_status);
                const hasOverlap = parcel.overlap_findings?.length > 0;
                const hasEncumbrance = parcel.encumbrances?.length > 0;
                const hasFreeze = parcel.freeze != null;

                return (
                  <tr key={parcel.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-amber-300 block">
                        {parcel.ulpin}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {parcel.survey_number}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-200">
                      <div className="font-medium">{parcel.owners?.[0]?.name || "—"}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {parcel.ownership_type} ({parcel.owners?.[0]?.share_percent || 100}%)
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      {formatArea(parcel.area_sqm)}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {parcel.title_health_score}/100
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {hasFreeze && (
                          <span className="rounded bg-rose-500/20 px-1.5 py-0.2 font-mono text-[9px] text-rose-300 border border-rose-500/40">
                            Court Freeze
                          </span>
                        )}
                        {hasOverlap && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.2 font-mono text-[9px] text-amber-300 border border-amber-500/40">
                            Boundary Overlap
                          </span>
                        )}
                        {hasEncumbrance && (
                          <span className="rounded bg-blue-500/20 px-1.5 py-0.2 font-mono text-[9px] text-blue-300 border border-blue-500/40">
                            Bank Lien
                          </span>
                        )}
                        {!hasFreeze && !hasOverlap && !hasEncumbrance && (
                          <span className="text-[10px] text-slate-500 font-mono">Unencumbered</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/?ulpin=${encodeURIComponent(parcel.ulpin)}`}
                        className="font-mono text-cyan-400 hover:underline text-[11px] inline-flex items-center gap-1"
                      >
                        <span>3D View</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
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
