import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiArrowRight, FiMapPin } from "react-icons/fi";
import { apiGet } from "../lib/api.js";
import { navigate } from "../hooks/useHashRoute.js";
import { EventBadge } from "../components/EventBadge.jsx";

export function ParcelDetail({ ulpin }) {
  const [prop, setProp] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setProp(null);
    apiGet("/properties/" + encodeURIComponent(ulpin)).then(setProp).catch((e) => setError(e.message));
  }, [ulpin]);

  if (error) {
    return <div className="rounded-lg border border-risk-high/30 bg-risk-high/5 p-4 text-sm text-risk-high">{error}</div>;
  }
  if (!prop) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div>
      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 rounded-xl border border-white/10 bg-gradient-to-br from-base-900/80 to-base-900/40 p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="font-mono text-lg text-accent">{prop.ulpin}</div>
          <div className="mt-1 text-sm text-zinc-500">
            Survey {prop.survey_number} · {prop.area_sqm} sqm · {prop.registration_office}
          </div>
          <div className="mt-4 text-xs uppercase tracking-wide text-zinc-500">Current registered owner</div>
          <div className="text-xl font-semibold text-white">{prop.current_owner}</div>
          {prop.boundary && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
              <FiMapPin className="h-3.5 w-3.5" />
              Boundary on file — spatial overlap checks are active for this parcel.
            </div>
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/transfer")}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-black shadow-glow transition-colors hover:bg-accent-hover"
        >
          Start a transfer
          <FiArrowRight className="h-4 w-4" />
        </motion.button>
      </motion.div>

      {/* Split view */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-white/10 bg-base-900/50 p-5"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            Off-chain ownership history
          </h2>
          <div className="space-y-3">
            {prop.transfer_history.map((t, i) => (
              <div key={i} className="border-l-2 border-white/10 pl-3 text-sm">
                <div className="text-zinc-300">{t.from} → {t.to}</div>
                <div className="mt-0.5 font-mono text-xs text-zinc-500">{t.date} · {t.doc_hash}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-accent/20 bg-base-900/50 p-5"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_1px_#FF6A00]" />
            On-chain commits (this session)
          </h2>
          {prop.onchain_commits.length === 0 ? (
            <p className="text-sm text-zinc-500">No on-chain commits yet for this parcel.</p>
          ) : (
            <div className="space-y-3">
              {prop.onchain_commits.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="rounded-lg border border-accent/10 bg-accent/[0.03] p-3"
                >
                  <EventBadge type={c.event_type} />
                  <div className="mt-1.5 text-sm text-zinc-300">{c.from || "—"} → {c.to}</div>
                  {c.ai_verified === false && (
                    <div className="mt-1 text-[11px] font-medium text-risk-flagged">
                      Registrar override — not cleared by the fraud engine
                    </div>
                  )}
                  <div className="mt-0.5 font-mono text-xs text-zinc-500 break-all">
                    Block {c.block_number} · {c.tx_hash}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
