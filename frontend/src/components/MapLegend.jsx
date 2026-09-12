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
    <div className="fixed bottom-6 left-[72px] z-20 hidden md:block select-none">
      <div className="w-64 overflow-hidden rounded-2xl border border-slate-700/90 bg-[#090d16] shadow-2xl transition-all duration-200">
        {/* Header Toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span>Title Status Legend</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-300" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-slate-300" />
          )}
        </button>

        {/* Content list */}
        {isExpanded && (
          <div className="space-y-1.5 border-t border-slate-700 px-3.5 py-2">
            {LEGEND_ITEMS.map((item) => {
              const isSelected = activeFilter === item.tag;
              return (
                <div
                  key={item.label}
                  onClick={() => onSelectFilter && onSelectFilter(isSelected ? null : item.tag)}
                  className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs cursor-pointer transition-colors ${
                    isSelected ? "bg-[#0B3A67] text-white font-medium" : "text-slate-100 hover:bg-white/10"
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
            <div className="pt-1 text-center font-mono text-[10px] text-slate-300">
              Extruded height = parcel area (m²)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
