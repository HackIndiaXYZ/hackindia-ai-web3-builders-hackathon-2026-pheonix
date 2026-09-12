import { useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";
import { navigate } from "../hooks/useHashRoute.js";

export function ParcelMap() {
  const [parcels, setParcels] = useState([]);
  useEffect(() => { apiGet("/properties").then(setParcels).catch(() => {}); }, []);
  return <div><h1 className="text-lg font-semibold text-white">Cadastral explorer</h1><p className="mt-1 text-sm text-zinc-400">Select a parcel to inspect ownership, title health and chain of title.</p><div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{parcels.map((p) => <button key={p.ulpin} onClick={() => navigate(`/registry/${encodeURIComponent(p.ulpin)}`)} className="rounded-xl border border-white/10 bg-base-900/50 p-5 text-left hover:border-accent/50"><div className="font-mono text-sm text-accent">{p.ulpin}</div><div className="mt-2 text-sm text-white">{p.area_sqm} sqm · {p.owners?.length || 1} owner(s)</div><div className="mt-3 h-16 rounded border border-accent/20 bg-accent/5"/><div className="mt-2 text-xs text-zinc-500">{p.frozen ? "Frozen" : "Boundary on file"}</div></button>)}</div></div>;
}
