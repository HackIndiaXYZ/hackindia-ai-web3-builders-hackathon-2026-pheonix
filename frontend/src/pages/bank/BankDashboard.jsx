import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { parcelService, workspaceService } from "../../services/liveData.js";
import { useAuth } from "../../context/AuthContext.jsx";
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
  const { token } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [priorityItems, setPriorityItems] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([parcelService.list(token), workspaceService.bankReport("UP-0001-CLEAN", token)])
      .then(([items, report]) => {
        setParcels(items || []);
        setPriorityItems((items || []).filter((item) => item.frozen || item.encumbrances?.length).map((item) => item.ulpin));
      })
      .catch((err) => setError(err.message));
  }, [token]);
  const kpis = { title_checks: parcels.length, mortgages_active: parcels.filter((p) => p.encumbrances?.length).length, reports_ready: parcels.length, blocked_finance_cases: parcels.filter((p) => p.frozen).length };

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
      {error && <div className="text-xs text-[#B42318]">{error}</div>}

      {/* Verbatim Bank KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
            const isEncumbered = Boolean(p?.encumbrances?.length);
            const isFrozen = Boolean(p?.frozen);

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
                    {isEncumbered && "Active encumbrance is recorded in the parcel report."}
                    {isFrozen && "Parcel is frozen; financing actions require registrar clearance."}
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
