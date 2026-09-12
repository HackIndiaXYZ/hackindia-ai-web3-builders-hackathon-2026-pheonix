import React from "react";
import {
  MapPin,
  Building2,
  FileCheck2,
  Users,
  UserCheck,
  ShieldCheck,
  Percent,
  Landmark,
  Layers,
  Scale,
  GitFork,
  Tag,
  Hash,
  Clock,
  HeartPulse,
} from "lucide-react";
import { formatArea, formatCurrencyINR, formatDate, truncateHash } from "../lib/utils.js";

/**
 * Parcel overview displaying identity, metrics, parties, and conditional sections
 * STRICT RULE: Only show fields that exist on the selected parcel!
 */
export function ParcelOverview({ parcel }) {
  if (!parcel) return null;

  const {
    survey_number,
    title_number,
    locality,
    district,
    state,
    registration_office,
    land_use,
    area_sqm,
    title_health_score,
    ownership_policy,
    owners = [],
    nominees = [],
    encumbrances = [],
    freeze,
    overlap_findings = [],
    child_parcels = [],
    map_tags = [],
  } = parcel;

  // Title Health Score color helper
  const getScoreColor = (score) => {
    if (score >= 85) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    if (score >= 65) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
    return "text-rose-400 border-rose-500/40 bg-rose-500/10";
  };

  return (
    <div className="space-y-5 text-slate-300">
      {/* 1. Cadastral Identity Card */}
      <div className="rounded-2xl border border-white/10 bg-navy-950/60 p-3.5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
          <FileCheck2 className="h-4 w-4 text-cyan-400" />
          <span>Cadastral Identity</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          {survey_number && (
            <div className="rounded-lg bg-white/5 p-2">
              <span className="text-[10px] text-slate-400 block font-mono">Survey Number</span>
              <span className="font-semibold text-white font-mono">{survey_number}</span>
            </div>
          )}
          {title_number && (
            <div className="rounded-lg bg-white/5 p-2">
              <span className="text-[10px] text-slate-400 block font-mono">Title Deed No</span>
              <span className="font-semibold text-white font-mono">{title_number}</span>
            </div>
          )}
          {land_use && (
            <div className="rounded-lg bg-white/5 p-2">
              <span className="text-[10px] text-slate-400 block font-mono">Permitted Land Use</span>
              <span className="font-medium text-cyan-300">{land_use}</span>
            </div>
          )}
          {locality && (
            <div className="rounded-lg bg-white/5 p-2">
              <span className="text-[10px] text-slate-400 block font-mono">Locality</span>
              <span className="font-medium text-slate-200 truncate block">{locality}</span>
            </div>
          )}
          {district && (
            <div className="rounded-lg bg-white/5 p-2">
              <span className="text-[10px] text-slate-400 block font-mono">District & State</span>
              <span className="font-medium text-slate-200">{district}, {state || "UP"}</span>
            </div>
          )}
          {registration_office && (
            <div className="rounded-lg bg-white/5 p-2">
              <span className="text-[10px] text-slate-400 block font-mono">Sub-Registrar Office</span>
              <span className="font-medium text-slate-200 truncate block">{registration_office}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Key Cadastral Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Area */}
        {area_sqm != null && (
          <div className="rounded-2xl border border-white/10 bg-navy-950/60 p-2.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Area</span>
            <span className="font-mono text-sm font-bold text-cyan-300">
              {formatArea(area_sqm)}
            </span>
          </div>
        )}

        {/* Title Health Score */}
        {title_health_score != null && (
          <div className="rounded-2xl border border-white/10 bg-navy-950/60 p-2.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Health Index</span>
            <div className="flex items-center justify-center gap-1">
              <span className={`font-mono text-sm font-bold ${getScoreColor(title_health_score).split(" ")[0]}`}>
                {title_health_score}
              </span>
              <span className="font-mono text-[10px] text-slate-500">/100</span>
            </div>
          </div>
        )}

        {/* Required Approvals */}
        {ownership_policy?.owner_approvals_required != null && (
          <div className="rounded-2xl border border-white/10 bg-navy-950/60 p-2.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Quorum</span>
            <span className="font-mono text-sm font-bold text-slate-200">
              {ownership_policy.owner_approvals_required} of {owners.length}
            </span>
          </div>
        )}
      </div>

      {/* 3. Registered Parties: Owners & Nominees */}
      <div className="rounded-2xl border border-white/10 bg-navy-950/60 p-3.5 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />
            <span>Title Holders & Nominees</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {owners.length} Owner{owners.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Owners List */}
        <div className="space-y-2">
          {owners.map((owner, idx) => (
            <div
              key={owner.user_id || idx}
              className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs border border-white/5"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 font-bold font-mono text-xs">
                  {owner.name?.charAt(0) || "O"}
                </div>
                <div>
                  <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                    <span>{owner.name}</span>
                    <span className="rounded bg-white/10 px-1 py-0.2 font-mono text-[9px] text-slate-400">
                      {owner.share_percent}%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    ID: {owner.user_id || "RECORDED"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono text-emerald-400">
                  {owner.credential_status || "ACTIVE"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Nominees List (if any) */}
        {nominees && nominees.length > 0 && (
          <div className="pt-2 border-t border-white/5 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Registered Succession Nominees ({nominees.length})
            </div>
            {nominees.map((nom, idx) => (
              <div
                key={nom.user_id || idx}
                className="flex items-center justify-between rounded-xl bg-blue-500/5 px-3 py-2 text-xs border border-blue-500/15"
              >
                <div>
                  <div className="font-semibold text-blue-200 flex items-center gap-1.5">
                    <span>{nom.name}</span>
                    <span className="rounded bg-blue-500/20 px-1.5 py-0.2 font-mono text-[9px] text-blue-300">
                      Priority #{nom.priority}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Activation: {nom.activation_condition}
                  </div>
                </div>

                <span className="rounded bg-slate-500/20 px-2 py-0.5 text-[9px] font-mono text-slate-300">
                  {nom.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. CONDITIONAL SECTIONS */}

      {/* Encumbrances (Mortgage / Liens) */}
      {encumbrances && encumbrances.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-amber-400" />
              <span>Registered Financial Encumbrance</span>
            </div>
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono text-amber-300">
              {encumbrances.length} Active
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {encumbrances.map((enc) => (
              <div
                key={enc.id || enc.hash}
                className="rounded-xl bg-navy-950/80 p-3 border border-amber-500/20 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">{enc.holder}</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {formatCurrencyINR(enc.amount_inr)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 border-t border-white/5 pt-1.5">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Type</span>
                    <span className="font-mono text-slate-200">{enc.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Registered Date</span>
                    <span className="font-mono text-slate-200">{formatDate(enc.registered_date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Document Ref</span>
                    <span className="font-mono text-slate-200">{enc.document_ref || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Ledger Hash</span>
                    <span className="font-mono text-cyan-400">{truncateHash(enc.hash)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Freeze Injunction Details */}
      {freeze && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-300 uppercase tracking-wider font-mono">
            <Scale className="h-4 w-4 text-rose-400" />
            <span>Judicial Injunction / Legal Freeze</span>
          </div>

          <div className="rounded-xl bg-navy-950/80 p-3 border border-rose-500/20 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Case Docket ID:</span>
              <span className="font-mono font-bold text-rose-300">{freeze.case_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Grounds / Reason:</span>
              <span className="font-medium text-slate-200">{freeze.reason?.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Restraining Inception:</span>
              <span className="font-mono text-slate-300">{formatDate(freeze.started_at)}</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-1.5">
              <span className="text-slate-400">Release Authority:</span>
              <span className="font-mono text-cyan-300 text-right">{freeze.release_authority}</span>
            </div>
          </div>
        </div>
      )}

      {/* Overlap Findings */}
      {overlap_findings && overlap_findings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono">
            <Layers className="h-4 w-4 text-amber-400" />
            <span>Spatial Boundary Conflicts</span>
          </div>

          <div className="space-y-2 text-xs">
            {overlap_findings.map((overlap, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-navy-950/80 p-3 border border-amber-500/20 space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs font-bold text-amber-300">
                    Conflict with {overlap.with_ulpin}
                  </span>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[9px] font-mono text-amber-400">
                    {overlap.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Overlapping Area</span>
                    <span className="font-mono font-bold text-slate-100">{formatArea(overlap.overlap_sqm)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Impact Ratio</span>
                    <span className="font-mono font-bold text-rose-400">{overlap.overlap_percent_of_parcel}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Child Parcels (Subdivisions) */}
      {child_parcels && child_parcels.length > 0 && (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-3.5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 uppercase tracking-wider font-mono">
            <GitFork className="h-4 w-4 text-cyan-400" />
            <span>Subdivided Child Parcels ({child_parcels.length})</span>
          </div>

          <div className="space-y-2 text-xs">
            {child_parcels.map((child) => (
              <div
                key={child.ulpin}
                className="flex items-center justify-between rounded-xl bg-navy-950/80 p-2.5 border border-white/5"
              >
                <div>
                  <div className="font-mono font-bold text-cyan-300">{child.ulpin}</div>
                  <div className="text-[11px] text-slate-400">Owner: {child.owner}</div>
                </div>
                <span className="font-mono font-semibold text-slate-200">
                  {formatArea(child.area_sqm)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Tags Chips */}
      {map_tags && map_tags.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-2">
            <Tag className="h-3 w-3 text-cyan-400" />
            <span>Registry Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {map_tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-mono text-cyan-300 transition-colors hover:border-cyan-500/40"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
