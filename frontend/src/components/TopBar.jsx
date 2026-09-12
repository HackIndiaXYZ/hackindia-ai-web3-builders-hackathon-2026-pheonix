import { FiCpu } from "react-icons/fi";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/registry": "Registry",
  "/register": "Register Parcel",
  "/transfer": "Transfer Ownership",
  "/chain": "Blockchain Explorer",
  "/login": "Sign in",
};

export function TopBar({ route, config }) {
  const title = PAGE_TITLES[route] || "Parcel Register";
  // Until /api/config responds we don't know the mode — showing "Mock chain"
  // by default would be a guess, and would be wrong on a live deployment.
  const chainMode = config?.chain_mode;
  const isLive = chainMode === "live";

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/5 bg-base-950/80 px-8 backdrop-blur-md">
      <h1 className="text-lg font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-3">
        {config?.llm_explanations_enabled && (
          <div
            className="flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1.5"
            title="Risk reports are narrated by Claude, grounded in the rule engine's computed flags"
          >
            <FiCpu className="h-3 w-3 text-violet-300" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-violet-300">
              AI narration
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              isLive ? "bg-risk-approved animate-pulse-glow" : "bg-zinc-500"
            }`}
          />
          <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            {chainMode === undefined
              ? "Connecting…"
              : isLive
              ? "Live chain — Amoy"
              : "Mock chain"}
          </span>
        </div>
      </div>
    </header>
  );
}
