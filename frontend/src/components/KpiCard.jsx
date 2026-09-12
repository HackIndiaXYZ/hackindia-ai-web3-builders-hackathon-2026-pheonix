import React, { useEffect, useState } from "react";

/**
 * KpiCard component with 300ms count-up number animation.
 * Adheres to 8px scale, 1px #D0D5DD border, 120ms hover lift.
 */
export function KpiCard({ title, value, icon: Icon, unit = "", trend = null, color = "default" }) {
  const [displayValue, setDisplayValue] = useState(0);

  const numericValue = typeof value === "number" ? value : parseInt(value, 10) || 0;

  // 300ms count-up animation on initial mount / value change
  useEffect(() => {
    let start = 0;
    const end = numericValue;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }

    const duration = 300; // strictly 300ms
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quadratic
      const current = Math.floor((1 - (1 - progress) * (1 - progress)) * end);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(end);
      }
    };

    requestAnimationFrame(step);
  }, [numericValue]);

  return (
    <div className="rounded-lg border border-[#D0D5DD] bg-white p-4 shadow-sm hover-lift text-left transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#475467]">{title}</span>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F8FAFC] text-[#0B3A67] border border-[#D0D5DD]">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-bold tracking-tight text-[#101828]">
          {typeof value === "number" ? displayValue.toLocaleString("en-IN") : value}
        </span>
        {unit && <span className="text-xs text-[#667085] font-medium">{unit}</span>}
      </div>

      {trend && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-[#667085]">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}
