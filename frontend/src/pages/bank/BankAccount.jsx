import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { Landmark, UserCheck, RotateCcw } from "lucide-react";

export function BankAccount() {
  const { user, resetDemoData } = useAuth();

  const handleReset = () => {
    if (window.confirm("Reset all synthetic demo state back to fixture default?")) {
      resetDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-slide-up">
      <div className="border-b border-[#EAECF0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">Credit Officer Profile & Clearances</h1>
          <p className="mt-1 text-xs text-[#475467]">
            Institutional lending authorization credentials registered with TitleLock CERSAI division.
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
          <div className="h-16 w-16 rounded-full bg-[#027A48] text-white flex items-center justify-center font-bold text-xl">
            BNK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#101828]">{user?.name || "Rahul Bansal"}</h2>
              <span className="font-mono text-xs bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5] px-2 py-0.5 rounded font-bold">
                INSTITUTIONAL BANK CLEARANCE
              </span>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">Credit & Mortgage Officer · State Bank Mortgage Division</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
            <span className="text-[#667085] block">Officer ID:</span>
            <span className="font-mono font-bold text-[#101828]">{user?.id || "USR-BANK-001"}</span>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
            <span className="text-[#667085] block">Institution:</span>
            <span className="font-semibold text-[#101828]">State Bank of India (Retail Assets)</span>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#EAECF0]">
            <span className="text-[#667085] block">CERSAI Portal Authority:</span>
            <span className="font-bold text-[#027A48]">ACTIVE (LEVEL 3)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BankAccount;
