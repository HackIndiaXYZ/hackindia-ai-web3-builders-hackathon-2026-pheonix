import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLiveParcels } from "../../services/liveData.js";
import { StatusChip } from "../../components/StatusChip.jsx";
import { formatArea } from "../../lib/utils.js";
import {
  Users,
  ShieldAlert,
  Info,
  Building2,
  ArrowRight,
  Clock,
  KeyRound,
  FileCheck2
} from "lucide-react";

export function AssociatedProperties() {
  const { user, token } = useAuth();
  const { data: parcels, loading, error } = useLiveParcels(token);

  // Filter parcels where user is registered as a nominee
  const associatedParcels = React.useMemo(() => {
    return parcels.filter((p) =>
      (p.nominees || []).some(
        (n) => n.user_id === user?.id || n.name?.toLowerCase() === user?.name?.toLowerCase() || user?.roles?.includes("NOMINEE")
      )
    );
  }, [parcels, user]);

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      {/* Header */}
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">
          Associated Properties & Statutory Nominee Rights
        </h1>
        <p className="mt-1 text-xs text-[#475467]">
          Properties where your identity is endorsed on the Record of Rights as a designated nominee under Indian Succession Act.
        </p>
      </div>

      {loading && <div className="text-xs text-[#667085]">Loading live associated properties...</div>}
      {error && <div className="text-xs text-[#B42318]">{error}</div>}

      {/* SCN-03: Mandatory Dormant Notice Banner */}
      <div className="rounded-xl border border-[#BAE6FD] bg-[#F0F9FF] p-5 text-xs text-[#026AA2] space-y-2">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 text-[#0284C7] mt-0.5" />
          <div>
            <span className="font-bold text-sm text-[#0C4A6E]">
              STATUTORY NOMINEE NOTICE (SCN-03): DORMANT RIGHTS
            </span>
            <p className="mt-1 text-[#082F49] leading-relaxed">
              Nominee endorsement does not grant immediate title ownership while the primary titleholder is living.
              Your status is <strong>DORMANT</strong>. You receive immutable statutory alerts upon any conveyance or encumbrance filings,
              but you cannot generate Sell Keys or execute transfers until legal heir succession proceedings are initiated.
            </p>
          </div>
        </div>
      </div>

      {/* Parcels List */}
      <div className="space-y-4">
        {!loading && !error && associatedParcels.length === 0 && <div className="text-xs text-[#667085]">No associated properties are available for this identity.</div>}
        {associatedParcels.map((parcel) => {
          const nomineeRecord = (parcel.nominees || []).find(
            (n) => n.user_id === user?.id || n.name?.toLowerCase() === user?.name?.toLowerCase()
          ) || parcel.nominees?.[0];

          return (
            <div
              key={parcel.ulpin}
              className="rounded-xl border border-[#D0D5DD] bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-[#0B3A67]">
                      {parcel.ulpin}
                    </span>
                    <StatusChip status={parcel.title_status} isPublic={false} size="sm" />
                    <span className="rounded-full bg-[#ECFDF3] border border-[#A6F4C5] text-[#027A48] px-2.5 py-0.5 text-[10px] font-bold">
                      Nominee Endorsed
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#475467]">
                    {parcel.locality}, {parcel.district} · Survey No: {parcel.survey_number} · Area: {formatArea(parcel.area_sqm)}
                  </p>
                </div>

                <Link
                  to={`/citizen/properties/${parcel.ulpin}`}
                  className="inline-flex items-center gap-1 rounded-md border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC]"
                >
                  <span>Cadastral Record</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Nominee Specific Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F8FAFC] p-4 rounded-lg border border-[#EAECF0] text-xs">
                <div>
                  <span className="text-[#667085] block">Designated Nominee:</span>
                  <span className="font-bold text-[#101828]">{nomineeRecord?.name || user?.name || "Meera Nair"}</span>
                  <span className="text-[11px] text-[#667085] block">Relation: {nomineeRecord?.relation || "Daughter"}</span>
                </div>
                <div>
                  <span className="text-[#667085] block">Endorsed Share:</span>
                  <span className="font-mono font-bold text-[#0B3A67] text-sm">
                    {nomineeRecord?.share_percent || 100}%
                  </span>
                </div>
                <div>
                  <span className="text-[#667085] block">Status:</span>
                  <span className="font-bold text-[#B54708] inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Dormant (Owner Active)</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[#667085]">
                  Primary Owner: <span className="font-semibold text-[#101828]">{parcel.owners?.[0]?.name}</span>
                </span>
                <button
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#F2F4F7] px-3 py-1.5 text-xs font-semibold text-[#98A2B3] cursor-not-allowed border border-[#D0D5DD]"
                  title="Sell Keys cannot be issued by dormant nominees"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Issue Sell Key (Blocked)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AssociatedProperties;
