import React, { useState } from "react";
import { X, User, Shield, CheckCircle2, Key, Info, Building } from "lucide-react";

/**
 * Read-only account modal for the current live session.
 */
export function AccountModal({ users = [], onClose }) {
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);

  // Fallback demo users if none supplied
  const displayUsers = users.length > 0 ? users.slice(0, 4) : [
    {
      id: "USR-OWN-001",
      name: "Rajesh Kumar",
      roles: ["OWNER", "BUYER"],
      organization: "Private Landowner",
      designation: "Registered Title Holder",
      identity_status: "VERIFIED",
      account_status: "ACTIVE",
      wallet: "0xOWN001DEMO",
      permissions: ["VIEW_OWN_PROPERTIES", "VIEW_HISTORY", "INITIATE_TRANSFER"],
    },
    {
      id: "USR-REG-001",
      name: "Priya Sharma",
      roles: ["REGISTRAR"],
      organization: "Office of the Sub-Registrar, Noida-II",
      designation: "Sub-Registrar",
      identity_status: "VERIFIED",
      account_status: "ACTIVE",
      wallet: "0xREG001DEMO",
      permissions: ["VIEW_ALL", "REGISTER_PARCEL", "VERIFY_DOCUMENT", "COMMIT_TRANSFER"],
    }
  ];

  const currentUser = displayUsers[selectedUserIndex] || displayUsers[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl flex flex-col rounded-3xl border border-white/10 bg-navy-900/95 shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-navy-950/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">
                Demo Civic Credential Profile
              </h2>
              <p className="text-xs text-slate-400">
                Public Read-Only Simulated Identity View
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* User Selector Tabs */}
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/5">
            {displayUsers.map((u, idx) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedUserIndex(idx)}
                className={`flex-1 rounded-lg py-2 px-3 text-xs font-medium transition-all ${
                  idx === selectedUserIndex
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {u.name} ({u.roles?.[0] || "CITIZEN"})
              </button>
            ))}
          </div>

          {/* Profile Card */}
          <div className="rounded-2xl border border-white/10 bg-navy-950/80 p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300 font-display font-bold text-lg border border-cyan-500/30">
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base">
                    {currentUser.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {currentUser.designation || currentUser.roles?.join(" / ")}
                  </p>
                  <p className="text-[11px] text-cyan-400/80 font-mono">
                    {currentUser.organization}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3" />
                  {currentUser.identity_status}
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {currentUser.id}
                </span>
              </div>
            </div>

            {/* Wallet & Auth Details */}
            <div className="rounded-xl bg-white/5 p-3 text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Simulated Wallet Anchor:</span>
                <span className="text-cyan-300">{currentUser.wallet || "0xDEMO"}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Account Status:</span>
                <span className="text-emerald-400">{currentUser.account_status}</span>
              </div>
            </div>

            {/* Permissions */}
            {currentUser.permissions && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                  Simulated Authority Grants
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentUser.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-300 border border-white/5"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Demonstration Notice */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              This profile is simulated for interactive transparency. Public visitors cannot initiate real title transfers, sign cryptographic transactions, or modify records in this read-only viewer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
