import { useState } from "react";
import { apiGet } from "../lib/api.js";

export function OperationsPage({ auth }) {
  const [ulpin, setUlpin] = useState("UP-0001-CLEAN");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const verify = async () => { try { setError(""); setResult(await apiGet(`/verification/${encodeURIComponent(ulpin)}`)); } catch (e) { setError(e.message); } };
  const audit = async () => { try { setError(""); setResult(await apiGet("/audit", auth.token)); } catch (e) { setError(e.message); } };
  const isAuditor = auth.user?.role === "AUDITOR" || auth.user?.role === "REGISTRAR";
  return <div className="space-y-6">
    <div className="rounded-xl border border-white/10 bg-base-900/50 p-6"><h1 className="text-lg font-semibold text-white">Title verification workspace</h1><p className="mt-2 text-sm text-zinc-400">Bank-safe verification returns title health and ledger state without private owner information.</p><div className="mt-4 flex gap-3"><input value={ulpin} onChange={(e) => setUlpin(e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-base-800 px-3 py-2 font-mono text-sm text-white"/><button onClick={verify} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black">Verify title</button></div></div>
    {isAuditor && <div className="rounded-xl border border-white/10 bg-base-900/50 p-6"><h2 className="font-semibold text-white">Auditor workspace</h2><p className="mt-1 text-sm text-zinc-400">Review sensitive system actions separately from title history.</p><button onClick={audit} className="mt-4 rounded-lg border border-accent px-4 py-2 text-sm text-accent">Load audit trail</button></div>}
    {error && <div className="rounded-lg border border-risk-high/30 p-3 text-sm text-risk-high">{error}</div>}
    {result && <pre className="overflow-auto rounded-xl border border-white/10 bg-base-900/50 p-5 text-xs text-zinc-300">{JSON.stringify(result, null, 2)}</pre>}
  </div>;
}
