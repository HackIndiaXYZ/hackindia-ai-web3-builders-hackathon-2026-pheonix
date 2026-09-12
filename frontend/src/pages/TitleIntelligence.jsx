import { useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";

export function TitleIntelligence({ ulpin }) {
  const [timeline, setTimeline] = useState([]); const [graph, setGraph] = useState(null); const [query, setQuery] = useState("");
  useEffect(() => { apiGet(`/parcels/${encodeURIComponent(ulpin)}/timeline?q=${encodeURIComponent(query)}`).then(setTimeline).catch(() => {}); }, [ulpin, query]);
  useEffect(() => { apiGet(`/parcels/${encodeURIComponent(ulpin)}/ownership-graph`).then(setGraph).catch(() => {}); }, [ulpin]);
  return <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <section className="rounded-xl border border-white/10 bg-base-900/50 p-5"><h2 className="text-sm font-semibold text-white">Chain of title</h2><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter events, people, hash…" className="mt-4 w-full rounded-lg border border-white/10 bg-base-800 px-3 py-2 text-sm text-white"/>
      <div className="mt-4 max-h-96 space-y-3 overflow-auto">{timeline.map((e, i) => <details key={i} className="border-l-2 border-accent/40 pl-3 text-sm"><summary className="cursor-pointer text-zinc-200">{e.timestamp?.slice(0,10) || "Unknown date"} · {e.event_type} · {e.source}</summary><div className="mt-2 space-y-1 text-xs text-zinc-400"><div>{e.seller || "—"} → {e.buyer || "—"}</div><div className="font-mono break-all">document {e.document_hash || "—"}</div>{e.blockchain_tx && <div className="font-mono break-all">tx {e.blockchain_tx}</div>}</div></details>)}</div>
    </section>
    <section className="rounded-xl border border-white/10 bg-base-900/50 p-5"><h2 className="text-sm font-semibold text-white">Ownership lineage</h2>{graph && <><div className="mt-4 flex flex-wrap gap-2">{graph.nodes.map((node) => <span key={node.id} className={`rounded-full px-3 py-1 text-xs ${node.kind === "CURRENT_OWNER" ? "bg-accent/20 text-accent" : "bg-white/5 text-zinc-300"}`}>{node.label}{node.share_percent ? ` · ${node.share_percent}%` : ""}</span>)}</div><div className="mt-5 space-y-2 text-xs text-zinc-500">{graph.edges.map((edge, i) => <div key={i}>{edge.from} → {edge.to} <span className="font-mono">{edge.timestamp?.slice(0,10)}</span></div>)}</div></>}</section>
  </div>;
}
