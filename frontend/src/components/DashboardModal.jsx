import React from "react";
import { X, ShieldCheck, AlertOctagon, Landmark, Layers, TrendingUp, ArrowUpRight } from "lucide-react";
import { formatArea, formatCurrencyINR } from "../lib/utils.js";
import { getStatusBadgeProps, getRiskBadgeProps } from "../lib/parcelColors.js";

/**
 * Dashboard View modal providing high-level cadastral registry telemetry
 */
export function DashboardModal({ parcels = [], onClose, onSelectParcel }) {
  const totalParcels = parcels.length;
  const verifiedCount = parcels.filter(
    (p) => p.title_status === "VERIFIED" || p.title_status === "SUCCESSION_COMPLETED"
  ).length;
  const reviewCount = parcels.filter((p) => p.title_status?.includes("REVIEW")).length;
  const disputedCount = parcels.filter(
    (p) => p.title_status === "DISPUTED" || p.title_status === "FROZEN" || p.risk_status === "HIGH_RISK"
  ).length;
  const totalArea = parcels.reduce((sum, p) => sum + (p.area_sqm || 0), 0);
  const totalEncumbrance = parcels.reduce((sum, p) => {
    const encTotal = (p.encumbrances || []).reduce((eSum, e) => eSum + (e.amount_inr || 0), 0);
    return sum + encTotal;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-navy-900/95 shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-navy-950/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">
                Cadastral Registry Telemetry
              </h2>
              <p className="text-xs text-slate-400">
                Gautam Budh Nagar / Sub-Registrar Noida-II Jurisdictional Overview
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <div className="text-xs text-slate-400 font-mono uppercase">Total Parcels</div>
              <div className="mt-1 text-2xl font-bold text-white font-mono">{totalParcels}</div>
              <div className="mt-1 text-[11px] text-cyan-400 font-mono">100% Geo-indexed</div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
              <div className="text-xs text-emerald-300 font-mono uppercase">Clean / Verified</div>
              <div className="mt-1 text-2xl font-bold text-emerald-400 font-mono">{verifiedCount}</div>
              <div className="mt-1 text-[11px] text-emerald-300">
                {Math.round((verifiedCount / totalParcels) * 100)}% Title Confidence
              </div>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5">
              <div className="text-xs text-rose-300 font-mono uppercase">Disputed / Injunction</div>
              <div className="mt-1 text-2xl font-bold text-rose-400 font-mono">{disputedCount}</div>
              <div className="mt-1 text-[11px] text-rose-300">Court Restraints Active</div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5">
              <div className="text-xs text-amber-300 font-mono uppercase">Total Encumbrance</div>
              <div className="mt-1 text-lg font-bold text-amber-400 font-mono truncate">
                {formatCurrencyINR(totalEncumbrance)}
              </div>
              <div className="mt-1 text-[11px] text-amber-300">Registered Bank Liens</div>
            </div>
          </div>

          {/* Registry Parcel Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
                Cadastral Survey Records
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Total Land Mass: {formatArea(totalArea)}
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-navy-950/70 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 font-mono text-[11px] text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="py-2.5 px-4">ULPIN & Survey</th>
                    <th className="py-2.5 px-4">Primary Holder</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Area</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {parcels.map((parcel) => {
                    const statusBadge = getStatusBadgeProps(parcel.title_status);
                    return (
                      <tr
                        key={parcel.id}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                        onClick={() => {
                          onSelectParcel(parcel);
                          onClose();
                        }}
                      >
                        <td className="py-2.5 px-4">
                          <div className="font-mono font-bold text-cyan-300 group-hover:text-cyan-brand">
                            {parcel.ulpin}
                          </div>
                          <div className="text-[11px] text-slate-400">{parcel.survey_number}</div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-200">
                          {parcel.owners?.[0]?.name || "—"}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-medium border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-300">
                          {formatArea(parcel.area_sqm)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-cyan-400 font-mono text-[11px] group-hover:underline">
                            Inspect <ArrowUpRight className="h-3 w-3" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
