import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { UserCheck, Shield, Repeat, RotateCcw } from "lucide-react";

export function AuditorAccount() {
  const { user, switchWorkspace, resetDemoData } = useAuth();
  const canSwitchToRegistrar = Array.isArray(user?.roles) && user.roles.includes("REGISTRAR");

  const handleReset = () => {
    if (window.confirm("Reset all synthetic demo data back to clean fixture default?")) {
      resetDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">State Auditor Profile & Credentials</h1>
          <p className="mt-1 text-xs text-[#475467]">
            Official oversight credentials registered with the State Land Audit Directorate.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-4 py-2 text-xs font-semibold text-[#B42318] hover:bg-[#FEF2F2] shadow-sm self-start sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Demo State</span>
        </button>
      </div>

      <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-[#EAECF0] pb-5">
          <div className="h-16 w-16 rounded-full bg-[#0E7090] text-white flex items-center justify-center font-bold text-xl">
            {user?.name?.slice(0, 2).toUpperCase() || "AD"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#101828]">{user?.name}</h2>
              <span className="font-mono text-xs bg-[#ECFEFF] text-[#0E7090] border border-[#BAE6FD] px-2 py-0.5 rounded font-bold">
                {user?.badge || "AUD-0094"}
              </span>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">{user?.designation || "Senior Title Auditor"} · State Audit Directorate</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
            <span className="text-[#667085] block">Auditor ID:</span>
            <span className="font-mono font-bold text-[#101828]">{user?.id}</span>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
            <span className="text-[#667085] block">Oversight Scope:</span>
            <span className="font-semibold text-[#101828]">Statewide Cadastral & Statutory Compliance</span>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
            <span className="text-[#667085] block">Access Clearance:</span>
            <span className="font-bold text-[#027A48]">IMMUTABLE READ-ONLY</span>
          </div>
        </div>

        {canSwitchToRegistrar && (
          <div className="p-4 bg-[#F0F7FF] rounded-xl border border-[#B9D5F4] flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold text-[#0B3A67]">Dual-Role Official Clearance</span>
              <p className="text-[#475467]">You also hold Sub-Registrar credentials. Switch to Registrar adjudication desk.</p>
            </div>
            <button
              onClick={() => switchWorkspace("REGISTRAR")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA]"
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>Switch to Registrar Desk</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditorAccount;
