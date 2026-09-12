import React from "react";
import { Link } from "react-router-dom";
import mockData from "../../data/land-registry-ui-mock-data.json" with { type: "json" };
import { KpiCard } from "../../components/KpiCard.jsx";
import { StatusChip } from "../../components/StatusChip.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatArea, formatCurrencyINR, formatDate } from "../../lib/utils.js";
import { getDemoTransfers } from "../../lib/store.js";
import {
  ShieldAlert,
  ArrowRightLeft,
  Building2,
  Lock,
  ArrowRight,
  FileCheck2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Map
} from "lucide-react";

export function RegistrarDashboard() {
  const { user } = useAuth();
  const kpis = mockData.dashboard_views?.REGISTRAR?.kpis || {
    parcels: 12,
    pending_transfers: 6,
    high_risk: 2,
    succession_cases: 1,
    frozen_parcels: 1,
  };

  const transfers = getDemoTransfers();

  // Priority items verbatim: ["TR-2026-003", "TR-2026-002", "SUC-2026-001", "TR-2026-004"]
  const priorityQueueIds = mockData.dashboard_views?.REGISTRAR?.priority_items || [
    "TR-2026-003",
    "TR-2026-002",
    "SUC-2026-001",
    "TR-2026-004",
  ];

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            Sub-Registrar Adjudication Console
          </h1>
          <p className="text-xs text-[#475467]">
            District Registry Office Gautam Buddha Nagar · Official Cadastral & Conveyance Authority
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/registrar/transfers"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA] shadow-sm"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Open Adjudication Queue</span>
          </Link>
        </div>
      </div>

      {/* Verbatim Registrar KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          title="Cadastral Parcels"
          value={kpis.parcels}
          icon={Building2}
          trend="Total RoR Directory"
        />
        <KpiCard
          title="Pending Transfers"
          value={kpis.pending_transfers}
          icon={ArrowRightLeft}
          trend="Awaiting adjudication"
        />
        <KpiCard
          title="High Risk Flagged"
          value={kpis.high_risk}
          icon={ShieldAlert}
          trend="Requires manual override"
        />
        <KpiCard
          title="Succession Cases"
          value={kpis.succession_cases}
          icon={FileCheck2}
          trend="Legal heir proceedings"
        />
        <KpiCard
          title="Frozen Parcels"
          value={kpis.frozen_parcels}
          icon={Lock}
          trend="Court injunction orders"
        />
      </div>

      {/* Priority Adjudication Queue (Exact Order) */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#B54708]" />
            <h2 className="text-sm font-bold text-[#101828]">
              Priority Adjudication Queue (Exact Priority Order)
            </h2>
          </div>
          <Link
            to="/registrar/transfers"
            className="text-xs font-semibold text-[#0B3A67] hover:underline"
          >
            Full Queue ({transfers.length}) →
          </Link>
        </div>

        <div className="divide-y divide-[#EAECF0]">
          {priorityQueueIds.map((itemId, idx) => {
            const isSuccession = itemId.startsWith("SUC-");
            const tr = transfers.find((t) => t.request_id === itemId);

            return (
              <div
                key={itemId}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[#EFF8FF] text-[#0B3A67] font-mono font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-mono font-bold text-sm text-[#0B3A67]">
                      {itemId}
                    </span>
                    {isSuccession ? (
                      <span className="px-2 py-0.5 rounded bg-[#EFF8FF] text-[#0B3A67] font-bold text-[10px]">
                        SUCCESSION CASE
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tr?.status === "HIGH_RISK_BLOCKED" || tr?.risk_score >= 50
                            ? "bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]"
                            : "bg-[#FEF6EE] text-[#B54708]"
                        }`}
                      >
                        {tr?.status || "PENDING"}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-[#475467]">
                    {isSuccession ? (
                      <span>Legal Heir Mutation Petition · Deceased: Mohan Nair (USR-DEAD-001) · Target: UP-GNO-0003-SUCCESSION</span>
                    ) : (
                      <span>
                        Parcel: <strong className="font-mono text-[#101828]">{tr?.ulpin}</strong> · Price: {formatCurrencyINR(tr?.agreed_price_inr)} · Risk Score: {tr?.risk_score || 0}/100
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSuccession ? (
                    <Link
                      to={`/registrar/succession/${itemId}`}
                      className="rounded-lg bg-[#0B3A67] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1769AA]"
                    >
                      Adjudicate Case →
                    </Link>
                  ) : (
                    <Link
                      to={`/registrar/transfers/${itemId}`}
                      className="rounded-lg bg-[#0B3A67] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1769AA]"
                    >
                      Adjudicate Petition →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact 3D Map CTA & Quick Audit Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-[#101828]">
            <Map className="h-4 w-4 text-[#0B3A67]" />
            <span>Jurisdictional 3D Cadastral Map</span>
          </div>
          <p className="text-xs text-[#475467] leading-relaxed">
            Directly inspect extruded 3D parcel polygons, survey coordinates, and SAT boundary overlap collisions across Noida & Greater Noida sectors.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-[#F8FAFC] px-4 py-2 text-xs font-semibold text-[#0B3A67] hover:bg-[#F2F4F7]"
          >
            <span>Launch Full 3D Map View</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-[#101828]">
            <FileSpreadsheet className="h-4 w-4 text-[#0B3A67]" />
            <span>Statutory Registrar Controls</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              to="/registrar/risk-review"
              className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] hover:bg-[#F2F4F7] font-semibold text-[#101828]"
            >
              Risk Reviews ({kpis.high_risk}) →
            </Link>
            <Link
              to="/registrar/frozen-parcels"
              className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] hover:bg-[#F2F4F7] font-semibold text-[#101828]"
            >
              Court Freezes ({kpis.frozen_parcels}) →
            </Link>
            <Link
              to="/registrar/overrides"
              className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] hover:bg-[#F2F4F7] font-semibold text-[#101828]"
            >
              Overrides Ledger →
            </Link>
            <Link
              to="/registrar/audit"
              className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0] hover:bg-[#F2F4F7] font-semibold text-[#101828]"
            >
              Audit Trail →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegistrarDashboard;
