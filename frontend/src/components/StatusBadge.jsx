const STYLES = {
  AUTO_APPROVED: "bg-risk-approved/10 text-risk-approved ring-1 ring-risk-approved/30",
  FLAGGED: "bg-risk-flagged/10 text-risk-flagged ring-1 ring-risk-flagged/30",
  HIGH_RISK: "bg-risk-high/10 text-risk-high ring-1 ring-risk-high/30 shadow-[0_0_12px_-2px_rgba(255,77,77,0.4)]",
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-semibold tracking-wide ${STYLES[status] || "bg-base-700 text-zinc-300"}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace("_", " ")}
    </span>
  );
}
