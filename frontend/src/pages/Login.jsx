import { useState } from "react";
import { motion } from "framer-motion";
import { navigate } from "../hooks/useHashRoute.js";

export function LoginPage({ auth }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setError("");
    try { await auth.login(username); navigate("/dashboard"); }
    catch (err) { setError(err.message); }
  };
  return <div className="flex min-h-screen items-center justify-center px-4">
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl border border-white/10 bg-base-900/60 p-8 backdrop-blur-xl shadow-glow">
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-accent shadow-glow-sm"><span className="font-mono text-sm font-bold text-black">PR</span></div>
      <h1 className="mt-4 text-xl font-semibold text-white">Sign in</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">The server-side demo directory assigns your role; roles are never selected in the browser. Try registrar_noida2, Rajesh Kumar, buyer1, bank1, or auditor1.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Identity</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. registrar_noida2" required className="w-full rounded-lg border border-white/10 bg-base-800 px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-600 outline-none transition-shadow focus:border-accent/50 focus:shadow-glow-sm" /></div>
        {error && <p className="text-sm text-risk-high">{error}</p>}
        <button type="submit" className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-hover">Sign in</button>
      </form>
    </motion.div>
  </div>;
}
