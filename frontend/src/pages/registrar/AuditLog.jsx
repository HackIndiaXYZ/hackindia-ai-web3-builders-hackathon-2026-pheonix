import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLiveAudit } from "../../services/liveData.js";
import { formatDate } from "../../lib/utils.js";
import { History, Search, ShieldCheck, Filter } from "lucide-react";

export function AuditLog() {
  const { token } = useAuth();
  const { data: events, loading, error } = useLiveAudit(token);
  const [query, setQuery] = useState("");

  const filtered = events.filter(
    (e) =>
      !query ||
      e.action?.toLowerCase().includes(query.toLowerCase()) ||
      e.ulpin?.toLowerCase().includes(query.toLowerCase()) ||
      e.actor_id?.toLowerCase().includes(query.toLowerCase()) ||
      (typeof e.details === "string" ? e.details : JSON.stringify(e.details || {})).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            Immutable Sub-Registrar Audit Ledger
          </h1>
          <p className="mt-1 text-xs text-[#475467]">
            Permanent statutory audit trail of all conveyance determinations, credential rotations, and judicial freezes.
          </p>
        </div>
        <span className="font-mono text-xs text-[#667085]">
          {filtered.length} Recorded Events
        </span>
      </div>

      {loading && <div className="text-xs text-[#667085]">Loading live audit events...</div>}
      {error && <div className="text-xs text-[#B42318]">{error}</div>}

      {/* Search Filter */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-3 shadow-sm flex items-center gap-2">
        <Search className="h-4 w-4 text-[#667085]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter audit events by action, ULPIN, employee badge, or details..."
          className="w-full text-xs text-[#101828] focus:outline-none bg-transparent"
        />
      </div>

      {/* Events Table */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] text-[#667085] uppercase border-b border-[#EAECF0] text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Cadastral Target</th>
                <th className="py-3 px-4">Officer / Actor</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              {!loading && !error && filtered.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-xs text-[#667085]">No audit events are available.</td></tr>}
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#0B3A67]">
                    {e.id}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#101828]">
                    {e.action}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#0B3A67]">
                    {e.ulpin || "—"}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#475467]">
                    {e.actor_id}
                  </td>
                  <td className="py-3 px-4 text-[#475467] max-w-xs truncate">
                    {typeof e.details === "string" ? e.details : Object.keys(e.details || {}).length > 0 ? JSON.stringify(e.details) : "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[11px] text-[#667085]">
                    {formatDate(e.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AuditLog;
