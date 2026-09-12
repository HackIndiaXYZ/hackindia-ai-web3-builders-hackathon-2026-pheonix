// Color tokens and status mapping for TitleLock Explorer
// Strictly follows map_layers.parcel_style_by_status and UI requirements

export const STATUS_PALETTE = {
  success: {
    name: "Verified",
    rgbaFill: [16, 185, 129, 175],     // emerald-500 @ ~68%
    rgbaLine: [52, 211, 153, 255],     // emerald-400 solid
    hex: "#10b981",
    bgClass: "bg-emerald-500/15",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-500/30",
  },
  warning: {
    name: "Review",
    rgbaFill: [245, 158, 11, 175],     // amber-500 @ ~68%
    rgbaLine: [251, 191, 36, 255],     // amber-400 solid
    hex: "#f59e0b",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-400",
    borderClass: "border-amber-500/30",
  },
  danger: {
    name: "Disputed / High Risk",
    rgbaFill: [239, 68, 68, 185],      // rose-500 @ ~72%
    rgbaLine: [248, 113, 113, 255],    // rose-400 solid
    hex: "#ef4444",
    bgClass: "bg-rose-500/15",
    textClass: "text-rose-400",
    borderClass: "border-rose-500/30",
  },
  neutral: {
    name: "Frozen",
    rgbaFill: [148, 163, 184, 170],    // slate-400 @ ~66%
    rgbaLine: [203, 213, 225, 255],    // slate-300 solid
    hex: "#94a3b8",
    bgClass: "bg-slate-500/15",
    textClass: "text-slate-300",
    borderClass: "border-slate-500/30",
  },
  info: {
    name: "Succession / Recovery",
    rgbaFill: [59, 130, 246, 175],     // blue-500 @ ~68%
    rgbaLine: [96, 165, 250, 255],     // blue-400 solid
    hex: "#3b82f6",
    bgClass: "bg-blue-500/15",
    textClass: "text-blue-400",
    borderClass: "border-blue-500/30",
  },
};

/**
 * Maps parcel status to one of the 5 semantic style categories
 * Uses parcels[].title_status and falls back to risk_status only if title_status is missing.
 */
export function getStatusCategory(parcel) {
  if (!parcel) return "neutral";

  const titleStatus = (parcel.title_status || "").toUpperCase();
  const riskStatus = (parcel.risk_status || "").toUpperCase();

  // 1. Direct and composite title status checks
  if (titleStatus === "VERIFIED" || titleStatus === "SUCCESSION_COMPLETED" || titleStatus === "PARTITIONED") {
    return "success";
  }
  if (titleStatus === "VERIFIED_WITH_ENCUMBRANCE") {
    // Verified base title with active encumbrance
    return "warning";
  }
  if (titleStatus === "VERIFIED_WITH_HISTORY_GAP") {
    return "warning";
  }
  if (titleStatus === "REVIEW" || titleStatus === "REVIEW_REQUIRED" || titleStatus === "BOUNDARY_REVIEW") {
    // If review is high-risk, flag as danger
    if (riskStatus === "HIGH_RISK") return "danger";
    return "warning";
  }
  if (titleStatus === "HIGH_RISK" || titleStatus === "DISPUTED") {
    return "danger";
  }
  if (titleStatus === "FROZEN") {
    return "neutral";
  }
  if (titleStatus === "SUCCESSION_PENDING" || titleStatus === "CREDENTIAL_RECOVERY") {
    return "info";
  }

  // 2. Fall back to risk_status only if title_status is missing or unrecognized
  if (riskStatus === "HIGH_RISK" || riskStatus === "DISPUTED") return "danger";
  if (riskStatus === "REVIEW" || riskStatus === "FLAGGED" || riskStatus === "FLAGGED_PENDING_REVIEW") return "warning";
  if (riskStatus === "LOW_RISK") return "success";

  return "neutral";
}

/**
 * Deck.gl fill color accessor
 */
export function getParcelFillColor(parcel, isSelected = false, isHovered = false) {
  if (isSelected) {
    // Cyan glow fill for selected parcel
    return [0, 240, 255, 140];
  }
  const category = getStatusCategory(parcel);
  const palette = STATUS_PALETTE[category] || STATUS_PALETTE.neutral;

  if (isHovered) {
    // Slightly brighter fill on hover
    return [palette.rgbaFill[0], palette.rgbaFill[1], palette.rgbaFill[2], 210];
  }

  return palette.rgbaFill;
}

/**
 * Deck.gl line/outline color accessor
 */
export function getParcelLineColor(parcel, isSelected = false, isHovered = false) {
  if (isSelected) {
    // Neon electric cyan outline
    return [0, 240, 255, 255];
  }
  if (isHovered) {
    // Bright white highlight on hover
    return [255, 255, 255, 255];
  }
  const category = getStatusCategory(parcel);
  const palette = STATUS_PALETTE[category] || STATUS_PALETTE.neutral;
  return palette.rgbaLine;
}

/**
 * Extruded height derived from parcels[].area_sqm (log scale, clamped)
 * Selected parcel is raised higher
 */
export function getParcelElevation(parcel, isSelected = false) {
  const area = parcel?.area_sqm || 1000;
  // Logarithmic scaling: area range roughly 800 - 3600 sqm
  // Math.log10(area) is ~2.9 to ~3.55
  const baseHeight = Math.max(14, Math.round((Math.log10(area) - 2.5) * 45 + 16));
  const clampedHeight = Math.min(65, Math.max(15, baseHeight));
  return isSelected ? clampedHeight + 18 : clampedHeight;
}

/**
 * Returns UI badge style classes and human-readable label
 */
export function getStatusBadgeProps(titleStatus) {
  const s = (titleStatus || "").toUpperCase();
  if (s === "VERIFIED" || s === "SUCCESSION_COMPLETED" || s === "PARTITIONED") {
    return {
      label: s.replace(/_/g, " "),
      bg: "bg-emerald-500/15",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      dot: "bg-emerald-400",
    };
  }
  if (s.includes("REVIEW") || s.includes("ENCUMBRANCE") || s.includes("HISTORY_GAP")) {
    return {
      label: s.replace(/_/g, " "),
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      border: "border-amber-500/30",
      dot: "bg-amber-400",
    };
  }
  if (s === "HIGH_RISK" || s === "DISPUTED") {
    return {
      label: s.replace(/_/g, " "),
      bg: "bg-rose-500/15",
      text: "text-rose-400",
      border: "border-rose-500/30",
      dot: "bg-rose-400",
    };
  }
  if (s === "FROZEN") {
    return {
      label: "FROZEN",
      bg: "bg-slate-500/20",
      text: "text-slate-300",
      border: "border-slate-500/30",
      dot: "bg-slate-400",
    };
  }
  if (s.includes("SUCCESSION") || s.includes("RECOVERY")) {
    return {
      label: s.replace(/_/g, " "),
      bg: "bg-blue-500/15",
      text: "text-blue-400",
      border: "border-blue-500/30",
      dot: "bg-blue-400",
    };
  }
  return {
    label: s.replace(/_/g, " ") || "UNKNOWN",
    bg: "bg-slate-500/15",
    text: "text-slate-300",
    border: "border-slate-500/30",
    dot: "bg-slate-400",
  };
}

export function getRiskBadgeProps(riskStatus) {
  const r = (riskStatus || "").toUpperCase();
  if (r === "LOW_RISK") {
    return {
      label: "LOW RISK",
      bg: "bg-emerald-500/15",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
    };
  }
  if (r === "REVIEW" || r.includes("FLAGGED")) {
    return {
      label: r.replace(/_/g, " "),
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      border: "border-amber-500/30",
    };
  }
  if (r === "HIGH_RISK" || r === "DISPUTED") {
    return {
      label: r.replace(/_/g, " "),
      bg: "bg-rose-500/15",
      text: "text-rose-400",
      border: "border-rose-500/30",
    };
  }
  return {
    label: r || "STANDARD",
    bg: "bg-slate-500/15",
    text: "text-slate-300",
    border: "border-slate-500/30",
  };
}

// Registry history event point colors
export const EVENT_TYPE_COLORS = {
  ORIGINAL_RECORD: { fill: "#10b981", stroke: "#059669", label: "Original Record" },
  SUCCESSION: { fill: "#8b5cf6", stroke: "#7c3aed", label: "Succession" },
  SALE: { fill: "#06b6d4", stroke: "#0891b2", label: "Sale / Transfer" },
  PARTITION: { fill: "#f59e0b", stroke: "#d97706", label: "Partition" },
  ENCUMBRANCE: { fill: "#f97316", stroke: "#ea580c", label: "Encumbrance" },
  LEGAL_FREEZE: { fill: "#ef4444", stroke: "#dc2626", label: "Legal Freeze" },
};
