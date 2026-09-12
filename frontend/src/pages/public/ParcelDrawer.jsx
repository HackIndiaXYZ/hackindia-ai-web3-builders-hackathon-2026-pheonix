import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { sanitizePublicParcel } from "../../lib/publicFields.js";
import { formatArea } from "../../lib/utils.js";
import { StatusChip } from "../../components/StatusChip.jsx";
import { DataRow } from "../../components/DataRow.jsx";
import { X, MapPin, ArrowRight, Lock, ShieldCheck } from "lucide-react";

/**
 * Public Parcel Detail Drawer (Right Side, Clean White Government Portal Style)
 * Strictly displays the 13 allowlisted cadastral fields.
 * Followed by mandatory sign-in prompt.
 * Escape key listener closes drawer without moving map camera.
 */
export function ParcelDrawer({ rawParcel, onClose }) {
  // Listen for Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!rawParcel) return null;

  // Filter parcel through strict public allowlist
  const parcel = sanitizePublicParcel(rawParcel);

  return (
    <aside
      className="parcel-drawer w-full sm:w-[440px] max-w-full sm:max-w-lg flex flex-col rounded-t-2xl sm:rounded-lg border border-[#D0D5DD] bg-white shadow-2xl animate-fade-slide-up text-left overflow-hidden select-none"
      aria-label="Cadastral Record Details"
    >
      {/* Mobile Bottom Sheet Pull Bar */}
      <div className="sm:hidden flex justify-center py-2 bg-[#F8FAFC]">
        <div className="h-1.5 w-12 rounded-full bg-[#D0D5DD]" />
      </div>

      {/* 3px National Tricolour Accent Line */}
      <div className="flex h-[3px] w-full shrink-0">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-[#FFFFFF]" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#D0D5DD] px-4 py-3 bg-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#0B3A67]">
            {parcel.ulpin}
          </span>
          <StatusChip status={parcel.title_status} isPublic={true} size="xs" />
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-[#667085] hover:bg-[#EAECF0] hover:text-[#101828] transition-colors focus:outline-none"
          title="Close details (Escape)"
          aria-label="Close drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main Body (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Locality Subheading */}
        <div>
          <h2 className="text-sm font-bold text-[#101828]">
            Cadastral Record Summary
          </h2>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#475467]">
            <MapPin className="h-3.5 w-3.5 text-[#667085] shrink-0" />
            <span>{parcel.locality}</span>
            <span>·</span>
            <span>{parcel.district}, {parcel.state}</span>
          </div>
        </div>

        {/* 1. Identifiers Allowlist: ULPIN, survey_number, title_number, registration_office */}
        <div className="rounded-lg border border-[#D0D5DD] bg-[#F7F9FC] p-3 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085] mb-2">
            Record Identifiers
          </div>
          <DataRow label="ULPIN" value={parcel.ulpin} mono={true} />
          <DataRow label="Survey Number" value={parcel.survey_number} mono={true} />
          <DataRow label="Title Deed Number" value={parcel.title_number} mono={true} />
          <DataRow label="Registration Office" value={parcel.registration_office} />
        </div>

        {/* 2. Characteristics Allowlist: area_sqm, land_use, title_status, ownership_type */}
        <div className="rounded-lg border border-[#D0D5DD] bg-[#F7F9FC] p-3 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085] mb-2">
            Cadastral Attributes
          </div>
          <DataRow label="Registered Area" value={formatArea(parcel.area_sqm)} mono={true} />
          <DataRow label="Land Classification" value={parcel.land_use} />
          <DataRow label="Tenure Type" value={parcel.ownership_type} />
          <DataRow
            label="Title Status"
            value={<StatusChip status={parcel.title_status} isPublic={true} size="xs" />}
          />
        </div>

        {/* 3. Ownership Allowlist: owners[].name and owners[].share_percent ONLY */}
        <div className="rounded-lg border border-[#D0D5DD] bg-[#F7F9FC] p-3 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
            Registered Titleholders
          </div>
          <div className="divide-y divide-[#E4E7EC]">
            {parcel.owners.map((owner, idx) => (
              <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#101828]">{owner.name}</span>
                <span className="font-mono text-[#344054] font-medium">
                  {owner.share_percent}% Share
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mandatory Prompt After Allowlisted Fields */}
        <div className="rounded-lg border border-[#D0D5DD] bg-[#F8FAFC] p-3.5 text-xs text-[#344054] space-y-2.5">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 shrink-0 text-[#0B3A67] mt-0.5" />
            <p className="leading-relaxed font-medium">
              Sign in to view transfer status, title history, risk information, encumbrances, notifications, and owner actions.
            </p>
          </div>
          <Link
            to="/auth/citizen"
            className="flex items-center justify-center gap-1.5 rounded-md bg-[#0B3A67] px-3.5 py-2 font-semibold text-white hover:bg-[#1769AA] hover-lift transition-colors shadow-sm"
          >
            <span>Sign in as Titleholder</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Footer Disclosure */}
      <div className="border-t border-[#D0D5DD] bg-[#F8FAFC] p-3 text-left">
        <p className="text-[10px] text-[#667085] leading-relaxed italic">
          "Public view shows limited record information. Data is synthetic and for demonstration only. Signed-in owners and officials see the full record."
        </p>
      </div>
    </aside>
  );
}
