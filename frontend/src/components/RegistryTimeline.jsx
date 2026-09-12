import React from "react";
import { EVENT_TYPE_COLORS } from "../lib/parcelColors.js";
import { formatDate, formatArea, truncateHash } from "../lib/utils.js";
import { GitFork, FileText, Hash, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";

/**
 * Vertical event timeline matching the registry history sequence.
 * Visualizes parent -> child subdivisions for PARTITION events.
 * Renders dashed history gap segment when present.
 */
export function RegistryTimeline({ parcel }) {
  if (!parcel || !parcel.history || parcel.history.length === 0) return null;

  const sortedHistory = [...parcel.history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const historyGap = parcel.history_gap;
  const gapStartYear = historyGap ? new Date(historyGap.from).getFullYear() : null;

  return (
    <div className="space-y-3 pt-2">
      <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono px-1">
        Chronological Title Lineage
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
        {sortedHistory.map((evt, idx) => {
          const evtYear = new Date(evt.date).getFullYear();
          const typeConfig = EVENT_TYPE_COLORS[evt.type] || {
            fill: "#06b6d4",
            label: evt.type?.replace(/_/g, " "),
          };

          // Check if history gap falls before this event
          const shouldRenderGapBefore =
            historyGap &&
            idx > 0 &&
            evtYear > (gapStartYear || 0) &&
            new Date(sortedHistory[idx - 1].date).getFullYear() <= (gapStartYear || 0);

          return (
            <React.Fragment key={evt.event_id || idx}>
              {/* Inserted Dashed Archival Gap if applicable */}
              {shouldRenderGapBefore && (
                <div className="relative my-4 rounded-xl border-2 border-dashed border-amber-500/50 bg-amber-500/10 p-3 text-xs -ml-2">
                  <div className="flex items-start gap-2 text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <div className="font-semibold">
                        Archival Gap Segment: {historyGap.from.slice(0, 4)} — {historyGap.to.slice(0, 4)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-amber-200/80">
                        {historyGap.reason.replace(/_/g, " ")} · ~{historyGap.estimated_missing_events} unrecorded mutations
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline Item */}
              <div className="relative group">
                {/* Timeline node dot */}
                <div
                  className="absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-navy-950 transition-transform group-hover:scale-125"
                  style={{ backgroundColor: typeConfig.fill }}
                />

                <div className="rounded-xl border border-white/10 bg-navy-950/60 p-3 text-xs space-y-2.5 transition-all hover:border-cyan-500/30 hover:bg-navy-950/80">
                  {/* Top Bar: Event Type & Date */}
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold font-mono tracking-wide"
                      style={{
                        backgroundColor: `${typeConfig.fill}20`,
                        color: typeConfig.fill,
                        border: `1px solid ${typeConfig.fill}40`,
                      }}
                    >
                      {typeConfig.label || evt.type}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {formatDate(evt.date)}
                    </span>
                  </div>

                  {/* Transfer Parties */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-300 font-medium truncate max-w-[120px]">
                      {evt.from_owner}
                    </span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-cyan-400" />
                    <span className="text-cyan-200 font-semibold truncate max-w-[130px]">
                      {evt.to_owner}
                    </span>
                  </div>

                  {/* Metadata Row: Area, Doc Ref & Verification */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Area</span>
                      <span className="font-mono text-slate-200">{formatArea(evt.area_sqm)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Doc Ref</span>
                      <span className="font-mono text-slate-200 truncate block">
                        {evt.document_ref || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Verification & Hash */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                    <div className="flex items-center gap-1 text-emerald-400 font-mono">
                      <CheckCircle className="h-3 w-3 shrink-0" />
                      <span>{evt.verification || "VERIFIED"}</span>
                    </div>
                    {evt.document_hash && (
                      <div className="flex items-center gap-1 text-slate-400 font-mono">
                        <Hash className="h-3 w-3 shrink-0 text-slate-500" />
                        <span>{truncateHash(evt.document_hash)}</span>
                      </div>
                    )}
                  </div>

                  {/* Partition Event Subdivision Visualizer (Parent -> Child Split) */}
                  {evt.subdivision && evt.subdivision.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-amber-500/20 rounded-lg bg-amber-500/5 p-2.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px]">
                        <GitFork className="h-3.5 w-3.5 text-amber-400" />
                        <span>Cadastral Partition Breakdown ({formatArea(evt.area_sqm)})</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {evt.subdivision.map((sub, sIdx) => (
                          <div
                            key={sIdx}
                            className="rounded border border-amber-500/20 bg-navy-900/80 p-2 space-y-0.5"
                          >
                            <div className="font-mono text-[10px] text-cyan-300 font-bold">
                              {sub.parcel}
                            </div>
                            <div className="font-mono text-slate-200 font-semibold">
                              {formatArea(sub.area_sqm)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Subdivided share
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
