import React from "react";
import { Copy, Check, Sparkles } from "lucide-react";

/**
 * Interactive helper component displaying deterministic demo credentials.
 * Evaluators can click to auto-populate credentials for rapid testing.
 */
export function DemoCredentials({ portal = "citizen", onSelectCredential }) {
  const [copiedKey, setCopiedKey] = React.useState(null);

  const citizenCredentials = [
    {
      label: "Rajesh Kumar (Owner)",
      identifier: "rajesh@demo.local",
      username: "rajesh",
      password: "Demo@001",
      note: "Full verified titleholder with clean parcel",
    },
    {
      label: "Anita Kumar (Joint Owner)",
      identifier: "anita@demo.local",
      username: "anita.kumar",
      password: "Demo@003",
      note: "Joint titleholder & nominee",
    },
    {
      label: "Meera Nair (Nominee)",
      identifier: "meera@demo.local",
      username: "meera",
      password: "Demo@001",
      note: "Registered succession nominee",
    },
    {
      label: "Rahul Bansal (Bank - Reject)",
      identifier: "rahul.bank@demo.local",
      username: "rahul.bank",
      password: "Demo@001",
      note: "Departmental bank role (must be rejected here)",
      isNegative: true,
    },
  ];

  const registrarCredentials = [
    {
      label: "Priya Sharma (Valid Sub-Registrar)",
      badge: "GOV-REG-0182",
      email: "priya.registrar@demo.local",
      password: "Demo@001",
      note: "Active & Verified Sub-Registrar",
    },
    {
      label: "Arvind Mehta (Auditor - Reject)",
      badge: "AUD-0094",
      email: "arvind.audit@demo.local",
      password: "Demo@001",
      note: "Auditor role (must be rejected as registrar)",
      isNegative: true,
    },
    {
      label: "Neha Verma (Restricted - Reject)",
      badge: "DEMO-MULTI-002",
      email: "neha@demo.local",
      password: "Demo@002",
      note: "Account status RESTRICTED (must be rejected)",
      isNegative: true,
    },
  ];

  const list = portal === "registrar" ? registrarCredentials : citizenCredentials;

  const handleCopy = (item, idx) => {
    setCopiedKey(idx);
    setTimeout(() => setCopiedKey(null), 2000);
    if (onSelectCredential) {
      onSelectCredential(item);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-navy-950/60 p-3.5 text-left text-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-cyan-300">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Demo Directory Test Fixtures</span>
        </div>
        <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
          Click to auto-fill
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {list.map((item, idx) => {
          const isCopied = copiedKey === idx;
          const isNegative = item.isNegative;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCopy(item, idx)}
              className={`flex items-start justify-between gap-2 rounded-xl p-2 text-left transition-all duration-150 border ${
                isNegative
                  ? "bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/40 text-slate-300"
                  : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-cyan-500/30 text-slate-200"
              }`}
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-[11px]">{item.label}</span>
                  {isNegative && (
                    <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-mono text-rose-300">
                      Rejection Test
                    </span>
                  )}
                </div>

                {portal === "citizen" ? (
                  <div className="font-mono text-[10px] text-slate-400 truncate">
                    ID: <span className="text-cyan-300">{item.identifier}</span> · Pwd:{" "}
                    <span className="text-cyan-300">{item.password}</span>
                  </div>
                ) : (
                  <div className="font-mono text-[10px] text-slate-400 truncate">
                    Badge: <span className="text-amber-300">{item.badge}</span> · Pwd:{" "}
                    <span className="text-cyan-300">{item.password}</span>
                  </div>
                )}
                <div className="text-[10px] text-slate-500">{item.note}</div>
              </div>

              <div className="shrink-0 pt-0.5">
                {isCopied ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                    <Check className="h-3 w-3" /> Filled
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono hover:text-cyan-300">
                    <Copy className="h-3 w-3" /> Use
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-1 text-[10px] text-slate-500 font-mono text-center">
        Demo credentials derived deterministically from fixture dataset.
      </div>
    </div>
  );
}
