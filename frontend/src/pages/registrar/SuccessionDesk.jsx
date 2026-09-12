import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import mockData from "../../data/land-registry-ui-mock-data.json" with { type: "json" };
import { appendDemoAuditEvent } from "../../lib/store.js";
import { formatDate } from "../../lib/utils.js";
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  KeyRound,
  ShieldCheck,
  Building2,
  ArrowLeft,
  ArrowRight
} from "lucide-react";

export function SuccessionDesk() {
  const { caseId: paramCaseId } = useParams();
  const { user, isRestricted } = useAuth();

  const [cases, setCases] = useState([
    {
      case_id: "SUC-2026-001",
      ulpin: "UP-GNO-0003-SUCCESSION",
      deceased_user_id: "USR-DEAD-001",
      deceased_name: "Mohan Nair",
      successor_user_id: "USR-SUC-001",
      successor_name: "Rohan Nair",
      status: "HEIR_REVIEW_PENDING",
      death_cert_verified: true,
      old_key_revoked: true,
      successor_key_rotated: false,
    },
    {
      case_id: "SUC-2025-014",
      ulpin: "UP-GNO-0004-SUCCESSION-COMPLETE",
      deceased_user_id: "USR-DEAD-002",
      deceased_name: "Suresh Rao",
      successor_user_id: "USR-OWN-004",
      successor_name: "Vikram Singh",
      status: "MUTATION_COMPLETED",
      death_cert_verified: true,
      old_key_revoked: true,
      successor_key_rotated: true,
    },
  ]);

  const activeCaseId = paramCaseId || "SUC-2026-001";
  const activeCase = cases.find((c) => c.case_id === activeCaseId) || cases[0];
  const [successMsg, setSuccessMsg] = useState("");

  const handleCertifySuccession = (caseId) => {
    if (isRestricted) {
      alert("RESTRICTED ADMINISTRATIVE MODE: Dual-role constraints prevent finalizing succession mutations.");
      return;
    }

    setCases((prev) =>
      prev.map((c) =>
        c.case_id === caseId
          ? { ...c, status: "MUTATION_COMPLETED", successor_key_rotated: true }
          : c
      )
    );

    appendDemoAuditEvent({
      action: "SUCCESSION_MUTATION_CERTIFIED",
      ulpin: activeCase.ulpin,
      actor_id: user?.badge || "GOV-REG-0182",
      details: `Succession case ${caseId} certified. Title transferred to heir ${activeCase.successor_name} (${activeCase.successor_user_id}).`,
    });

    setSuccessMsg(`Case ${caseId} certified! Key rotated to ${activeCase.successor_name}.`);
  };

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            Succession Adjudication & Heir Mutation Desk
          </h1>
          <p className="text-xs text-[#475467]">
            Official Sub-Registrar hearing for legal heir mutation, private key blacklisting, and title rotation under Indian Succession Act 1925.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-[#ECFDF3] border border-[#A6F4C5] rounded-xl text-xs font-semibold text-[#027A48] flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="underline">Dismiss</button>
        </div>
      )}

      {/* Case Selector Tabs */}
      <div className="flex items-center gap-2">
        {cases.map((c) => (
          <Link
            key={c.case_id}
            to={`/registrar/succession/${c.case_id}`}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeCaseId === c.case_id
                ? "bg-[#0B3A67] text-white shadow-sm"
                : "bg-white border border-[#D0D5DD] text-[#344054] hover:bg-[#F8FAFC]"
            }`}
          >
            <span>{c.case_id} ({c.status})</span>
          </Link>
        ))}
      </div>

      {/* Adjudication Hero Card */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAECF0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-[#0B3A67]">
                {activeCase.case_id}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  activeCase.status === "MUTATION_COMPLETED"
                    ? "bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]"
                    : "bg-[#FFFBEB] text-[#B54708] border border-[#FDE68A]"
                }`}
              >
                {activeCase.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#475467]">
              Cadastral Target: <Link to={`/registrar/parcels/${activeCase.ulpin}`} className="font-mono font-bold text-[#0B3A67] underline">{activeCase.ulpin}</Link>
            </p>
          </div>

          <div className="text-right text-xs">
            <span className="text-[#667085] block">Deceased Titleholder:</span>
            <span className="font-bold text-[#101828]">{activeCase.deceased_name} ({activeCase.deceased_user_id})</span>
          </div>
        </div>

        {/* Legal Heir Adjudication Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-[#F8FAFC] p-4 rounded-xl border border-[#EAECF0]">
          <div>
            <span className="text-[#667085] block">Petitioner / Successor:</span>
            <span className="font-bold text-[#027A48] text-sm">{activeCase.successor_name}</span>
            <span className="font-mono text-[10px] text-[#667085] block">{activeCase.successor_user_id}</span>
          </div>
          <div>
            <span className="text-[#667085] block">Death Cert Verification:</span>
            <span className="text-[#027A48] font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Verified with Civil Registrar</span>
            </span>
          </div>
          <div>
            <span className="text-[#667085] block">Old Signing Key:</span>
            <span className="text-[#B42318] font-bold">REVOKED & BLACKLISTED</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-[#EAECF0] flex items-center justify-between">
          <span className="text-xs text-[#667085]">
            Officer Authority: <strong className="text-[#101828]">{user?.badge || "GOV-REG-0182"}</strong>
          </span>

          {activeCase.status !== "MUTATION_COMPLETED" ? (
            <button
              onClick={() => handleCertifySuccession(activeCase.case_id)}
              disabled={isRestricted}
              className="rounded-lg bg-[#027A48] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#054F31] shadow-sm flex items-center gap-1.5 disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Certify Mutation Decree & Provision Key</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#027A48]">
              <CheckCircle2 className="h-4 w-4" />
              <span>Mutation Finalized & Sealed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SuccessionDesk;
