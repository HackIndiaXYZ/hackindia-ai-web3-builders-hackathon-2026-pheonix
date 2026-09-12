import React from "react";
import { Link } from "react-router-dom";
import mockData from "../../data/land-registry-ui-mock-data.json" with { type: "json" };
import { KpiCard } from "../../components/KpiCard.jsx";
import { formatCurrencyINR } from "../../lib/utils.js";
import {
  Landmark,
  Search,
  CheckCircle2,
  Ban,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
  Building2
} from "lucide-react";

export function BankDashboard() {
  const kpis = mockData.dashboard_views?.BANK?.kpis || {
    title_checks: 18,
    mortgages_active: 7,
    reports_ready: 4,
    blocked_finance_cases: 2,
  };

  const priorityItems = mockData.dashboard_views?.BANK?.priority_items || [
    "UP-NOI-0005-ENCUMBERED",
    "UP-NOI-0009-DISPUTED",
  ];

  const parcels = mockData.parcels || [];

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            Institutional Banking & Mortgage Clearance Desk
          </h1>
          <p className="text-xs text-[#475467]">
            State Bank Mortgage Underwriting · Cadastral Collateral Due Diligence & CERSAI Integration
          </p>
        </div>
        <Link
          to="/bank/title-checks"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#027A48] px-4 py-2 text-xs font-semibold text-white hover:bg-[#054F31] shadow-sm self-start sm:self-auto"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Title Verification Desk</span>
        </Link>
      </div>

      {/* Verbatim Bank KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Title Searches Done"
          value={kpis.title_checks}
          icon={Search}
          trend="Clearance verifications"
        />
        <KpiCard
          title="Active Mortgages"
          value={kpis.mortgages_active}
          icon={Landmark}
          trend="CERSAI Registered"
        />
        <KpiCard
          title="Reports Issued"
          value={kpis.reports_ready}
          icon={FileSpreadsheet}
          trend="Lien clear dossiers"
        />
        <KpiCard
          title="Blocked Collateral"
          value={kpis.blocked_finance_cases}
          icon={Ban}
          trend="Judicial restraint / dispute"
        />
      </div>

      {/* Priority Collateral Cases (Exact Order) */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-[#027A48]" />
            <h2 className="text-sm font-bold text-[#101828]">
              Priority Collateral Inquiries (Exact Queue)
            </h2>
          </div>
          <Link to="/bank/title-checks" className="text-xs font-semibold text-[#027A48] hover:underline">
            Search All Parcels →
          </Link>
        </div>

        <div className="divide-y divide-[#EAECF0]">
          {priorityItems.map((ulpin) => {
            const p = parcels.find((item) => item.ulpin === ulpin);
            const isEncumbered = ulpin === "UP-NOI-0005-ENCUMBERED";
            const isFrozen = ulpin === "UP-NOI-0009-DISPUTED";

            return (
              <div
                key={ulpin}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#0B3A67] bg-[#EFF8FF] px-2 py-0.5 rounded border border-[#B9D5F4]">
                      {ulpin}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isFrozen ? "bg-[#FEF3F2] text-[#B42318]" : "bg-[#FEF6EE] text-[#B54708]"
                      }`}
                    >
                      {isFrozen ? "FINANCING BLOCKED" : "ACTIVE CHARGE"}
                    </span>
                  </div>
                  <p className="mt-1 text-[#475467]">
                    {isEncumbered && "SCN-06: Active Mortgage with State Bank of India (₹45,00,000). Title health 88/100."}
                    {isFrozen && "SCN-10: Judicial Injunction Active. Financing and equitable mortgage registration prohibited."}
                  </p>
                </div>

                <Link
                  to={isEncumbered ? "/bank/mortgages" : "/bank/blocked-cases"}
                  className="rounded-lg bg-[#027A48] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#054F31]"
                >
                  Verify Collateral →
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BankDashboard;
