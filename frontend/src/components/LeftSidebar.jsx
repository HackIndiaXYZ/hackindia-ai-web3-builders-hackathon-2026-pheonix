import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  ShieldCheck,
  LayoutDashboard,
  Home,
  UserCircle,
  Crosshair,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Landmark,
  UserCheck,
  LogOut,
  KeyRound,
  Shield,
} from "lucide-react";
import { formatArea } from "../lib/utils.js";

/**
 * Fixed rounded glass sidebar (~260px, left)
 * - Dynamic session awareness: Shows authenticated citizen/registrar profile & portal shortcuts.
 * - Items: 3D Map Explorer, Dashboard, My property, My account / Portal.
 * - Quick focus chips from map_layers.demo_viewport.
 * - Public read-only demo notice, disclaimer, and required attributions.
 */
export function LeftSidebar({
  activeView,
  setActiveView,
  demoViewport = [],
  parcels = [],
  onSelectParcelByUlpin,
  selectedParcelUlpin,
  isOpenMobile,
  onCloseMobile,
}) {
  const { user, isAuthenticated, isCitizen, isRegistrar, logout } = useAuth();

  // Aggregate statistics across parcels
  const stats = React.useMemo(() => {
    const totalParcels = parcels.length;
    const verifiedCount = parcels.filter(
      (p) => p.title_status === "VERIFIED" || p.title_status === "SUCCESSION_COMPLETED"
    ).length;
    const disputedCount = parcels.filter(
      (p) => p.title_status === "DISPUTED" || p.title_status === "FROZEN" || p.risk_status === "HIGH_RISK"
    ).length;
    const totalArea = parcels.reduce((sum, p) => sum + (p.area_sqm || 0), 0);

    return {
      totalParcels,
      verifiedCount,
      disputedCount,
      totalArea,
    };
  }, [parcels]);

  // Find user's own parcels if logged in as citizen
  const userParcels = React.useMemo(() => {
    if (!user || !isCitizen) return [];
    return parcels.filter((p) => {
      const isOwner = (p.owners || []).some(
        (o) => o.user_id === user.id || o.name?.toLowerCase() === user.name?.toLowerCase()
      );
      const isNominee = (p.nominees || []).some(
        (n) => n.user_id === user.id || n.name?.toLowerCase() === user.name?.toLowerCase()
      );
      return isOwner || isNominee;
    });
  }, [parcels, user, isCitizen]);

  // Quick focus items from demo viewport
  const demoChips = [
    { ulpin: "UP-NOI-0001-CLEAN", label: "Clean Parcel", badge: "Clean", color: "text-emerald-400 border-emerald-500/30" },
    { ulpin: "UP-NOI-0002-JOINT", label: "Joint Ownership", badge: "Joint", color: "text-emerald-400 border-emerald-500/30" },
    { ulpin: "UP-GNO-0003-SUCCESSION", label: "Succession Pending", badge: "Succession", color: "text-blue-400 border-blue-500/30" },
    { ulpin: "UP-NOI-0008-OVERLAP", label: "Boundary Overlap", badge: "Overlap", color: "text-amber-400 border-amber-500/30" },
    { ulpin: "UP-NOI-0009-DISPUTED", label: "Disputed / Frozen", badge: "Frozen", color: "text-rose-400 border-rose-500/30" },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto pr-1">
      {/* Top Header & Navigation */}
      <div className="space-y-3.5">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 px-1 pt-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-400/40 shadow-cyan-glow-sm">
            <ShieldCheck className="h-5 w-5 text-cyan-brand" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-sm tracking-wide text-white">
                TitleLock
              </span>
              <span className="font-mono text-xs font-semibold text-cyan-400">
                Explorer
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              UP Cadastral 3D Registry
            </div>
          </div>
        </div>

        {/* Live Authenticated User Session Card / Public Badge */}
        {isAuthenticated && user ? (
          <div className={`rounded-2xl border p-2.5 space-y-2 text-left ${
            isRegistrar
              ? "border-amber-500/30 bg-amber-500/10"
              : "border-cyan-500/30 bg-cyan-500/10"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isRegistrar ? (
                  <Landmark className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
                )}
                <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-white truncate max-w-[140px]">
                  {user.name}
                </span>
              </div>
              <span className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase ${
                isRegistrar ? "bg-amber-500/20 text-amber-300" : "bg-cyan-500/20 text-cyan-300"
              }`}>
                {isRegistrar ? "Registrar" : "Citizen"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
              <Link
                to={isRegistrar ? "/registrar/dashboard" : "/citizen/dashboard"}
                className={`flex-1 rounded-lg py-1 px-2 text-[11px] font-bold text-center transition-all ${
                  isRegistrar
                    ? "bg-amber-500 text-navy-950 hover:bg-amber-400"
                    : "bg-cyan-500 text-navy-950 hover:bg-cyan-400 shadow-cyan-glow-sm"
                }`}
              >
                {isRegistrar ? "Open Console →" : "Citizen Portal →"}
              </Link>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="rounded-lg p-1 text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Public Read-Only Demo Pill Badge */
          <div className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="font-mono text-[10px] font-bold tracking-wider text-cyan-300 uppercase">
                PUBLIC READ-ONLY DEMO
              </span>
            </div>
            <Sparkles className="h-3 w-3 text-cyan-400" />
          </div>
        )}

        {/* Nav Items */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setActiveView("map")}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
              activeView === "map"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Crosshair className="h-4 w-4 text-cyan-400" />
              <span>3D Map Explorer</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          </button>

          <button
            type="button"
            onClick={() => setActiveView("dashboard")}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
              activeView === "dashboard"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="h-4 w-4 text-slate-400" />
              <span>Registry Telemetry</span>
            </div>
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
              {stats.totalParcels}
            </span>
          </button>

          {/* My Property: Dynamically focuses user parcel if citizen, or demo parcel */}
          <button
            type="button"
            onClick={() => {
              if (userParcels.length > 0) {
                onSelectParcelByUlpin(userParcels[0].ulpin);
              } else {
                onSelectParcelByUlpin("UP-NOI-0001-CLEAN");
              }
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Home className="h-4 w-4 text-slate-400" />
              <span>{isAuthenticated && isCitizen ? `My Properties (${userParcels.length})` : "My Property (Demo)"}</span>
            </div>
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] text-emerald-400 border border-emerald-500/30">
              Verified
            </span>
          </button>

          {/* Account / Portal Link */}
          {isAuthenticated ? (
            <Link
              to={isRegistrar ? "/registrar/dashboard" : "/citizen/account"}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-all"
            >
              <div className="flex items-center gap-2.5">
                <UserCircle className="h-4 w-4 text-cyan-400" />
                <span>Account Profile</span>
              </div>
              <span className="font-mono text-[10px] text-cyan-400">Manage →</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setActiveView("account")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                activeView === "account"
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UserCircle className="h-4 w-4 text-slate-400" />
                <span>Demo Directory</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">Sample</span>
            </button>
          )}
        </div>

        {/* Quick Focus Section from demo_viewport */}
        <div className="pt-1">
          <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Quick Focus</span>
            <span className="text-[9px] text-cyan-400">Interactive</span>
          </div>
          <div className="space-y-1">
            {demoChips.map((chip) => {
              const isSelected = selectedParcelUlpin === chip.ulpin;
              return (
                <button
                  key={chip.ulpin}
                  type="button"
                  onClick={() => onSelectParcelByUlpin(chip.ulpin)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all text-left ${
                    isSelected
                      ? "bg-cyan-500/20 text-white border border-cyan-400/50 shadow-cyan-glow-sm"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="truncate">{chip.label}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.2 font-mono text-[9px] border bg-black/20 ${chip.color}`}>
                    {chip.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Authentication Portal Switchers if guest */}
        {!isAuthenticated && (
          <div className="rounded-xl border border-white/5 bg-white/5 p-2 space-y-1.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 px-1">
              Authentication Surfaces
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <Link
                to="/auth/citizen"
                className="flex items-center justify-center gap-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 py-1.5 text-cyan-300 hover:bg-cyan-500/25 transition-colors font-medium text-[11px]"
              >
                <KeyRound className="h-3 w-3" />
                <span>Citizen</span>
              </Link>
              <Link
                to="/auth/registrar"
                className="flex items-center justify-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/30 py-1.5 text-amber-300 hover:bg-amber-500/25 transition-colors font-medium text-[11px]"
              >
                <Shield className="h-3 w-3" />
                <span>Registrar</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer Attributions & Synthetic Demo Disclaimer */}
      <div className="pt-3 border-t border-white/10 space-y-2 text-[10px] text-slate-400 leading-relaxed">
        <div className="rounded-lg bg-white/5 p-2 text-slate-400 border border-white/5 text-[10px]">
          <div className="flex items-center gap-1 text-cyan-400 font-semibold mb-0.5">
            <Info className="h-3 w-3 shrink-0" />
            <span>Demonstration Notice</span>
          </div>
          Synthetic data for demonstration only. This interface does not establish legal ownership.
        </div>

        <div className="space-y-0.5 font-mono text-[9px] text-slate-500 pt-0.5">
          <div>© OpenFreeMap © OpenMapTiles © OpenStreetMap contributors</div>
          <div>Sources: Esri, Maxar, Earthstar Geographics</div>
          <div>Terrain: AWS Open Data terrain tiles</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Glass Sidebar */}
      <aside className="fixed left-5 top-5 bottom-5 z-30 hidden lg:block w-[260px] rounded-3xl border border-white/10 bg-navy-900/85 p-4 shadow-glass backdrop-blur-2xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in"
          onClick={onCloseMobile}
        >
          <div
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-navy-900 p-4 border-r border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
