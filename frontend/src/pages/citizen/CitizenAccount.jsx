import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { User, ShieldCheck, Wallet, Lock, Info, CheckCircle2, ShieldAlert } from "lucide-react";

export function CitizenAccount() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">
          Citizen Identity & Account
        </h1>
        <p className="text-xs text-slate-400">
          Cadastral identity credentials, cryptographic keys, and statutory consent profile.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="rounded-3xl border border-white/10 bg-navy-900/80 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 font-display font-bold text-xl border border-cyan-500/40">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">
                {user?.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-cyan-400">{user?.id}</span>
                <span>·</span>
                <span>{user?.designation || "Titleholder"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Identity: {user?.identity_status || "VERIFIED"}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 font-mono text-xs font-semibold text-cyan-300">
              <span>Account: {user?.account_status || "ACTIVE"}</span>
            </span>
          </div>
        </div>

        {/* Identity Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-2xl border border-white/5 bg-navy-950/60 p-4 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400">Registered Email</span>
            <div className="font-mono font-medium text-white">{user?.email || "—"}</div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-navy-950/60 p-4 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400">Authentication Method</span>
            <div className="font-mono font-medium text-cyan-300">{user?.authMethod || "PASSWORD"}</div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-navy-950/60 p-4 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400">Cadastral Role Scope</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {(user?.roles || []).map((r) => (
                <span key={r} className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-200">
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-navy-950/60 p-4 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400">Simulated Public Key / Wallet</span>
            <div className="font-mono font-medium text-cyan-300 truncate">
              {user?.wallet || "0xOWN001DEMO"}
            </div>
          </div>
        </div>

        {/* Permissions */}
        {user?.permissions && user.permissions.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">
              Statutory Operations Granted
            </div>
            <div className="flex flex-wrap gap-2">
              {user.permissions.map((perm) => (
                <span
                  key={perm}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-slate-300"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DPDP Act & Privacy Notice Card */}
      <div className="rounded-3xl border border-white/10 bg-navy-900/60 p-6 space-y-3 text-xs">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
          <ShieldAlert className="h-4 w-4" />
          <span>Digital Personal Data Protection (DPDP) Act Compliance Notice</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          This application operates purely as a frontend synthetic simulation for educational and demonstration purposes. No real citizen data, Aadhaar details, biometric credentials, or government records are accessed or stored.
        </p>
        <p className="text-slate-500 leading-relaxed text-[10px]">
          In an actual implementation, integration with state cadastral services and DigiLocker requires lawful purpose authorization, explicit consent management, cryptographic privacy-preserving identity matching, and data minimization controls pursuant to applicable statutory standards.
        </p>
      </div>
    </div>
  );
}
