import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { UserCheck, ShieldCheck, Repeat, RotateCcw, AlertTriangle } from "lucide-react";

export function RegistrarAccount() {
  const { user, switchWorkspace, resetDemoData, isRestricted } = useAuth();
  const canSwitchToAuditor = Array.isArray(user?.roles) && user.roles.includes("AUDITOR");

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
          <h1 className="text-2xl font-bold text-[#101828]">
            Sub-Registrar Employee Credentials
          </h1>
          <p className="mt-1 text-xs text-[#475467]">
            Official badge registration, statutory adjudication jurisdiction, and dual-control settings.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-4 py-2 text-xs font-semibold text-[#B42318] hover:bg-[#FEF2F2] shadow-sm self-start sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Demo Data</span>
        </button>
      </div>

      {isRestricted && (
        <div className="rounded-xl border border-[#FECDCA] bg-[#FEF3F2] p-4 text-xs text-[#B42318] space-y-1">
          <div className="font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Dual-Role Constraints Active (SCN-16):</span>
          </div>
          <p>
            Role constraints: <code className="bg-white px-1 py-0.5 rounded font-mono">CANNOT_AUDIT_OWN_ACTIONS</code>, <code className="bg-white px-1 py-0.5 rounded font-mono">CANNOT_FINALIZE_OWN_TRANSFER</code>.
            Direct approvals are disabled in this registrar session.
          </p>
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-xl border border-[#D0D5DD] bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-[#EAECF0] pb-5">
          <div className="h-16 w-16 rounded-full bg-[#0B3A67] text-white flex items-center justify-center font-bold text-xl">
            {user?.name?.slice(0, 2).toUpperCase() || "SR"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#101828]">{user?.name}</h2>
              <span className="font-mono text-xs bg-[#EFF8FF] text-[#0B3A67] px-2 py-0.5 rounded font-bold">
                {user?.badge || "GOV-REG-0182"}
              </span>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">{user?.designation || "Sub-Registrar Grade I"} · Office of the Sub-Registrar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
            <span className="text-[#667085] block">Employee ID:</span>
            <span className="font-mono font-bold text-[#101828]">{user?.id}</span>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
            <span className="text-[#667085] block">Jurisdiction:</span>
            <span className="font-semibold text-[#101828]">Noida & Greater Noida (Sector 1-168)</span>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
            <span className="text-[#667085] block">Administrative Status:</span>
            <span className={`font-bold ${isRestricted ? "text-[#B42318]" : "text-[#027A48]"}`}>
              {user?.account_status || "ACTIVE"}
            </span>
          </div>
        </div>

        {/* Multi-role Workspace Switcher */}
        {canSwitchToAuditor && (
          <div className="p-4 bg-[#F0F7FF] rounded-xl border border-[#B9D5F4] flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold text-[#0B3A67]">Dual-Role Officer Authority</span>
              <p className="text-[#475467]">You hold simultaneous Auditor credentials. Switch workspaces anytime.</p>
            </div>
            <button
              onClick={() => switchWorkspace("AUDITOR")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA]"
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>Switch to Auditor Desk</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RegistrarAccount;
