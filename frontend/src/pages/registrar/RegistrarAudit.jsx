import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { auditService, normalizeAuditEvent } from "../../services/liveData.js";
import { FileCheck2, Scale, ShieldAlert, ArrowRight, UserCheck, Clock, CheckCircle } from "lucide-react";
import { formatDate } from "../../lib/utils.js";

export function RegistrarAudit() {
  const { user, token } = useAuth();
  const [auditEvents, setAuditEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    auditService.list(token)
      .then((events) => setAuditEvents((events || []).map(normalizeAuditEvent)))
      .catch((err) => setError(err.message));
  }, [token]);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Administrative Audit Log & Separation of Duties
          </h1>
          <p className="text-xs text-slate-400">
            Immutable log of statutory mutations, officer approvals, and legal freeze injunctions.
          </p>
        </div>

        <Link
          to="/registrar/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition-all"
        >
          <span>Return to Dashboard</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {error && <div className="text-xs text-rose-300">{error}</div>}

      {/* Role Constraints & Statutory Safeguards Card */}
      <div className="rounded-3xl border border-amber-500/30 bg-[#080e1e]/90 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Scale className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white font-display">
              Statutory Separation of Duties & Conflict-of-Interest Controls
            </h2>
          </div>
          <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-300 font-bold border border-amber-500/40">
            Enforced
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          State Land Records regulations mandate strict algorithmic separation of duties.
          An officer who initiates, delegates, or is party to a land transaction is legally prohibited
          from finalizing statutory mutation or certifying archival audits for that record.
        </p>

        {/* Role constraints list */}
        <div className="space-y-2 pt-1 border-t border-white/5">
          <div className="text-[11px] font-mono uppercase text-slate-400">
            Active Governance Constraints for Current Session:
          </div>

          {user?.role_constraints && user.role_constraints.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.role_constraints.map((constraint) => (
                <div
                  key={constraint}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 font-mono text-xs text-rose-300 flex items-center gap-1.5"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                  <span>{constraint}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Full primary registrar adjudication privileges active. No restrictive delegation blocks.</span>
            </div>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-3xl border border-white/10 bg-[#080e1e]/90 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-white uppercase tracking-wider">
            <Clock className="h-4 w-4 text-amber-400" />
            <span>Statutory Audit Trail ({auditEvents.length} Recorded Events)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Chronological Ledger
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-white/5 font-mono text-[11px] text-slate-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Associated ULPIN</th>
                <th className="py-3 px-4">Docket / Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {auditEvents.map((evt) => {
                const isRegistrarAction = evt.role === "REGISTRAR";
                const isSystemAction = evt.role === "SYSTEM";

                return (
                  <tr key={evt.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-amber-300">{evt.id}</td>
                    <td className="py-3 px-4 text-slate-300">{formatDate(evt.timestamp)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          evt.action === "PARCEL_FROZEN"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : evt.action?.includes("APPROVED")
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-white/10 text-slate-200"
                        }`}
                      >
                        {evt.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{evt.actor}</div>
                      <div className="text-[10px] text-slate-400">{evt.role}</div>
                    </td>
                    <td className="py-3 px-4 text-cyan-300 font-bold">{evt.ulpin || "—"}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {evt.case_id || evt.transfer_id || evt.assessment_id || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
