import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { auditService, normalizeAuditEvent } from "../../services/liveData.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatDate } from "../../lib/utils.js";
import { FileSpreadsheet, Search, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";

export function AuditorEvents() {
  const { eventId: paramEventId } = useParams();
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    auditService.list(token)
      .then((items) => setEvents((items || []).map(normalizeAuditEvent)))
      .catch((err) => setError(err.message));
  }, [token]);

  const selectedEvent = paramEventId ? events.find((e) => e.id === paramEventId) : null;

  const filtered = events.filter(
    (e) =>
      !query ||
      e.action?.toLowerCase().includes(query.toLowerCase()) ||
      e.id?.toLowerCase().includes(query.toLowerCase()) ||
      e.ulpin?.toLowerCase().includes(query.toLowerCase()) ||
      e.details?.toLowerCase().includes(query.toLowerCase())
  );

  if (selectedEvent) {
    return (
      <div className="space-y-6 text-left animate-fade-slide-up">
        <div className="border-b border-[#EAECF0] pb-4 flex items-center justify-between">
          <Link to="/auditor/events" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E7090] hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Cryptographic Ledger</span>
          </Link>
          <span className="font-mono text-xs text-[#667085]">Audit Record: {selectedEvent.id}</span>
        </div>

        <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAECF0] pb-4">
            <div>
              <h1 className="font-mono text-xl font-bold text-[#0E7090]">{selectedEvent.id}</h1>
              <p className="text-xs text-[#101828] font-semibold mt-1">{selectedEvent.action}</p>
            </div>
            <span className="text-xs font-mono text-[#027A48] bg-[#ECFDF3] border border-[#A6F4C5] px-2.5 py-1 rounded font-bold">
              CRYPTOGRAPHIC HASH VERIFIED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#F8FAFC] p-4 rounded-xl border border-[#EAECF0]">
            <div>
              <span className="text-[#667085] block">Cadastral Target:</span>
              <span className="font-mono font-bold text-[#101828]">{selectedEvent.ulpin || "SYSTEM"}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Responsible Actor / Officer:</span>
              <span className="font-mono font-bold text-[#101828]">{selectedEvent.actor_id}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Timestamp:</span>
              <span className="font-mono text-[#475467]">{formatDate(selectedEvent.timestamp)}</span>
            </div>
          </div>

          <div className="text-xs space-y-1">
            <span className="font-bold text-[#344054] block">Event Description & Parameters:</span>
            <p className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] text-[#101828] leading-relaxed font-mono">
              {selectedEvent.details}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      {error && <div className="text-xs text-[#B42318]">{error}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Cryptographic Audit Ledger</h1>
          <p className="text-xs text-[#475467]">
            Full immutable ledger of cadastral modifications, conveyance seals, and registrar overrides.
          </p>
        </div>
        <span className="font-mono text-xs text-[#667085]">{filtered.length} Events</span>
      </div>

      <div className="rounded-xl border border-[#D0D5DD] bg-white p-3 shadow-sm flex items-center gap-2">
        <Search className="h-4 w-4 text-[#667085]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Audit ID, action name, ULPIN, or officer..."
          className="w-full text-xs text-[#101828] focus:outline-none bg-transparent"
        />
      </div>

      <div className="rounded-xl border border-[#D0D5DD] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] text-[#667085] uppercase border-b border-[#EAECF0] text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">ULPIN</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4 font-mono font-bold text-[#0E7090]">{e.id}</td>
                  <td className="py-3 px-4 font-semibold text-[#101828]">{e.action}</td>
                  <td className="py-3 px-4 font-mono text-[#0B3A67]">{e.ulpin || "—"}</td>
                  <td className="py-3 px-4 font-mono text-[#475467]">{e.actor_id}</td>
                  <td className="py-3 px-4 text-[#475467] max-w-xs truncate">{e.details}</td>
                  <td className="py-3 px-4 text-right">
                    <Link to={`/auditor/events/${e.id}`} className="font-semibold text-[#0E7090] hover:underline">
                      Verify →
                    </Link>
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

export default AuditorEvents;
