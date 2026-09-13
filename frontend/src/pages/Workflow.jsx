import { useState } from "react";
import { apiPost } from "../lib/api.js";
import { walletCredentialService } from "../services/walletCredentialService.js";
import { ethers } from "ethers";
import { useAuth } from "../context/AuthContext.jsx";
import { Link } from "react-router-dom";
import { KeyRound, ShieldCheck, ArrowRight } from "lucide-react";

const input = "w-full rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 font-mono text-sm text-[#101828] outline-none focus:border-[#0B3A67] focus:ring-1 focus:ring-[#0B3A67] transition-all";

export function WorkflowPage() {
  const auth = useAuth();
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
  const [privateKey, setPrivateKey] = useState("");
  const [sellToken, setSellToken] = useState("");
  
  const approve = async () => {
    setError(""); setBusy(true);
    try { 
      if (auth.user.role === "OWNER") {
        if (!privateKey) throw new Error("Private key is required for simulated wallet signing");
        // 1. Request challenge
        const challenge = await walletCredentialService.requestTransferApprovalChallenge(transfer.transfer_id, auth.token);
        // 2. Sign EIP-712 payload
        const wallet = new ethers.Wallet(privateKey);
        const signature = await wallet.signTypedData(
          challenge.typed_data.domain,
          challenge.typed_data.types,
          challenge.typed_data.message
        );
        // 3. Submit signature
        const updated = await walletCredentialService.submitTransferApprovalSignature(challenge.challenge_id, signature, auth.token);
        setTransfer(updated);
      } else {
        setTransfer(await apiPost(`/v2/transfers/${transfer.transfer_id}/approve`, { sell_token: sellToken || undefined }, auth.token)); 
      }
    }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const submit = async () => {
    setError(""); setBusy(true);
    try { setTransfer((await apiPost(`/v2/transfers/${transfer.transfer_id}/submit`, {}, auth.token)).transfer); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const steps = ["OWNER_APPROVAL", "REGISTRAR_REVIEW", "BUYER_ACCEPTANCE", "READY_TO_COMMIT"];
  
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-slide-up">
      <div className="flex items-center justify-between border-b border-[#EAECF0] pb-5 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Transfer Petition Workflow</h1>
          <p className="mt-1 text-sm text-[#475467]">Initiate and authorize statutory conveyance petitions.</p>
        </div>
        <Link to="/registrar/transfers" className="text-sm font-semibold text-[#0B3A67] hover:underline">
          &larr; Back to Queue
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[#D0D5DD] bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-[#0B3A67]" />
            <h2 className="text-lg font-semibold text-[#101828]">Multi-Party Lock</h2>
          </div>
          <p className="text-sm text-[#475467] mb-5">
            Creates an operational workflow. Each active owner, then the registrar, then the named buyer must act before it can be committed.
          </p>
          {!auth.user ? (
            <div className="rounded-lg bg-[#FEF3F2] border border-[#FECDCA] p-4 text-sm text-[#B42318] font-medium">
              Sign in as an owner or registrar to create a workflow.
            </div>
          ) : (
            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1 uppercase tracking-wider">Cadastral Target (ULPIN)</label>
                <input className={input} value={parcelId} onChange={(e) => setParcelId(e.target.value)} placeholder="Parcel ID" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1 uppercase tracking-wider">Named Buyer Identity</label>
                <input className={input} value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="e.g. buyer1" />
              </div>
              <button disabled={busy} className="w-full rounded-lg bg-[#0B3A67] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1769AA] disabled:opacity-50 transition-colors">
                {busy ? "Working…" : "Create Transfer Workflow"}
              </button>
            </form>
          )}
          {error && <p className="mt-4 rounded-lg border border-[#FECDCA] bg-[#FEF3F2] p-3 text-sm text-[#B42318]">{error}</p>}
        </section>

        <section className="rounded-xl border border-[#D0D5DD] bg-white shadow-sm p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-[#101828] mb-5">Authorization Status</h2>
          {!transfer ? (
            <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-[#D0D5DD] bg-[#F9FAFB] p-6 text-center text-sm text-[#667085]">
              Create a transfer to view its lock state.
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="mb-4">
                <div className="text-xs font-semibold text-[#475467] uppercase tracking-wider mb-1">Request ID</div>
                <div className="font-mono text-sm font-bold text-[#0B3A67] bg-[#EFF8FF] border border-[#B9D5F4] rounded px-2 py-1 inline-block">
                  {transfer.transfer_id}
                </div>
              </div>
              <div className="mb-5">
                <div className="text-xs font-semibold text-[#475467] uppercase tracking-wider mb-1">Current State</div>
                <div className="text-lg font-bold text-[#101828]">{transfer.status.replace(/_/g, " ")}</div>
              </div>
              
              <div className="space-y-3 mb-6">
                {steps.map((step) => (
                  <div key={step} className={`rounded-lg border p-3 text-sm transition-colors ${transfer.status === step ? "border-[#0B3A67] bg-[#EFF8FF]" : "border-[#EAECF0] bg-[#F9FAFB] opacity-60"}`}>
                    <span className={`font-mono text-xs font-bold ${transfer.status === step ? "text-[#0B3A67]" : "text-[#667085]"}`}>{step}</span>
                    {step === "OWNER_APPROVAL" && <div className="mt-1 text-[#344054] font-medium">{transfer.approvals?.length || 0}/{transfer.required_approvals} owner approvals</div>}
                    {step === "REGISTRAR_REVIEW" && transfer.registrar_approval && <div className="mt-1 text-[#027A48] font-medium">Approved by {transfer.registrar_approval.actor}</div>}
                    {step === "BUYER_ACCEPTANCE" && <div className="mt-1 text-[#344054]">Buyer: <span className="font-semibold">{transfer.buyer}</span></div>}
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                {auth.user?.role === "OWNER" && transfer.status === "OWNER_APPROVAL" && (
                  <div className="space-y-3 rounded-lg border border-[#B9D5F4] bg-[#EFF8FF] p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B3A67] uppercase tracking-wider">
                      <KeyRound className="h-4 w-4" />
                      Simulated Wallet: Sign EIP-712
                    </div>
                    <input className={input} type="password" value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} placeholder="0x... (Private Key)" />
                    <button onClick={approve} disabled={busy || !privateKey} className="w-full rounded-lg bg-[#0B3A67] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1769AA] disabled:opacity-50 transition-colors">
                      Sign & Approve as {auth.user.role}
                    </button>
                  </div>
                )}
                {auth.user && auth.user.role !== "OWNER" && transfer.status !== "READY_TO_COMMIT" && transfer.status !== "COMPLETED" && (
                  <div className="space-y-3">
                    {transfer.status === "OWNER_APPROVAL" && (
                      <div className="rounded-lg border border-[#D0D5DD] p-4 bg-[#F9FAFB]">
                        <label className="block text-xs font-semibold text-[#344054] mb-2 uppercase tracking-wider">
                          Owner Sell Token (Override EIP-712)
                        </label>
                        <input className={input} value={sellToken} onChange={(e) => setSellToken(e.target.value)} placeholder="SELL-TOKEN-..." />
                        <p className="mt-2 text-[11px] text-[#667085]">Enter the cryptographic sell token generated by the owner to satisfy their approval offline.</p>
                      </div>
                    )}
                    <button onClick={approve} disabled={busy} className="w-full rounded-lg border border-[#D0D5DD] bg-white py-2.5 text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors">
                      Approve as {auth.user.role}
                    </button>
                  </div>
                )}
                {auth.user?.role === "REGISTRAR" && transfer.status === "READY_TO_COMMIT" && (
                  <button onClick={submit} disabled={busy} className="w-full rounded-lg bg-[#027A48] border border-[#039855] py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#039855] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    Submit & Confirm Ledger Event <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
