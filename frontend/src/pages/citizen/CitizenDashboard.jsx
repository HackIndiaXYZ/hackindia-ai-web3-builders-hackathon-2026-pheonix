import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import mockData from "../../data/land-registry-ui-mock-data.json";
import {
  User,
  ShieldCheck,
  Home,
  CheckCircle2,
  Wallet,
  ArrowRight,
  Sparkles,
  Layers,
  History,
  Users,
  MapPin,
  FileText,
} from "lucide-react";
import { formatArea } from "../../lib/utils.js";
import { getStatusBadgeProps } from "../../lib/parcelColors.js";

export function CitizenDashboard() {
  const { user } = useAuth();
  const parcels = mockData.parcels || [];

  // Filter parcels where current user is an owner or nominee
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
      {/* Welcome Hero Banner */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-navy-900/90 via-navy-900/70 to-cyan-950/40 p-6 sm:p-8 shadow-glass backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-3 py-1 font-mono text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                Citizen Portal · Verified Titleholder
              </span>
              <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 font-mono text-[10px] text-slate-400">
                Auth: {user?.authMethod || "PASSWORD"}
              </span>
            </div>

            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
              Welcome back, {user?.name || "Citizen"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Access your cadastral deed records, verify cryptographic encumbrance status, and inspect statutory succession delegations.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/citizen/properties"
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-navy-950 transition-all hover:bg-cyan-400 shadow-cyan-glow-sm"
            >
              <Home className="h-4 w-4" />
              <span>View My Properties ({userParcels.length})</span>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-all"
            >
              <span>Explore 3D Map</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Profile & Credential Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Identity & Status */}
        <div className="rounded-2xl border border-white/10 bg-navy-900/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Identity Verification</span>
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 font-bold font-mono">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div>
              <div className="font-semibold text-white text-sm">{user?.name}</div>
              <div className="text-[11px] font-mono text-slate-400">{user?.id}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">KYC Status:</span>
              <span className="font-mono text-emerald-400 font-bold">{user?.identity_status || "VERIFIED"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Account:</span>
              <span className="font-mono text-cyan-300">{user?.account_status || "ACTIVE"}</span>
            </div>
          </div>
        </div>

        {/* Roles & Cryptographic Anchor */}
        <div className="rounded-2xl border border-white/10 bg-navy-900/80 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">Registry Anchor</span>
            <Wallet className="h-4 w-4 text-cyan-400" />
          </div>

          <div>
            <div className="text-[11px] text-slate-400">Assigned Cadastral Roles:</div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {(user?.roles || ["OWNER"]).map((role) => (
                <span
                  key={role}
                  className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 text-xs space-y-1">
            <span className="text-slate-400 block text-[10px] font-mono">Simulated Wallet Key:</span>
            <span className="font-mono text-[11px] text-slate-200 truncate block">
              {user?.wallet || "0xOWN001DEMO"}
            </span>
          </div>
        </div>

        {/* Quick Navigation Panel */}
        <div className="rounded-2xl border border-white/10 bg-navy-900/80 p-5 space-y-3">
          <span className="text-xs font-mono uppercase text-slate-400 block">
            Portal Shortcuts
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              to="/citizen/properties"
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-center border border-white/5"
            >
              <Home className="h-4 w-4 text-cyan-400 mb-1" />
              <span className="text-white font-medium">Parcels</span>
            </Link>

            <Link
              to="/citizen/account"
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-center border border-white/5"
            >
              <User className="h-4 w-4 text-cyan-400 mb-1" />
              <span className="text-white font-medium">Account</span>
            </Link>
          </div>

          <div className="pt-2 border-t border-white/5 text-center">
            <Link
              to="/"
              className="text-[11px] text-cyan-400 hover:underline font-mono inline-flex items-center gap-1"
            >
              <span>Launch 3D Explorer View</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* User Properties Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white font-display">
              Registered Titleholdings & Nominations
            </h2>
            <p className="text-xs text-slate-400">
              Cadastral parcels registered under your identity credentials in Gautam Budh Nagar.
            </p>
          </div>
          <Link
            to="/citizen/properties"
            className="text-xs text-cyan-400 hover:underline font-mono"
          >
            View All ({userParcels.length}) →
          </Link>
        </div>

        {userParcels.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-navy-900/60 p-8 text-center space-y-2">
            <Home className="mx-auto h-8 w-8 text-slate-500" />
            <div className="text-sm font-semibold text-slate-300">No properties directly linked</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              This demo citizen profile does not currently hold registered deeds in the sample dataset. Try testing with Rajesh Kumar (<span className="font-mono text-cyan-300">rajesh@demo.local</span>).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userParcels.map((parcel) => {
              const statusBadge = getStatusBadgeProps(parcel.title_status);

              return (
                <div
                  key={parcel.id}
                  className="rounded-2xl border border-white/10 bg-navy-900/80 p-5 space-y-3 hover:border-cyan-500/40 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-cyan-300 group-hover:text-cyan-brand">
                          {parcel.ulpin}
                        </span>
                        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-slate-300">
                          {parcel.ownership_type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Survey No: {parcel.survey_number} · {parcel.locality}
                      </div>
                    </div>

                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-black/20 rounded-xl border border-white/5">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Area</span>
                      <span className="font-bold text-white font-mono">{formatArea(parcel.area_sqm)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Health Score</span>
                      <span className="font-bold text-emerald-400 font-mono">{parcel.title_health_score}/100</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Encumbrance</span>
                      <span className="font-bold text-slate-300 font-mono">
                        {parcel.encumbrances?.length ? `${parcel.encumbrances.length} Active` : "None"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[11px] text-slate-400">
                      Deed: {parcel.title_number || "T-1950-REG"}
                    </span>
                    <Link
                      to={`/?ulpin=${encodeURIComponent(parcel.ulpin)}`}
                      className="font-mono text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>Locate on 3D Map</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Authority Permissions Box */}
      {user?.permissions && user.permissions.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-navy-900/60 p-5 space-y-3">
          <div className="text-xs font-mono uppercase text-slate-400">
            Authorized Citizen Operations
          </div>
          <div className="flex flex-wrap gap-2">
            {user.permissions.map((perm) => (
              <span
                key={perm}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-slate-300"
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
