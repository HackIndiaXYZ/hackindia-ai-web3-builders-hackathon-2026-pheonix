import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiChevronRight } from "react-icons/fi";
import { apiGet } from "../lib/api.js";
import { navigate } from "../hooks/useHashRoute.js";

export function Registry() {
  const [properties, setProperties] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => { apiGet("/properties").then(setProperties).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) =>
        p.ulpin.toLowerCase().includes(q) ||
        p.current_owner.toLowerCase().includes(q) ||
        (p.survey_number || "").toLowerCase().includes(q)
    );
  }, [properties, query]);

  return (
    <div>
      <p className="mb-6 max-w-xl text-sm text-zinc-400">
        Every parcel currently in the system — the full database, not a sample.
        Click a row for its complete chain-of-custody.
      </p>

      <div className="relative mb-5 max-w-md">
        <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ULPIN, owner, or survey number…"
          className="w-full rounded-lg border border-white/10 bg-base-800 py-2.5 pl-10 pr-3.5 font-mono text-sm text-white placeholder-zinc-600 outline-none transition-shadow focus:border-accent/50 focus:shadow-glow-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-medium">ULPIN</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Survey No.</th>
              <th className="px-4 py-3 font-medium">Area (sqm)</th>
              <th className="px-4 py-3 font-medium">Registration Office</th>
              <th className="w-8 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.ulpin}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  onClick={() => navigate("/registry/" + encodeURIComponent(p.ulpin))}
                  whileHover={{ x: 2 }}
                  className="group cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-accent/[0.05]"
                >
                  <td className="px-4 py-3 font-mono text-xs text-accent">{p.ulpin}</td>
                  <td className="px-4 py-3 text-zinc-200">{p.current_owner}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.survey_number}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.area_sqm}</td>
                  <td className="px-4 py-3 text-zinc-500">{p.registration_office}</td>
                  <td className="px-4 py-3 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                    <FiChevronRight className="h-4 w-4 text-accent" />
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="mt-4 text-sm text-zinc-500">No matches.</p>}
    </div>
  );
}
