import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiFileText, FiLink2, FiAward, FiActivity, FiPlay, FiRotateCcw } from "react-icons/fi";
import { apiGet, apiPost } from "../lib/api.js";
import { navigate } from "../hooks/useHashRoute.js";
import { StatusBadge } from "../components/StatusBadge.jsx";

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: "easeOut" },
  }),
};

function StatCard({ icon: Icon, label, value, index }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-base-900/50 p-5 transition-colors hover:border-accent/30"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
        <Icon className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-accent" />
      </div>
      <div className="mt-3 font-mono text-3xl font-bold text-white">{value}</div>
    </motion.div>
  );
}

function RiskBar({ label, count, total, colorClass }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <StatusBadge status={label} />
        <span className="font-mono text-zinc-400">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className={`h-full rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function Dashboard({ auth, config }) {
  const [stats, setStats] = useState(null);
  const [demoResults, setDemoResults] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStats = () => apiGet("/stats").then(setStats).catch((e) => setError(e.message));
  useEffect(() => { loadStats(); }, []);

  const runDemo = async () => {
    setDemoLoading(true); setError("");
    try {
      const results = await apiGet("/demo/run-all");
      setDemoResults(results);
      await loadStats();
    } catch (e) {
      setError(e.message);
    } finally {
      setDemoLoading(false);
    }
  };

  // Lets the demo be run repeatedly without restarting the backend — seed
  // data is restored, but on-chain history is deliberately left intact,
  // because a real chain can't be rewound either.
  const resetDemo = async () => {
    setError("");
    try {
      await apiPost("/demo/reset", {}, auth.token);
      setDemoResults(null);
      await loadStats();
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !stats) {
    return (
      <div className="rounded-lg border border-risk-high/30 bg-risk-high/5 p-4 text-sm text-risk-high">
        {error}
      </div>
    );
  }
  if (!stats) return <p className="text-sm text-zinc-500">Loading…</p>;

  const total = stats.assessments_run;
  const sc = stats.status_counts;

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} icon={FiFileText} label="Parcels in registry" value={stats.total_parcels} />
        <StatCard index={1} icon={FiLink2} label="On-chain events" value={stats.total_onchain_events} />
        <StatCard index={2} icon={FiAward} label="Certificates minted" value={stats.certificates_minted} />
        <StatCard index={3} icon={FiActivity} label="Fraud checks run" value={stats.assessments_run} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Risk breakdown */}
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-base-900/50 p-6">
          <h2 className="mb-5 text-sm font-semibold text-zinc-200">Risk status breakdown</h2>
          {total === 0 ? (
            <p className="text-sm text-zinc-500">
              No fraud checks run yet — try "Run seeded scenarios" or submit a transfer.
            </p>
          ) : (
            <div className="space-y-4">
              <RiskBar label="AUTO_APPROVED" count={sc.AUTO_APPROVED} total={total} colorClass="bg-risk-approved" />
              <RiskBar label="FLAGGED" count={sc.FLAGGED} total={total} colorClass="bg-risk-flagged" />
              <RiskBar label="HIGH_RISK" count={sc.HIGH_RISK} total={total} colorClass="bg-risk-high" />
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-3 rounded-xl border border-white/10 bg-base-900/50 p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-200">Recent activity</h2>
          {stats.recent_activity.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing yet.</p>
          ) : (
            <div className="space-y-1">
              {stats.recent_activity.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white/[0.03]"
                >
                  <span className="font-mono text-xs text-accent">{a.ulpin}</span>
                  <StatusBadge status={a.status} />
                  <span className="font-mono text-xs text-zinc-500">{a.composite_risk_score}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Run seeded scenarios */}
      <div className="mt-6 rounded-xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] to-transparent p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Run all seeded scenarios</h2>
            <p className="mt-1 max-w-md text-sm text-zinc-400">
              Eight planted cases covering every fraud pattern the engine detects —
              two clean, three flagged for review, three blocked outright.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {auth?.isRegistrar && (
              <button
                onClick={resetDemo}
                title="Restore seed data so the demo can be run again"
                className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
              >
                <FiRotateCcw className="h-4 w-4" />
                Reset
              </button>
            )}
            <button
              onClick={runDemo}
              disabled={demoLoading}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              <FiPlay className="h-4 w-4" />
              {demoLoading ? "Running…" : "Run scenarios"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-risk-high/30 bg-risk-high/5 p-3 text-sm text-risk-high">
            {error}
          </div>
        )}

        {demoResults && (
          <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <tbody>
                {demoResults.map((d, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => d.ulpin && navigate("/registry/" + encodeURIComponent(d.ulpin))}
                    className="cursor-pointer border-b border-white/5 bg-base-900/50 align-top transition-colors last:border-0 hover:bg-accent/[0.04]"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-accent">{d.ulpin}</td>
                    <td className="px-4 py-2.5">
                      {d.status ? <StatusBadge status={d.status} /> : <span className="text-xs text-risk-high">error</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{d.composite_risk_score}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-400">
                      <div>{(d.flags || []).map((f) => f.code).join(", ") || "—"}</div>
                      {/* The seeded note says what each case is meant to
                          demonstrate — useful when walking a judge through. */}
                      {d.note && <div className="mt-1 max-w-md text-[11px] leading-snug text-zinc-600">{d.note}</div>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
