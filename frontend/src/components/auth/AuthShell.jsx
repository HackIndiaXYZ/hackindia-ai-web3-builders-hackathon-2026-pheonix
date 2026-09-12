import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Landmark, Map, ArrowLeft, ShieldAlert } from "lucide-react";

/**
 * Shell container providing distinct visual themes for Citizen vs Registrar portals.
 * Ensures the two auth surfaces feel like completely different government environments.
 */
export function AuthShell({ portal = "citizen", title, subtitle, badgeLabel, children }) {
  const isRegistrar = portal === "registrar";

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between overflow-x-hidden p-4 sm:p-6 md:p-8 relative ${
        isRegistrar
          ? "bg-[#060a12] text-slate-100"
          : "bg-navy-950 text-slate-100"
      }`}
    >
      {/* Dynamic Background Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {isRegistrar ? (
          <>
            <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
          </>
        )}
      </div>

      {/* Top Bar Navigation */}
      <header className="relative z-20 mx-auto w-full max-w-5xl flex items-center justify-between py-2">
        {/* Brand Link */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${
              isRegistrar
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm"
                : "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-cyan-glow-sm"
            }`}
          >
            {isRegistrar ? <Landmark className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-display font-bold text-sm tracking-wide text-white">
              <span>TitleLock</span>
              <span className={isRegistrar ? "text-amber-400 font-mono text-xs" : "text-cyan-400 font-mono text-xs"}>
                {isRegistrar ? "Departmental" : "Explorer"}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              {isRegistrar ? "Sub-Registrar Authority Command" : "Public Cadastral Title Portal"}
            </div>
          </div>
        </Link>

        {/* Portal Switch Links */}
        <div className="flex items-center gap-2 text-xs">
          <Link
            to="/"
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-all font-mono text-[11px]"
          >
            <Map className="h-3.5 w-3.5 text-cyan-400" />
            <span>3D Public Map</span>
          </Link>

          {isRegistrar ? (
            <Link
              to="/auth/citizen"
              className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-cyan-300 hover:bg-cyan-500/20 transition-all font-medium"
            >
              <span>Citizen Login</span>
              <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
            </Link>
          ) : (
            <Link
              to="/auth/registrar"
              className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-amber-300 hover:bg-amber-500/20 transition-all font-medium"
            >
              <span>Registrar Portal</span>
              <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
            </Link>
          )}
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-20 mx-auto my-auto w-full max-w-md py-6">
        <div
          className={`rounded-3xl border p-6 sm:p-8 shadow-glass backdrop-blur-2xl transition-all duration-300 ${
            isRegistrar
              ? "border-amber-500/30 bg-[#0a0f1c]/90 shadow-amber-500/5"
              : "border-white/10 bg-navy-900/90 shadow-cyan-500/5"
          }`}
        >
          {/* Card Header */}
          <div className="text-center space-y-2 mb-6">
            {badgeLabel && (
              <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-mono font-bold tracking-wider uppercase">
                {isRegistrar ? (
                  <span className="text-amber-400 border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {badgeLabel}
                  </span>
                ) : (
                  <span className="text-cyan-300 border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                    {badgeLabel}
                  </span>
                )}
              </div>
            )}

            <h1 className="font-display font-bold text-xl sm:text-2xl text-white tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Form Content */}
          {children}
        </div>
      </main>

      {/* Footer Legal Disclaimers */}
      <footer className="relative z-20 mx-auto w-full max-w-5xl py-4 text-center text-[10px] text-slate-500 font-mono border-t border-white/5 space-y-1">
        <div>
          TitleLock Explorer Demo Platform · Non-binding synthetic cadastral simulation
        </div>
        <div className="text-slate-600">
          No government verification or statutory legal ownership is established through this demonstration interface.
        </div>
      </footer>
    </div>
  );
}
