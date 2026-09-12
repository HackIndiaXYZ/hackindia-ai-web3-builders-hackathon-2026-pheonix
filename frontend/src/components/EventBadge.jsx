const STYLES = {
  PARCEL_REGISTERED: "bg-risk-approved/10 text-risk-approved ring-1 ring-risk-approved/30",
  TRANSFER: "bg-accent/10 text-accent ring-1 ring-accent/30",
  CERTIFICATE_MINTED: "bg-violet-400/10 text-violet-300 ring-1 ring-violet-400/30",
};

export function EventBadge({ type }) {
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${STYLES[type] || "bg-base-700 text-zinc-300"}`}
    >
      {type.replace(/_/g, " ")}
    </span>
  );
}
