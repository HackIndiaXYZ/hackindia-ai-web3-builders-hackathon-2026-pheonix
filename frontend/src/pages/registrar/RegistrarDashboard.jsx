import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import mockData from "../../data/land-registry-ui-mock-data.json";
import {
  Landmark,
  BadgeCheck,
  ShieldAlert,
  Layers,
  FileCheck2,
  Scale,
  ArrowRight,
  AlertTriangle,
  Building,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { formatArea, formatCurrencyINR } from "../../lib/utils.js";
import { getStatusBadgeProps } from "../../lib/parcelColors.js";

export function RegistrarDashboard() {
  const { user } = useAuth();
  const parcels = mockData.parcels || [];
  const auditEvents = mockData.audit_events || [];

  // Summary counts
  const totalParcels = parcels.length;
  const reviewCount = parcels.filter(
    (p) => p.title_status?.includes("REVIEW") || p.risk_status === "HIGH_RISK"
  ).length;
  const frozenCount = parcels.filter(
    (p) => p.title_status === "FROZEN" || p.freeze != null
  ).length;
  const verifiedCount = parcels.filter((p) => p.title_status === "VERIFIED").length;

  return (
    <div className="space-y-6 text-left">
      {/* Administrative Header Banner */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-[#090f20] via-[#0d152a] to-[#121c38] p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 font-mono text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                <BadgeCheck className="h-3.5 w-3.5" />
                <span>Registrar Console · {user?.badge || "GOV-REG-0182"}</span>
              </span>
              <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 font-mono text-[10px] text-slate-400">
                Auth: {user?.authMethod || "BADGE"}
              </span>
            </div>

            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
              Sub-Registrar Authority Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              {user?.organization || "Office of the Sub-Registrar, Noida-II"} · Statutory Cadastral Mutation Adjudication
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/registrar/parcels"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-navy-950 transition-all hover:from-amber-400 hover:to-amber-500 shadow-sm"
            >
              <Layers className="h-4 w-4" />
              <span>Jurisdictional Parcels ({totalParcels})</span>
            </Link>
            <Link
              to="/registrar/audit"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-all"
            >
              <FileCheck2 className="h-4 w-4 text-amber-400" />
              <span>Audit Trail</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Official Identity & Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Officer Card */}
        <div className="rounded-2xl border border-amber-500/20 bg-[#080e1e]/90 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
            <span>Officer Credential</span>
            <Landmark className="h-4 w-4 text-amber-400" />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 font-bold font-mono text-sm border border-amber-500/30">
              {user?.name?.charAt(0) || "P"}
            </div>
            <div>
              <div className="font-semibold text-white text-sm">{user?.name}</div>
              <div className="text-[11px] font-mono text-amber-300">{user?.designation}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Official Badge:</span>
              <span className="text-amber-300 font-bold">{user?.badge}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Directory KYC:</span>
              <span className="text-emerald-400 font-bold">{user?.identity_status}</span>
            </div>
          </div>
        </div>

        {/* Jurisdiction Card */}
        <div className="rounded-2xl border border-amber-500/20 bg-[#080e1e]/90 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
            <span>Jurisdiction</span>
            <Building className="h-4 w-4 text-cyan-400" />
          </div>

          <div>
            <div className="text-sm font-semibold text-white">{user?.organization}</div>
            <div className="text-xs text-slate-400 mt-0.5">District: Gautam Budh Nagar, UP</div>
          </div>

          <div className="pt-2 border-t border-white/5 text-xs space-y-1">
            <span className="text-slate-400 block text-[10px] font-mono">Departmental Wallet:</span>
            <span className="font-mono text-[11px] text-cyan-300 truncate block">
              {user?.wallet || "0xREG001DEMO"}
            </span>
          </div>
        </div>

        {/* Role Constraints & Safeguards */}
        <div className="rounded-2xl border border-amber-500/20 bg-[#080e1e]/90 p-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
            <span>Statutory Constraints</span>
            <Scale className="h-4 w-4 text-amber-400" />
          </div>

          {user?.role_constraints && user.role_constraints.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-[11px] text-amber-200 font-medium">
                Active Separation of Duties:
              </div>
              <div className="flex flex-wrap gap-1">
                {user.role_constraints.map((c) => (
                  <span
                    key={c}
                    className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 font-mono text-[9px] text-amber-300"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 pt-1">
              Standard full registrar adjudication authority. No restrictive delegation constraints recorded.
            </div>
          )}

          <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 font-mono">
            Audited under Uttar Pradesh Land Records Manual
          </div>
        </div>
      </div>

      {/* Cadastral Caseload KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Parcels</span>
          <span className="font-mono text-2xl font-bold text-white block mt-1">{totalParcels}</span>
          <span className="text-[10px] text-cyan-400 font-mono mt-1 block">Survey Sector 18</span>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <span className="text-[10px] text-emerald-300 font-mono uppercase block">Unencumbered Verified</span>
          <span className="font-mono text-2xl font-bold text-emerald-400 block mt-1">{verifiedCount}</span>
          <span className="text-[10px] text-emerald-300 font-mono mt-1 block">Title Verified</span>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <span className="text-[10px] text-amber-300 font-mono uppercase block">Pending Review</span>
          <span className="font-mono text-2xl font-bold text-amber-400 block mt-1">{reviewCount}</span>
          <span className="text-[10px] text-amber-300 font-mono mt-1 block">Overlap / Risk Flags</span>
        </div>

        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
          <span className="text-[10px] text-rose-300 font-mono uppercase block">Court Injunctions</span>
          <span className="font-mono text-2xl font-bold text-rose-400 block mt-1">{frozenCount}</span>
          <span className="text-[10px] text-rose-300 font-mono mt-1 block">Frozen Records</span>
        </div>
      </div>

      {/* High Attention Caseload Table */}
      <div className="rounded-3xl border border-white/10 bg-[#080e1e]/90 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white font-display">
              Cadastral Adjudication Queue
            </h2>
            <p className="text-xs text-slate-400">
              Parcels requiring officer intervention, boundary review, or court order compliance.
            </p>
          </div>
          <Link
            to="/registrar/parcels"
            className="text-xs text-amber-400 hover:underline font-mono"
          >
            All Parcels →
          </Link>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 font-mono text-[11px] text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-4">ULPIN & Survey</th>
                <th className="py-3 px-4">Registered Owner</th>
                <th className="py-3 px-4">Status & Flag</th>
                <th className="py-3 px-4">Cadastral Area</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {parcels.slice(0, 5).map((p) => {
                const statusBadge = getStatusBadgeProps(p.title_status);
                return (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-300">
                      {p.ulpin}
                      <span className="block font-normal text-[11px] text-slate-400">
                        {p.survey_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {p.owners?.[0]?.name || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {formatArea(p.area_sqm)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/?ulpin=${encodeURIComponent(p.ulpin)}`}
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

      {/* Permissions Granted */}
      {user?.permissions && user.permissions.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#080e1e]/70 p-5 space-y-3">
          <div className="text-xs font-mono uppercase text-slate-400">
            Statutory Registrar Powers Granted
          </div>
          <div className="flex flex-wrap gap-2">
            {user.permissions.map((perm) => (
              <span
                key={perm}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 font-mono text-[10px] text-amber-300"
              >
                {perm}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
