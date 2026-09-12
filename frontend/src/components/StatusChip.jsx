import React from "react";

/**
 * StatusChip component with WCAG AA compliance and calm government palette.
 */
export function StatusChip({ status, isPublic = false, size = "sm" }) {
  const rawStatus = (status || "").toUpperCase();

  // In public mode, sanitize any alarming labels
  let label = rawStatus.replace(/_/g, " ");
  let colorStyle = {
    bg: "bg-[#F8FAFC]",
    text: "text-[#344054]",
    border: "border-[#D0D5DD]",
    dot: "bg-[#667085]",
  };

  if (rawStatus === "VERIFIED" || rawStatus === "APPROVED" || rawStatus === "AUTO_APPROVED" || rawStatus === "COMPLETED") {
    colorStyle = {
      bg: "bg-[#F0FDFA]",
      text: "text-[#0F766E]",
      border: "border-[#99F6E4]",
      dot: "bg-[#0F766E]",
    };
    if (rawStatus === "AUTO_APPROVED") label = "AUTO APPROVED";
  } else if (
    rawStatus.includes("REVIEW") ||
    rawStatus.includes("ENCUMBRANCE") ||
    rawStatus === "PENDING" ||
    rawStatus === "AWAITING_REGISTRAR" ||
    rawStatus === "AWAITING_OWNER"
  ) {
    colorStyle = {
      bg: "bg-[#FFFBEB]",
      text: "text-[#B54708]",
      border: "border-[#FDE68A]",
      dot: "bg-[#B54708]",
    };
    if (rawStatus === "AWAITING_REGISTRAR") label = "AWAITING REGISTRAR";
  } else if (rawStatus === "FROZEN") {
    if (isPublic) {
      label = "UNDER STATUTORY REVIEW";
      colorStyle = {
        bg: "bg-[#FFFBEB]",
        text: "text-[#B54708]",
        border: "border-[#FDE68A]",
        dot: "bg-[#B54708]",
      };
    } else {
      label = "FROZEN";
      colorStyle = {
        bg: "bg-[#FEF2F2]",
        text: "text-[#B42318]",
        border: "border-[#FECACA]",
        dot: "bg-[#B42318]",
      };
    }
  } else if (rawStatus === "DISPUTED" || rawStatus === "HIGH_RISK" || rawStatus === "BLOCKED" || rawStatus === "REJECTED") {
    if (isPublic) {
      label = "RECORD UNDER REVIEW";
      colorStyle = {
        bg: "bg-[#FFFBEB]",
        text: "text-[#B54708]",
        border: "border-[#FDE68A]",
        dot: "bg-[#B54708]",
      };
    } else {
      colorStyle = {
        bg: "bg-[#FEF2F2]",
        text: "text-[#B42318]",
        border: "border-[#FECACA]",
        dot: "bg-[#B42318]",
      };
    }
  } else if (rawStatus === "SETTLED") {
    colorStyle = {
      bg: "bg-[#EFF8FF]",
      text: "text-[#0B3A67]",
      border: "border-[#B2DDFF]",
      dot: "bg-[#0B3A67]",
    };
  }

  const sizeClasses =
    size === "xs"
      ? "px-1.5 py-0.5 text-[10px]"
      : size === "lg"
      ? "px-3 py-1 text-xs"
      : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses} ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${colorStyle.dot}`} />
      <span>{label}</span>
    </span>
  );
}
