import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { X, ExternalLink, ShieldCheck, Share2, Landmark, UserCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getStatusBadgeProps, getRiskBadgeProps } from "../lib/parcelColors.js";
import { StatusWarnings } from "./StatusWarnings.jsx";
import { ParcelOverview } from "./ParcelOverview.jsx";
import { RegistryHistoryChart } from "./RegistryHistoryChart.jsx";
import { RegistryTimeline } from "./RegistryTimeline.jsx";

/**
 * Google-Maps-style sliding right drawer.
 * Slides in with fade from right, map stays visible and re-centers.
 * Desktop: right side panel (~460px), Mobile: responsive bottom sheet.
 * Integrated with authentication session to highlight owned properties or officer actions.
 */
export function ParcelDrawer({ parcel, onClose, scrollSignal }) {
  const { user, isCitizen, isRegistrar } = useAuth();
  const drawerScrollRef = useRef(null);

  // When scrollSignal changes (e.g. from search selection), scroll drawer to top smoothly
  useEffect(() => {
    if (drawerScrollRef.current) {
      drawerScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [parcel?.id, scrollSignal]);

  if (!parcel) return null;

  const statusBadge = getStatusBadgeProps(parcel.title_status);
  const riskBadge = getRiskBadgeProps(parcel.risk_status);

  // Check if active authenticated citizen owns this parcel
  const isOwner = Boolean(
    isCitizen &&
      user &&
      ((parcel.owners || []).some(
        (o) => o.user_id === user.id || o.name?.toLowerCase() === user.name?.toLowerCase()
      ) ||
        (parcel.nominees || []).some(
          (n) => n.user_id === user.id || n.name?.toLowerCase() === user.name?.toLowerCase()
        ))
  );

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] flex flex-col bg-navy-900/90 border-l border-white/10 shadow-glass backdrop-blur-2xl transition-transform duration-300 ease-out animate-in slide-in-from-right"
      aria-label="Parcel Details"
    >
      {/* Sticky Header: ULPIN · title_status · risk_status · ownership_type · Close */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-navy-950/80 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-brand animate-pulse-subtle" />
              <h2 className="font-mono text-base font-bold tracking-wide text-white truncate">
                {parcel.ulpin}
              </h2>
            </div>

            {/* Header Status Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {/* Title Status Badge */}
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
              >
                {statusBadge.label}
              </span>

              {/* Risk Status Badge */}
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border ${riskBadge.bg} ${riskBadge.text} ${riskBadge.border}`}
              >
                {riskBadge.label}
              </span>

              {/* Ownership Type Badge */}
              <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-300 border border-white/5">
                {parcel.ownership_type || "SINGLE"}
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close parcel drawer"
            className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Body Content */}
      <div
        ref={drawerScrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-left"
      >
        {/* Contextual Authenticated Citizen Ownership Banner */}
        {isOwner && (
          <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-3.5 text-xs text-cyan-200 flex items-center justify-between gap-2 shadow-cyan-glow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>
                <strong className="text-white">Your Registered Deed:</strong> You are recorded as the legal titleholder of this parcel.
              </span>
            </div>
            <Link
              to="/citizen/properties"
              className="font-mono text-[10px] font-bold text-cyan-300 hover:underline shrink-0"
            >
              My Deeds →
            </Link>
          </div>
        )}

        {/* Contextual Authenticated Registrar Authority Banner */}
        {isRegistrar && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong className="text-white">Registrar Inspection Mode:</strong> Statutory jurisdiction Sub-Registrar Noida-II.
              </span>
            </div>
            <Link
              to="/registrar/parcels"
              className="font-mono text-[10px] font-bold text-amber-300 hover:underline shrink-0"
            >
              Queue →
            </Link>
          </div>
        )}

        {/* Red / Amber Warning Banner (if DISPUTED, FROZEN, HIGH_RISK, encumbrance, or overlap exist) */}
        <StatusWarnings parcel={parcel} />

        {/* Identity, Metrics, Parties, and Conditional Sections */}
        <ParcelOverview parcel={parcel} />

        {/* Registry History Section */}
        <div className="pt-2 border-t border-white/10 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
                Registry History
              </h3>
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                {parcel.history?.length || 0} Recorded Mutations
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Time-scaled title evolution and cadastral surface adjustments.
            </p>
          </div>

          {/* Step / Line Chart */}
          <RegistryHistoryChart parcel={parcel} />

          {/* Vertical Event Timeline & Partition Visualizer */}
          <RegistryTimeline parcel={parcel} />
        </div>

        {/* Bottom Drawer Disclaimer */}
        <div className="pt-4 border-t border-white/10 text-center font-mono text-[10px] text-slate-500">
          State Land Registry Authority · Noida-II Verification Mirror
        </div>
      </div>
    </aside>
  );
}
