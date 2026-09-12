import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLiveParcels, useLiveTransfers } from "../../services/liveData.js";
import { KpiCard } from "../../components/KpiCard.jsx";
import { StatusChip } from "../../components/StatusChip.jsx";
import { formatArea } from "../../lib/utils.js";
import {
  Building2,
  ShieldCheck,
  Bell,
  ArrowRight,
  ArrowRightLeft,
  KeyRound,
  FileText,
  AlertTriangle,
  UserCheck,
  ShoppingBag,
  ExternalLink,
  Clock,
  CheckCircle2
} from "lucide-react";

export function CitizenDashboard() {
  const { user, token, isDeceased } = useAuth();
  const { data: parcels, loading: parcelsLoading, error: parcelsError } = useLiveParcels(token);
  const { data: transferRequests, loading: transfersLoading, error: transfersError } = useLiveTransfers(token);

  // User roles list or default to OWNER
  const userRoles = Array.isArray(user?.roles) ? user.roles : ["OWNER"];
  const availableCitizenRoles = ["OWNER", "BUYER", "NOMINEE"].filter(r => userRoles.includes(r));
  const initialRole = availableCitizenRoles[0] || "OWNER";

  const [selectedRoleTab, setSelectedRoleTab] = useState(initialRole);

  const roleKpis = null;
  const rolePriorityItems = [];

  // User's owned parcels
  const userParcels = React.useMemo(() => {
    if (!user) return [];
    return parcels.filter((p) =>
      (p.owners || []).some(
        (o) => o.user_id === user.id || o.name?.toLowerCase() === user.name?.toLowerCase()
      )
    );
  }, [parcels, user]);

  // Active transfers involving user
  const activeTransfers = React.useMemo(() => {
    if (!user) return [];
    return transferRequests.filter(
      (tr) =>
        (tr.seller_user_ids || []).includes(user.id) ||
        tr.buyer_user_id === user.id ||
        (userParcels.some(p => p.ulpin === tr.ulpin))
    );
  }, [transferRequests, user, userParcels]);

  return (
    <div className="space-y-6 animate-fade-slide-up text-left">
      {(parcelsLoading || transfersLoading) && <div className="text-xs text-[#667085]">Loading live citizen records...</div>}
      {(parcelsError || transfersError) && <div className="text-xs text-[#B42318]">{parcelsError || transfersError}</div>}
      {/* Top Welcome Card */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="rounded-full bg-[#ECFDF3] border border-[#A6F4C5] px-2.5 py-0.5 text-[10px] font-bold text-[#027A48] uppercase tracking-wider">
              {isDeceased ? "DECEASED RECORD" : "Verified Citizen"}
            </span>
            <span className="text-xs text-[#667085] font-mono">ID: {user?.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#101828]">
            Welcome, {user?.name || "Citizen Landholder"}
          </h1>
          <p className="mt-1 text-xs text-[#475467]">
            TitleLock Cadastral Portal · Jurisdiction Gautam Buddha Nagar, Uttar Pradesh
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/citizen/my-properties"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA] transition-colors shadow-sm"
          >
            <Building2 className="h-4 w-4" />
            <span>My Properties ({userParcels.length})</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC] transition-colors"
          >
            <span>3D Map</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Role Switcher Tabs (OWNER / BUYER / NOMINEE) */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#EAECF0] pb-2 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">
            Active Role View:
          </span>
          <div className="flex flex-wrap rounded-lg bg-[#F2F4F7] p-1 border border-[#D0D5DD]">
            {["OWNER", "BUYER", "NOMINEE"].map((r) => {
              const hasRole = userRoles.includes(r);
              const isActive = selectedRoleTab === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRoleTab(r)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    isActive
                      ? "bg-[#0B3A67] text-white shadow-sm"
                      : "text-[#475467] hover:text-[#101828]"
                  }`}
                >
                  <span>{r}</span>
                  {hasRole && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Assigned Role" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <span className="text-[11px] text-[#667085] hidden sm:inline">
          Data source: <code className="font-mono bg-[#F2F4F7] px-1 py-0.5 rounded">dashboard_views.{selectedRoleTab}</code>
        </span>
      </div>

      {/* Role KPIs (Verbatim from fixture) */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {selectedRoleTab === "OWNER" && (
            <>
              <KpiCard
                title="Owned Parcels"
                value={roleKpis?.owned_parcels ?? userParcels.length}
                icon={Building2}
                trend="All registered in Record of Rights"
              />
              <KpiCard
                title="Pending Approvals"
                value={roleKpis?.pending_approvals ?? activeTransfers.filter((t) => t.status !== "COMMITTED").length}
                icon={ArrowRightLeft}
                trend="Requires seller quorum"
              />
              <KpiCard
                title="Deed Notifications"
                value={roleKpis?.notifications ?? "Unavailable"}
                icon={Bell}
                trend="Unread statutory alerts"
              />
              <KpiCard
                title="Avg Title Health"
                value={roleKpis?.title_health_avg ?? "Unavailable"}
                unit="/ 100"
                icon={ShieldCheck}
                trend="Cadastral Standing"
              />
            </>
          )}

          {selectedRoleTab === "NOMINEE" && (
            <>
              <KpiCard
                title="Associated Parcels"
                value={roleKpis?.associated_properties ?? userParcels.length}
                icon={Building2}
                trend="Dormant rights active"
              />
              <KpiCard
                title="Transfer Alerts"
                value={roleKpis?.transfer_alerts ?? "Unavailable"}
                icon={Bell}
                trend="Statutory nominee notice"
              />
              <KpiCard
                title="Succession Cases"
                value={roleKpis?.succession_cases ?? "Unavailable"}
                icon={FileText}
                trend="Case SUC-2026-001 active"
              />
              <KpiCard
                title="Successor Keys"
                value={roleKpis?.active_successor_keys ?? "Unavailable"}
                icon={KeyRound}
                trend="Rotation pending approval"
              />
            </>
          )}

          {selectedRoleTab === "BUYER" && (
            <>
              <KpiCard
                title="Saved Properties"
                value={roleKpis?.saved_properties ?? "Unavailable"}
                icon={Building2}
                trend="Cadastral watchlist"
              />
              <KpiCard
                title="Active Purchases"
                value={roleKpis?.active_purchases ?? activeTransfers.length}
                icon={ArrowRightLeft}
                trend="Petitions in progress"
              />
              <KpiCard
                title="Completed Purchases"
                value={roleKpis?.completed_purchases ?? activeTransfers.filter((t) => t.status === "COMMITTED").length}
                icon={CheckCircle2}
                trend="Deed certificate issued"
              />
              <KpiCard
                title="Pending Acceptance"
                value={roleKpis?.pending_acceptance ?? activeTransfers.filter((t) => t.status === "PENDING_BUYER_ACCEPTANCE").length}
                icon={UserCheck}
                trend="Ready for counter-signing"
              />
            </>
          )}
        </div>
      </div>

      {/* Priority Action Items (Verbatim from fixture) */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#B54708]" />
            <h2 className="text-sm font-bold text-[#101828]">
              Priority Action Items ({selectedRoleTab})
            </h2>
          </div>
          <span className="text-xs text-[#667085]">
            {rolePriorityItems.length} items requiring attention
          </span>
        </div>

        <div className="divide-y divide-[#F2F4F7]">
          {rolePriorityItems.map((itemId) => {
            const isTransfer = itemId.startsWith("TR-");
            const isSuccession = itemId.startsWith("SUC-");
            const transfer = transferRequests.find(t => t.request_id === itemId);

            return (
              <div
                key={itemId}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0B3A67] bg-[#EBF3FC] px-2 py-0.5 rounded border border-[#B9D5F4]">
                      {itemId}
                    </span>
                    {transfer && (
                      <span className="text-xs font-medium text-[#344054]">
                        Parcel: <span className="font-mono font-semibold">{transfer.ulpin}</span>
                      </span>
                    )}
                    {transfer?.status && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#FEF6EE] text-[#B54708] border border-[#F9DBAF]">
                        {transfer.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#475467]">
                    {isTransfer && `Transfer petition for ₹${transfer?.agreed_price_inr?.toLocaleString("en-IN") || "N/A"}.`}
                    {isSuccession && "Statutory legal heir mutation & key rotation proceeding."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isTransfer && (
                    <Link
                      to={`/citizen/transfers/${itemId}`}
                      className="inline-flex items-center gap-1 rounded-md bg-[#0B3A67] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1769AA] transition-colors"
                    >
                      <span>Review Petition</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                  {isSuccession && (
                    <Link
                      to="/citizen/succession"
                      className="inline-flex items-center gap-1 rounded-md bg-[#0B3A67] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1769AA] transition-colors"
                    >
                      <span>Succession Desk</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Owned Cadastral Parcels Preview */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#101828]">
              My Registered Cadastral Parcels
            </h2>
            <p className="text-xs text-[#667085]">
              Parcels where you are recorded as legal titleholder.
            </p>
          </div>
          <Link
            to="/citizen/my-properties"
            className="text-xs font-semibold text-[#0B3A67] hover:underline"
          >
            Manage All ({userParcels.length}) →
          </Link>
        </div>

        {userParcels.length > 0 ? (
          <div className="divide-y divide-[#F2F4F7]">
            {userParcels.map((parcel) => (
              <div
                key={parcel.ulpin}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0B3A67]">
                      {parcel.ulpin}
                    </span>
                    <StatusChip status={parcel.title_status} isPublic={false} size="xs" />
                  </div>
                  <div className="mt-1 text-xs text-[#475467]">
                    <span>{parcel.locality}</span> · <span>Survey: {parcel.survey_number}</span> · <span>{formatArea(parcel.area_sqm)}</span> · <span className="font-semibold text-emerald-700">Health: {parcel.title_health_score}/100</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/citizen/properties/${parcel.ulpin}`}
                    className="inline-flex items-center gap-1 rounded-md border border-[#D0D5DD] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC]"
                  >
                    <span>Inspect Record</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                  <Link
                    to="/citizen/my-properties"
                    className="inline-flex items-center gap-1 rounded-md bg-[#0B3A67] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1769AA]"
                  >
                    <KeyRound className="h-3 w-3" />
                    <span>Generate Sell Key</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-[#667085] bg-[#F8FAFC] rounded-lg">
            No registered parcels recorded for active identity. Use Search or explore Nominee / Buyer views.
          </div>
        )}
      </div>
    </div>
  );
}

export default CitizenDashboard;
