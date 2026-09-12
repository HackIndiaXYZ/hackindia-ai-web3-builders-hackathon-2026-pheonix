import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { EVENT_TYPE_COLORS } from "../lib/parcelColors.js";
import { formatDate, formatArea, truncateHash } from "../lib/utils.js";
import { AlertTriangle, Clock } from "lucide-react";

/**
 * Custom Tooltip for Recharts step graph.
 * Strictly displays: date, type, from_owner, to_owner, area_sqm, document_ref, document_hash, verification.
 */
function CustomChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  if (!data || !data.event) return null;

  const { event } = data;
  const typeConfig = EVENT_TYPE_COLORS[event.type] || {
    fill: "#94a3b8",
    label: event.type?.replace(/_/g, " "),
  };

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-navy-950/95 p-3 shadow-glass backdrop-blur-xl text-xs space-y-2 z-50 min-w-[240px]">
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: typeConfig.fill }}
          />
          <span className="font-bold text-white tracking-wide">
            {typeConfig.label || event.type}
          </span>
        </div>
        <span className="font-mono text-[10px] text-cyan-300">
          {formatDate(event.date)}
        </span>
      </div>

      <div className="space-y-1 text-slate-300 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-400">Transfer:</span>
          <span className="font-medium text-slate-100 text-right truncate max-w-[140px]">
            {event.from_owner} → {event.to_owner}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Parcel Area:</span>
          <span className="font-mono font-semibold text-cyan-300">
            {formatArea(event.area_sqm)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Doc Reference:</span>
          <span className="font-mono text-slate-200">
            {event.document_ref || "—"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Ledger Hash:</span>
          <span className="font-mono text-cyan-400">
            {truncateHash(event.document_hash, 14)}
          </span>
        </div>

        <div className="flex justify-between pt-1 border-t border-white/5">
          <span className="text-slate-400">Verification:</span>
          <span className="font-mono text-[10px] text-emerald-400 font-semibold">
            {event.verification || "VERIFIED"}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom Dot for Recharts LineChart
 */
function CustomEventDot(props) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload || !payload.event) return null;

  const eventType = payload.event.type;
  const config = EVENT_TYPE_COLORS[eventType] || { fill: "#00f0ff", stroke: "#ffffff" };

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={config.fill}
        stroke="#05070c"
        strokeWidth={2}
        className="cursor-pointer transition-transform hover:scale-125"
      />
      <circle
        cx={cx}
        cy={cy}
        r={2.5}
        fill="#ffffff"
      />
    </g>
  );
}

/**
 * Registry history step / line chart
 * X=date (1950 baseline to present), Y=area_sqm
 */
export function RegistryHistoryChart({ parcel }) {
  if (!parcel || !parcel.history || parcel.history.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center text-xs text-slate-400">
        No recorded mutation history for this parcel.
      </div>
    );
  }

  // Transform parcel.history into sorted chart data
  const sortedHistory = [...parcel.history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Prepare chart items with formatted year/date and area
  const chartData = sortedHistory.map((evt) => {
    const year = new Date(evt.date).getFullYear();
    return {
      dateLabel: `${year}`,
      fullDate: evt.date,
      timestamp: new Date(evt.date).getTime(),
      area_sqm: evt.area_sqm || parcel.area_sqm || 1200,
      event: evt,
    };
  });

  const historyGap = parcel.history_gap;

  return (
    <div className="space-y-3">
      {/* Chart Canvas */}
      <div className="rounded-2xl border border-white/10 bg-navy-950/70 p-3 shadow-inner">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>Cadastral Area & Title Progression</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            1950 — Present
          </span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 12, right: 14, left: -16, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                stroke="#64748b"
                tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "JetBrains Mono" }}
                tickLine={false}
              />
              <YAxis
                dataKey="area_sqm"
                stroke="#64748b"
                domain={['auto', 'auto']}
                tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "JetBrains Mono" }}
                tickLine={false}
                unit="m²"
              />
              <Tooltip content={<CustomChartTooltip />} />

              {/* Step line representing area over time */}
              <Line
                type="stepAfter"
                dataKey="area_sqm"
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={<CustomEventDot />}
                activeDot={{ r: 8, stroke: "#00f0ff", strokeWidth: 2 }}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend of event types present */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-white/5 text-[10px]">
          {Object.entries(EVENT_TYPE_COLORS).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1 text-slate-300 font-sans">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: config.fill }}
              />
              <span>{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Visibly Dashed History Gap Segment Indicator */}
      {historyGap && (
        <div className="rounded-xl border border-dashed border-amber-500/60 bg-amber-500/10 p-3 text-xs text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-300 flex items-center gap-2">
                <span>Archival Chain Gap ({historyGap.from.slice(0, 4)} → {historyGap.to.slice(0, 4)})</span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-mono border border-amber-500/40">
                  {historyGap.estimated_missing_events} Estimated Missing Events
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
                Notice: Physical records from {formatDate(historyGap.from)} to {formatDate(historyGap.to)} are unindexed ({historyGap.reason.replace(/_/g, " ")}). Title verification requires gazette reconciliation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
