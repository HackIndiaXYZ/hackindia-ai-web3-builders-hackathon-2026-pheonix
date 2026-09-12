import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Shield, KeyRound, UserCheck, Landmark, LogOut, ArrowRight, BadgeCheck } from "lucide-react";

/**
 * Top-right interactive authentication bar on the 3D Map Explorer.
 * - Shows "Registrar login" & "User login" when unauthenticated.
 * - Shows officer / citizen identity, portal shortcut, and logout when authenticated.
 */
export function TopBarAuth() {
  const { user, isAuthenticated, isCitizen, isRegistrar, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  if (isAuthenticated && user) {
    return (
      <div className="fixed top-5 right-5 z-30 flex items-center gap-2 select-none">
        {/* Authenticated User Status Pill */}
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-navy-900/90 p-1.5 pl-3 shadow-glass backdrop-blur-xl">
          {isRegistrar ? (
            /* Registrar Officer Identity */
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Landmark className="h-3.5 w-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                  <span>{user.name}</span>
                  <span className="rounded bg-amber-500/20 px-1 py-0.2 font-mono text-[9px] text-amber-300 border border-amber-500/30">
                    {user.badge}
                  </span>
                </div>
                <div className="text-[10px] text-amber-400 font-mono">
                  Sub-Registrar Authority
                </div>
              </div>
            </div>
          ) : (
            /* Citizen Identity */
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                <UserCheck className="h-3.5 w-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                  <span>{user.name}</span>
                  <span className="rounded bg-cyan-500/20 px-1 py-0.2 font-mono text-[9px] text-cyan-300 border border-cyan-500/30">
                    {user.roles?.[0] || "CITIZEN"}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Verified Titleholder
                </div>
              </div>
            </div>
          )}

          {/* Portal Dashboard Link Button */}
          <Link
            to={isRegistrar ? "/registrar/dashboard" : "/citizen/dashboard"}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
              isRegistrar
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-navy-950 hover:from-amber-400 hover:to-amber-500 shadow-sm"
                : "bg-cyan-500 text-navy-950 hover:bg-cyan-400 shadow-cyan-glow-sm"
            }`}
          >
            <span>{isRegistrar ? "Registrar Console" : "Citizen Portal"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out of TitleLock"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Unauthenticated Guest View: Dual Pill Buttons
  return (
    <div className="fixed top-5 right-5 z-30 flex items-center gap-2 select-none">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-navy-900/85 p-1 shadow-glass backdrop-blur-xl">
        {/* Registrar Login Pill */}
        <Link
          to="/auth/registrar"
          title="Departmental Registrar Portal"
          className="flex items-center gap-1.5 rounded-full bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-all hover:bg-white/10 hover:text-white hover:border-amber-500/40 border border-transparent"
        >
          <Shield className="h-3.5 w-3.5 text-amber-400" />
          <span>Registrar login</span>
        </Link>

        {/* User Login Pill */}
        <Link
          to="/auth/citizen"
          title="Citizen Titleholder Portal"
          className="flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3.5 py-1.5 text-xs font-medium text-cyan-300 transition-all hover:bg-cyan-500/20 hover:text-white border border-cyan-500/30 shadow-cyan-glow-sm"
        >
          <KeyRound className="h-3.5 w-3.5 text-cyan-brand" />
          <span>User login</span>
        </Link>
      </div>
    </div>
  );
}
