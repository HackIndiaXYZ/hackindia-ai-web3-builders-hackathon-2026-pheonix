import React, { useState } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";

const LEGEND_ITEMS = [
  { label: "Verified / Clean Title", color: "#10b981", desc: "Unencumbered ownership", tag: "success" },
  { label: "Review / Caution", color: "#f59e0b", desc: "Flagged mismatch / Encumbrance", tag: "warning" },
  { label: "High Risk / Disputed", color: "#ef4444", desc: "Active dispute / Overlap", tag: "danger" },
  { label: "Frozen / Injunction", color: "#94a3b8", desc: "Court order injunction", tag: "neutral" },
  { label: "Succession / Recovery", color: "#3b82f6", desc: "Mutation pending / Recovery", tag: "info" },
];

/**
 * Floating map legend showing the semantic color coding from map_layers.parcel_style_by_status
 */
export function MapLegend({ activeFilter, onSelectFilter }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="fixed bottom-6 left-6 z-20 hidden md:block select-none">
      <div className="rounded-2xl border border-white/10 bg-navy-900/85 shadow-glass backdrop-blur-xl transition-all duration-200 w-64 overflow-hidden">
        {/* Header Toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span>Title Status Legend</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {/* Content list */}
        {isExpanded && (
          <div className="border-t border-white/10 px-3.5 py-2 space-y-1.5">
            {LEGEND_ITEMS.map((item) => {
              const isSelected = activeFilter === item.tag;
              return (
                <div
                  key={item.label}
                  onClick={() => onSelectFilter && onSelectFilter(isSelected ? null : item.tag)}
                  className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs cursor-pointer transition-colors ${
                    isSelected ? "bg-white/10 text-white font-medium" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shadow-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono text-cyan-400">active</span>
                  )}
                </div>
              );
            })}
            <div className="pt-1 text-[10px] text-slate-400 font-mono text-center">
              Extruded height = parcel area (m²)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
