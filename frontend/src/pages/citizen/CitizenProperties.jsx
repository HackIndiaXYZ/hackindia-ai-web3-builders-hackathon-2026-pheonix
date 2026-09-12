import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLiveParcels } from "../../services/liveData.js";
import { Home, MapPin, ArrowRight, ShieldCheck, AlertTriangle, Layers, Landmark } from "lucide-react";
import { formatArea, formatCurrencyINR } from "../../lib/utils.js";
import { getStatusBadgeProps, getRiskBadgeProps } from "../../lib/parcelColors.js";

export function CitizenProperties() {
  const { user, token } = useAuth();
  const { data: parcels, loading, error } = useLiveParcels(token);

  const userParcels = React.useMemo(() => {
    if (!user) return [];
    return parcels.filter((p) => {
      const isOwner = (p.owners || []).some(
        (o) => o.user_id === user.id || o.name?.toLowerCase() === user.name?.toLowerCase()
      );
      const isNominee = (p.nominees || []).some(
        (n) => n.user_id === user.id || n.name?.toLowerCase() === user.name?.toLowerCase()
      );
      return isOwner || isNominee;
    });
  }, [parcels, user]);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            My Registered Properties
          </h1>
          <p className="text-xs text-slate-400">
            Cadastral title deeds and legal property interests attached to your citizen ID.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-navy-950 hover:bg-cyan-400 transition-all shadow-cyan-glow-sm"
        >
          <span>View All on 3D Map</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading && <div className="text-xs text-slate-400">Loading live property records...</div>}
      {error && <div className="text-xs text-rose-300">{error}</div>}
      {!loading && !error && userParcels.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-navy-900/60 p-12 text-center space-y-3">
          <Home className="mx-auto h-12 w-12 text-slate-500" />
          <h3 className="font-semibold text-white">No Properties Attached</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            This citizen profile does not currently own land parcels in the demo database. Try logging in as Rajesh Kumar (<span className="font-mono text-cyan-300">rajesh@demo.local</span>) or Anita Kumar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {userParcels.map((parcel) => {
            const statusBadge = getStatusBadgeProps(parcel.title_status);
            const riskBadge = getRiskBadgeProps(parcel.risk_status);

            return (
              <div
                key={parcel.id}
                className="rounded-3xl border border-white/10 bg-navy-900/80 p-6 space-y-4 hover:border-cyan-500/40 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse-subtle" />
                      <span className="font-mono text-base font-bold text-white tracking-wide">
                        {parcel.ulpin}
                      </span>
                      <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                        {parcel.ownership_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span>
                        Survey No: {parcel.survey_number} · {parcel.locality}, {parcel.district}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                    >
                      {statusBadge.label}
                    </span>
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold border ${riskBadge.bg} ${riskBadge.text} ${riskBadge.border}`}
                    >
                      {riskBadge.label}
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-xl bg-white/5 p-3">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Cadastral Area</span>
                    <span className="font-mono font-bold text-white text-sm">{formatArea(parcel.area_sqm)}</span>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Title Health Index</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">{parcel.title_health_score}/100</span>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Permitted Land Use</span>
                    <span className="font-mono font-semibold text-cyan-300 text-sm">{parcel.land_use}</span>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Title Deed Number</span>
                    <span className="font-mono font-semibold text-slate-200 text-sm">{parcel.title_number}</span>
                  </div>
                </div>

                {/* Encumbrances & Nominees */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                  {/* Encumbrance */}
                  <div className="rounded-xl border border-white/5 bg-navy-950/60 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                      <Landmark className="h-4 w-4 text-amber-400" />
                      <span>Encumbrance Status</span>
                    </div>
                    {parcel.encumbrances && parcel.encumbrances.length > 0 ? (
                      <div className="text-amber-300 font-mono text-[11px]">
                        {parcel.encumbrances[0].type} · {formatCurrencyINR(parcel.encumbrances[0].amount_inr)} ({parcel.encumbrances[0].holder})
                      </div>
                    ) : (
                      <div className="text-emerald-400 font-mono text-[11px]">
                        Clean title · No registered bank liens or mortgages
                      </div>
                    )}
                  </div>

                  {/* Nominees */}
                  <div className="rounded-xl border border-white/5 bg-navy-950/60 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                      <ShieldCheck className="h-4 w-4 text-cyan-400" />
                      <span>Registered Succession Nominees</span>
                    </div>
                    {parcel.nominees && parcel.nominees.length > 0 ? (
                      <div className="text-cyan-300 text-[11px]">
                        {parcel.nominees.map((n) => `${n.name} (Priority #${n.priority})`).join(", ")}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[11px]">No active nominees registered</div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  <div className="text-slate-400 text-[11px]">
                    Sub-Registrar: {parcel.registration_office}
                  </div>
                  <Link
                    to={`/?ulpin=${encodeURIComponent(parcel.ulpin)}`}
                    className="font-mono text-cyan-400 hover:underline flex items-center gap-1.5"
                  >
                    <span>Inspect 3D Geometry</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
