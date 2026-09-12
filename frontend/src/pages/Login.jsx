import { useState } from "react";
import { motion } from "framer-motion";
import { navigate } from "../hooks/useHashRoute.js";

export function LoginPage({ auth }) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("REGISTRAR");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await auth.login(username, role);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-base-900/60 p-8 backdrop-blur-xl shadow-glow"
      >
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-accent shadow-glow-sm">
          <span className="font-mono text-sm font-bold text-black">PR</span>
        </div>
        <h1 className="mt-4 text-xl font-semibold text-white">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Demo identity layer standing in for the real one — a production
          deployment authenticates via Aadhaar-linked eSign/DigiLocker, not a
          role picker. Only an authenticated Registrar session can register a
          parcel, commit a transfer, or mint a certificate; anyone can search
          and verify without logging in.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. registrar_noida2"
              required
              className="w-full rounded-lg border border-white/10 bg-base-800 px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-600 outline-none transition-shadow focus:border-accent/50 focus:shadow-glow-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-base-800 px-3.5 py-2.5 text-sm text-white outline-none transition-shadow focus:border-accent/50 focus:shadow-glow-sm"
            >
              <option value="REGISTRAR">Registrar — register / commit / mint</option>
              <option value="BANK">Bank Officer — read-only</option>
              <option value="BUYER">Buyer — read-only</option>
              <option value="AUDITOR">Auditor / Court — read-only, full history</option>
            </select>
          </div>

          {error && <p className="text-sm text-risk-high">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-hover"
          >
            Sign in
          </button>
        </form>
      </motion.div>
    </div>
  );
}
