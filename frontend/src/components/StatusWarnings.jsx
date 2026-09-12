import React from "react";
import { AlertTriangle, AlertOctagon, Scale, ShieldAlert, Landmark, Layers } from "lucide-react";
import { formatCurrencyINR } from "../lib/utils.js";

/**
 * High-visibility warning banner when title_status is DISPUTED, FROZEN, HIGH_RISK,
 * or when encumbrances / boundary overlaps exist.
 */
export function StatusWarnings({ parcel }) {
  if (!parcel) return null;

  const warnings = [];

  // Court Freeze
  if (parcel.freeze || parcel.title_status === "FROZEN") {
    warnings.push({
      id: "freeze",
      type: "danger",
      icon: AlertOctagon,
      title: "Court Injunction / Legal Freeze Active",
      details: parcel.freeze
        ? `Case #${parcel.freeze.case_id} — ${parcel.freeze.reason.replace(/_/g, " ")}. Release authority: ${parcel.freeze.release_authority}.`
        : "Parcel title is legally frozen under statutory orders.",
    });
  }

  // Disputed
  if (parcel.title_status === "DISPUTED" || parcel.risk_status === "DISPUTED") {
    warnings.push({
      id: "dispute",
      type: "danger",
      icon: Scale,
      title: "Title Ownership Under Active Dispute",
      details: "Conflicting ownership claims recorded. Transfer mutations are suspended pending adjudication.",
    });
  }

  // High Risk
  if (parcel.risk_status === "HIGH_RISK" || parcel.title_status === "HIGH_RISK" || parcel.title_status === "REVIEW_REQUIRED") {
    warnings.push({
      id: "risk",
      type: "danger",
      icon: ShieldAlert,
      title: "High Risk Title Health Rating",
      details: "Elevated risk score flagged by automated algorithmic cadastral audits.",
    });
  }

  // Boundary Overlap
  if (parcel.overlap_findings && parcel.overlap_findings.length > 0) {
    parcel.overlap_findings.forEach((overlap, idx) => {
      warnings.push({
        id: `overlap-${idx}`,
        type: "warning",
        icon: Layers,
        title: `Cadastral Boundary Overlap (${overlap.overlap_percent_of_parcel}% conflict)`,
        details: `Overlaps ${overlap.overlap_sqm} m² with adjoining parcel ${overlap.with_ulpin}. Status: ${overlap.status}.`,
      });
    });
  }

  // Encumbrances (Mortgage/Lien)
  if (parcel.encumbrances && parcel.encumbrances.length > 0) {
    parcel.encumbrances.forEach((enc, idx) => {
      warnings.push({
        id: `enc-${idx}`,
        type: "warning",
        icon: Landmark,
        title: `Active Financial Encumbrance (${enc.type})`,
        details: `Held by ${enc.holder} for ${formatCurrencyINR(enc.amount_inr)} (Ref: ${enc.document_ref}).`,
      });
    });
  }

  // History Gap Warning
  if (parcel.history_gap) {
    warnings.push({
      id: "gap",
      type: "warning",
      icon: AlertTriangle,
      title: `Historical Chain of Title Gap (${parcel.history_gap.from.slice(0, 4)}–${parcel.history_gap.to.slice(0, 4)})`,
      details: `Reason: ${parcel.history_gap.reason.replace(/_/g, " ")}. Estimated missing ledger events: ${parcel.history_gap.estimated_missing_events}.`,
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2.5 my-3">
      {warnings.map((w) => {
        const isDanger = w.type === "danger";
        const IconComponent = w.icon;

        return (
          <div
            key={w.id}
            className={`rounded-xl p-3 border text-xs shadow-sm transition-all duration-200 ${
              isDanger
                ? "bg-rose-500/10 border-rose-500/40 text-rose-200"
                : "bg-amber-500/10 border-amber-500/40 text-amber-200"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <IconComponent
                className={`h-4 w-4 shrink-0 mt-0.5 ${
                  isDanger ? "text-rose-400" : "text-amber-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div
                  className={`font-semibold tracking-wide ${
                    isDanger ? "text-rose-300" : "text-amber-300"
                  }`}
                >
                  {w.title}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed opacity-90 font-sans">
                  {w.details}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
