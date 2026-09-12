import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import mockData from "../../data/land-registry-ui-mock-data.json" with { type: "json" };
import { formatDate } from "../../lib/utils.js";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  KeyRound,
  ShieldCheck,
  Building2,
  FileCheck2,
  ArrowRight
} from "lucide-react";

export function Succession() {
  const { user, isDeceased } = useAuth();
  const successionCases = mockData.succession_cases || [
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
      steps: [
        { label: "Death Certificate Verification", status: "COMPLETED", date: "2026-01-15" },
        { label: "Statutory Heir Public Notice (30 Days)", status: "COMPLETED", date: "2026-02-15" },
        { label: "Sub-Registrar Adjudication", status: "PENDING", date: null },
        { label: "Key Rotation & Title Re-Issuance", status: "AWAITING_STEP", date: null },
      ],
      documents: [
        { name: "Official Death Certificate", id: "DC-2026-0918", verified: true },
        { name: "Legal Heir Affidavit", id: "LHA-2026-012", verified: true },
        { name: "Surviving Member Certificate", id: "SMC-2026-004", verified: true },
      ]
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
      steps: [
        { label: "Death Certificate Verification", status: "COMPLETED", date: "2025-08-10" },
        { label: "Statutory Heir Public Notice (30 Days)", status: "COMPLETED", date: "2025-09-10" },
        { label: "Sub-Registrar Adjudication", status: "COMPLETED", date: "2025-09-15" },
        { label: "Key Rotation & Title Re-Issuance", status: "COMPLETED", date: "2025-09-16" },
      ],
      documents: [
        { name: "Death Certificate", id: "DC-2025-4412", verified: true },
        { name: "Final Mutation Decree", id: "FMD-2025-091", verified: true }
      ]
    }
  ];

  const [activeCaseId, setActiveCaseId] = useState("SUC-2026-001");
  const activeCase = successionCases.find((c) => c.case_id === activeCaseId) || successionCases[0];

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      {/* Header */}
      <div className="border-b border-[#EAECF0] pb-4">
        <h1 className="text-2xl font-bold text-[#101828]">
          Succession, Legal Heir Mutation & Key Rotation Desk
        </h1>
        <p className="mt-1 text-xs text-[#475467]">
          Statutory proceedings under Indian Succession Act 1925 for title inheritance, credential revocation, and heir activation.
        </p>
      </div>

      {/* Deceased Identity Notice if applicable */}
      {isDeceased && (
        <div className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-5 text-xs text-[#B42318] space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#D92D20] mt-0.5" />
            <div>
              <span className="font-bold text-sm text-[#D92D20]">
                DECEASED RECORD PROCEEDING (SCN-04 / SCN-05)
              </span>
              <p className="mt-1 text-[#7A271A] leading-relaxed">
                You are logged in as registered owner <strong>Mohan Nair (USR-DEAD-001)</strong>.
                All transfer petitions and Sell Key issuance are locked by statutory protocol.
                Legal heir <strong>Rohan Nair (USR-SUC-001)</strong> is designated as the petitioner in active case <strong>SUC-2026-001</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Case Selector Tabs */}
      <div className="flex items-center gap-2">
        {successionCases.map((c) => (
          <button
            key={c.case_id}
            onClick={() => setActiveCaseId(c.case_id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeCaseId === c.case_id
                ? "bg-[#0B3A67] text-white shadow-sm"
                : "bg-white border border-[#D0D5DD] text-[#344054] hover:bg-[#F8FAFC]"
            }`}
          >
            <span>{c.case_id} ({c.status})</span>
          </button>
        ))}
      </div>

      {/* Active Case Hero Card */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAECF0] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-xl font-bold text-[#0B3A67]">
                {activeCase.case_id}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  activeCase.status === "MUTATION_COMPLETED"
                    ? "bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]"
                    : "bg-[#FFFBEB] text-[#B54708] border border-[#FDE68A]"
                }`}
              >
                {activeCase.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#475467]">
              Cadastral Target: <Link to={`/citizen/properties/${activeCase.ulpin}`} className="font-mono font-bold text-[#0B3A67] underline">{activeCase.ulpin}</Link>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs bg-[#F8FAFC] p-3 rounded-lg border border-[#EAECF0]">
            <div>
              <span className="text-[#667085] block">Deceased Owner:</span>
              <span className="font-bold text-[#101828]">{activeCase.deceased_name}</span>
              <span className="font-mono text-[10px] text-[#667085] block">{activeCase.deceased_user_id}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Designated Successor:</span>
              <span className="font-bold text-[#027A48]">{activeCase.successor_name}</span>
              <span className="font-mono text-[10px] text-[#667085] block">{activeCase.successor_user_id}</span>
            </div>
          </div>
        </div>

        {/* Stepper Progression */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
            Statutory Adjudication Stepper
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {activeCase.steps.map((step, idx) => {
              const isDone = step.status === "COMPLETED";
              const isPending = step.status === "PENDING";
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                    isDone
                      ? "border-[#A6F4C5] bg-[#F6FEF9]"
                      : isPending
                      ? "border-[#FDE68A] bg-[#FFFBEB]"
                      : "border-[#EAECF0] bg-[#F8FAFC] text-[#98A2B3]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-[#027A48]" />
                    ) : isPending ? (
                      <Clock className="h-4 w-4 text-[#B54708] animate-pulse" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-[#D0D5DD] flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                    )}
                    <span className={isDone ? "text-[#027A48]" : isPending ? "text-[#B54708]" : "text-[#667085]"}>
                      Step {idx + 1}
                    </span>
                  </div>
                  <div className="font-semibold text-[#101828] text-[11px]">
                    {step.label}
                  </div>
                  {step.date && (
                    <div className="text-[10px] text-[#667085] font-mono">
                      {formatDate(step.date)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cryptographic Key Revocation & Rotation Box */}
        <div className="rounded-xl border border-[#BAE6FD] bg-[#F0F9FF] p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#026AA2]">
            <KeyRound className="h-4 w-4" />
            <span>Cryptographic Key Revocation & Rotation Guardrail</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
            <div className="p-3 bg-white rounded-lg border border-[#BAE6FD]">
              <span className="font-bold text-[#B42318] block">Old Key Status: REVOKED</span>
              <p className="text-[#475467] mt-0.5">
                The cryptographic private signing key of deceased owner Mohan Nair is permanently blacklisted in the HSM registry.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-[#BAE6FD]">
              <span className="font-bold text-[#027A48] block">
                {activeCase.status === "MUTATION_COMPLETED" ? "Successor Key: ROTATED & ACTIVE" : "Successor Key: PENDING REGISTRAR MINT"}
              </span>
              <p className="text-[#475467] mt-0.5">
                {activeCase.status === "MUTATION_COMPLETED"
                  ? "Rohan Nair has received active titleholder signing credentials for this parcel."
                  : "New cryptographic credentials will be provisioned once the Sub-Registrar seals the mutation decree."}
              </p>
            </div>
          </div>
        </div>

        {/* Verified Documents Checklist */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
            Verified Statutory Documents ({activeCase.documents.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeCase.documents.map((doc, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-[#D0D5DD] bg-white flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-[#0B3A67]" />
                  <div>
                    <span className="font-semibold text-[#101828] block">{doc.name}</span>
                    <span className="font-mono text-[10px] text-[#667085]">{doc.id}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#027A48] bg-[#ECFDF3] px-2 py-0.5 rounded">
                  VERIFIED
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Succession;
