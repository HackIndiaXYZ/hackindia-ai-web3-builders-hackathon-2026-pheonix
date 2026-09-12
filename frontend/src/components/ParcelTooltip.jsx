import React from "react";
import { StatusChip } from "./StatusChip.jsx";
import { MapPin } from "lucide-react";

/**
 * Public ParcelTooltip: Strictly displays ONLY:
 * - ulpin
 * - title_status
 * - ownership_type
 * - locality
 */
export function ParcelTooltip({ hoverInfo }) {
  if (!hoverInfo || !hoverInfo.object || hoverInfo.x == null || hoverInfo.y == null) {
    return null;
  }

  const { object: parcel, x, y } = hoverInfo;

  const tooltipStyle = {
    left: `${x + 16}px`,
    top: `${y - 12}px`,
    pointerEvents: "none",
    transform: "translate3d(0, 0, 0)",
  };

  return (
    <div
      style={tooltipStyle}
      className="fixed z-50 min-w-[220px] max-w-[260px] rounded-lg border border-white/15 bg-[#090d16]/95 backdrop-blur-md p-3 shadow-2xl transition-opacity duration-150 text-left select-none animate-fade-slide-up"
    >
      {/* Header: ULPIN & Title Status */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <span className="font-mono text-xs font-bold text-white tracking-wide truncate">
          {parcel.ulpin}
        </span>
        <StatusChip status={parcel.title_status} isPublic={true} size="xs" />
      </div>

      {/* Allowed fields: ownership_type & locality */}
      <div className="mt-2 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Ownership</span>
          <span className="font-medium text-slate-200">
            {parcel.ownership_type || "FREEHOLD"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 pt-1 border-t border-white/5 text-slate-300">
          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="truncate text-[11px] text-slate-300">
            {parcel.locality || "Noida"}
          </span>
        </div>
      </div>
    </div>
  );
}
