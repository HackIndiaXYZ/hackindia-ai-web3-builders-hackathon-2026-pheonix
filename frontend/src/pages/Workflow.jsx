import { useState } from "react";
import { apiPost } from "../lib/api.js";

const input = "w-full rounded-lg border border-white/10 bg-base-800 px-3 py-2 font-mono text-sm text-white outline-none focus:border-accent/50";

export function WorkflowPage({ auth }) {
  const [parcelId, setParcelId] = useState("UP-0001-CLEAN");
  const [buyer, setBuyer] = useState("buyer1");
  const [transfer, setTransfer] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const create = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try { setTransfer(await apiPost("/v2/transfers", { parcel_id: parcelId, buyer, document_hash: "demo-document-hash", assessment_hash: "demo-assessment-hash" }, auth.token)); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const approve = async () => {
    setError(""); setBusy(true);
    try { setTransfer(await apiPost(`/v2/transfers/${transfer.transfer_id}/approve`, {}, auth.token)); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const submit = async () => {
    setError(""); setBusy(true);
    try { setTransfer((await apiPost(`/v2/transfers/${transfer.transfer_id}/submit`, {}, auth.token)).transfer); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const steps = ["OWNER_APPROVAL", "REGISTRAR_REVIEW", "BUYER_ACCEPTANCE", "READY_TO_COMMIT"];
  return <div className="grid gap-6 lg:grid-cols-2">
    <section className="rounded-xl border border-white/10 bg-base-900/50 p-6">
      <h1 className="text-lg font-semibold text-white">Multi-party transfer lock</h1>
      <p className="mt-2 text-sm text-zinc-400">Creates an operational workflow. Each active owner, then the registrar, then the named buyer must act before it can be committed.</p>
      {!auth.user ? <p className="mt-5 text-sm text-risk-flagged">Sign in as an owner or registrar to create a workflow.</p> :
        <form onSubmit={create} className="mt-5 space-y-3">
          <input className={input} value={parcelId} onChange={(e) => setParcelId(e.target.value)} placeholder="Parcel ID" />
          <input className={input} value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Named buyer identity" />
          <button disabled={busy} className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-black disabled:opacity-40">{busy ? "Working…" : "Create transfer workflow"}</button>
        </form>}
      {error && <p className="mt-4 rounded-lg border border-risk-high/30 bg-risk-high/5 p-3 text-sm text-risk-high">{error}</p>}
    </section>
    <section className="rounded-xl border border-accent/20 bg-base-900/50 p-6">
      <h2 className="text-sm font-semibold text-zinc-200">Authorization status</h2>
      {!transfer ? <p className="mt-5 text-sm text-zinc-500">Create a transfer to view its lock state.</p> : <>
        <div className="mt-4 font-mono text-xs text-accent">{transfer.transfer_id}</div>
        <div className="mt-2 text-lg font-semibold text-white">{transfer.status}</div>
        <div className="mt-5 space-y-3">{steps.map((step) => <div key={step} className={`rounded-lg border p-3 text-sm ${transfer.status === step ? "border-accent/50 bg-accent/10 text-white" : "border-white/10 text-zinc-500"}`}><span className="font-mono text-xs">{step}</span>{step === "OWNER_APPROVAL" && <div className="mt-1">{transfer.approvals.length}/{transfer.required_approvals} owner approvals</div>}{step === "REGISTRAR_REVIEW" && transfer.registrar_approval && <div className="mt-1">Approved by {transfer.registrar_approval.actor}</div>}{step === "BUYER_ACCEPTANCE" && <div className="mt-1">Buyer: {transfer.buyer}</div>}</div>)}</div>
        {auth.user?.role === "OWNER" && transfer.status === "OWNER_APPROVAL" && <p className="mt-5 rounded-lg border border-risk-flagged/30 bg-risk-flagged/5 p-3 text-xs text-risk-flagged">Owner approval must be signed by the linked wallet using the EIP-712 approval challenge API. This demo UI does not access private keys or browser wallets.</p>}
        {auth.user && auth.user.role !== "OWNER" && transfer.status !== "READY_TO_COMMIT" && transfer.status !== "COMPLETED" && <button onClick={approve} disabled={busy} className="mt-5 w-full rounded-lg border border-accent bg-accent/10 py-2.5 text-sm font-semibold text-accent disabled:opacity-40">Approve as {auth.user.role}</button>}
        {auth.user?.role === "REGISTRAR" && transfer.status === "READY_TO_COMMIT" && <button onClick={submit} disabled={busy} className="mt-5 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-black disabled:opacity-40">Submit and confirm ledger event</button>}
      </>}
    </section>
  </div>;
}
