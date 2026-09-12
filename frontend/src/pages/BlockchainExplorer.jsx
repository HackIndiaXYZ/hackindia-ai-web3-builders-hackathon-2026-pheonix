import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { apiGet } from "../lib/api.js";
import { navigate } from "../hooks/useHashRoute.js";
import { EventBadge } from "../components/EventBadge.jsx";

export function BlockchainExplorer() {
  const [activity, setActivity] = useState([]);

  useEffect(() => { apiGet("/chain/all").then(setActivity).catch(() => {}); }, []);

  return (
    <div>
      <p className="mb-6 max-w-2xl text-sm text-zinc-400">
        Every on-chain event across the whole registry — registrations,
        transfers, and certificate mints — in immutable order. The same event
        log <code className="text-accent">LandRegistry.sol</code> emits once
        deployed to a real testnet.
      </p>

      {activity.length === 0 ? (
        <p className="text-sm text-zinc-500">No on-chain activity yet this session.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
          {/* Fake terminal chrome — reinforces the "immutable ledger log" read */}
          <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.02] px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-risk-high/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-risk-flagged/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-risk-approved/60" />
            <span className="ml-3 font-mono text-[11px] text-zinc-500">chain-explorer — live feed</span>
          </div>

          <div className="font-mono text-xs">
            {activity.map((e, i) => {
              const isLatest = i === 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.025 }}
                  onClick={() => navigate("/registry/" + encodeURIComponent(e.ulpin))}
                  className={`flex cursor-pointer items-center gap-4 border-b border-white/5 px-4 py-3 transition-colors last:border-0 hover:bg-accent/[0.05] ${
                    isLatest ? "border-l-2 border-l-accent bg-accent/[0.04] shadow-[inset_0_0_20px_-10px_#FF6A00]" : ""
                  }`}
                >
                  <span className="w-20 shrink-0 text-zinc-600">#{e.block_number}</span>
                  <EventBadge type={e.event_type} />
                  <span className="w-40 shrink-0 truncate text-accent">{e.ulpin}</span>
                  <span className="flex-1 truncate text-zinc-400">{e.from || "—"} → {e.to}</span>
                  {/* A transfer committed over a HIGH_RISK verdict is
                      permanently marked here — that's what the contract's
                      aiVerified flag is for. */}
                  {e.ai_verified === false && (
                    <span
                      className="shrink-0 rounded-full bg-risk-flagged/15 px-2 py-0.5 text-[10px] font-semibold text-risk-flagged"
                      title="Registrar override — not cleared by the fraud engine"
                    >
                      OVERRIDE
                    </span>
                  )}
                  <span className="w-32 shrink-0 truncate text-zinc-600">{e.tx_hash}</span>
                  <span className="w-40 shrink-0 text-right text-zinc-600">{e.timestamp}</span>
                  {isLatest && (
                    <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      LATEST
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
