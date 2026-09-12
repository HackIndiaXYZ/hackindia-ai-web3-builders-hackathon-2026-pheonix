import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KpiCard } from "../../components/KpiCard.jsx";
import { auditService, transferService, normalizeAuditEvent, normalizeTransfer } from "../../services/liveData.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatDate } from "../../lib/utils.js";
import {
  FileSpreadsheet,
  ShieldAlert,
  Lock,
  Search,
  Boxes,
  ArrowRight,
  Shield,
  FileCheck,
  Clock
} from "lucide-react";

export function AuditorDashboard() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([auditService.list(token), transferService.list(token)])
      .then(([audit, items]) => { setEvents((audit || []).map(normalizeAuditEvent)); setTransfers((items || []).map(normalizeTransfer)); })
      .catch((err) => setError(err.message));
  }, [token]);
  const priorityItems = transfers.slice(0, 4).map((item) => item.request_id);
  const kpis = { audit_events: events.length, overrides: events.filter((item) => String(item.action).includes("OVERRIDE")).length, frozen_parcels: events.filter((item) => item.action === "PARCEL_FROZEN").length, open_reviews: transfers.filter((item) => !["COMPLETED", "REJECTED", "EXPIRED"].includes(item.status)).length };

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
    {error && <div className="text-xs text-[#B42318]">{error}</div>}
      {/* Header */}
      <div className="border-b border-[#EAECF0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            State Land Audit & Oversight Directorate
          </h1>
          <p className="text-xs text-[#475467]">
            Independent Comptroller Cadastral Verification · Dual-Ledger Cryptographic Audit
          </p>
        </div>
        <Link
          to="/auditor/events"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E7090] px-4 py-2 text-xs font-semibold text-white hover:bg-[#155E75] shadow-sm self-start sm:self-auto"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Cryptographic Ledger</span>
        </Link>
      </div>

      {/* Verbatim Auditor KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Audit Events Logged"
          value={kpis.audit_events}
          icon={FileSpreadsheet}
          trend="SHA-256 Chained"
        />
        <KpiCard
          title="Registrar Overrides"
          value={kpis.overrides}
          icon={ShieldAlert}
          trend="Scrutiny required"
        />
        <KpiCard
          title="Frozen Parcels"
          value={kpis.frozen_parcels}
          icon={Lock}
          trend="Judicial injunctions"
        />
        <KpiCard
          title="Open Audit Inquiries"
          value={kpis.open_reviews}
          icon={Clock}
          trend="Active reviews"
        />
      </div>

      {/* Priority Audit Cases */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#0E7090]" />
            <h2 className="text-sm font-bold text-[#101828]">
              Priority Audit Inquiries (Exact Queue)
            </h2>
          </div>
          <Link to="/auditor/transfers" className="text-xs font-semibold text-[#0E7090] hover:underline">
            All Transfer Petitions →
          </Link>
        </div>

        <div className="divide-y divide-[#EAECF0]">
          {priorityItems.map((reqId) => {
            const tr = transfers.find((t) => t.request_id === reqId);
            return (
              <div
                key={reqId}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#0E7090] bg-[#ECFEFF] px-2 py-0.5 rounded border border-[#BAE6FD]">
                      {reqId}
                    </span>
                    <span className="font-mono text-xs text-[#101828] font-semibold">
                      Target: {tr?.ulpin || "UP-NOI-0007-HIGH-RISK"}
                    </span>
                    <span className="text-[10px] font-bold text-[#B42318] bg-[#FEF3F2] px-2 py-0.5 rounded">
                      HIGH RISK INQUIRY
                    </span>
                  </div>
                  <p className="mt-1 text-[#475467]">
                    Scrutiny of statutory compliance, owner quorum consent, and risk override documentation.
                  </p>
                </div>

                <Link
                  to={`/auditor/transfers/${reqId}`}
                  className="rounded-lg bg-[#0E7090] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#155E75]"
                >
                  Audit Scrutiny →
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Cryptographic Events Preview */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
          <h2 className="text-sm font-bold text-[#101828]">
            Live Cryptographic Event Stream
          </h2>
          <Link to="/auditor/events" className="text-xs font-semibold text-[#0E7090] hover:underline">
            View All ({events.length}) →
          </Link>
        </div>

        <div className="divide-y divide-[#EAECF0]">
          {events.slice(0, 5).map((e) => (
            <div
              key={e.id}
              className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-mono font-bold text-[#0E7090] mr-2">{e.id}</span>
                <span className="font-semibold text-[#101828]">{e.action}</span>
                <span className="text-[#667085] ml-2">({e.ulpin || "CADASTRE"})</span>
              </div>
              <div className="text-right font-mono text-[11px] text-[#667085]">
                {formatDate(e.timestamp)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AuditorDashboard;
