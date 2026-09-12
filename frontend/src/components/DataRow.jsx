import React from "react";

/**
 * DataRow: Key-value pair row for metadata presentation.
 * Clean, accessible, 8px rhythm, WCAG AA contrast.
 */
export function DataRow({ label, value, mono = false, helper = null, border = true }) {
  return (
    <div
      className={`flex items-start justify-between py-2 text-xs ${
        border ? "border-b border-[#F2F4F7]" : ""
      }`}
    >
      <div className="text-left pr-2">
        <span className="font-medium text-[#475467]">{label}</span>
        {helper && <p className="text-[10px] text-[#667085] mt-0.5">{helper}</p>}
      </div>
      <div
        className={`text-right text-[#101828] font-medium break-all ${
          mono ? "font-mono font-semibold text-[#0B3A67]" : ""
        }`}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}
