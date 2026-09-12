import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { ShieldAlert, ArrowLeft, LogOut, Home, Landmark } from "lucide-react";

/**
 * UnauthorizedPage: Clean White Government Theme Access Control Notice.
 */
export function UnauthorizedPage() {
  const { user, isCitizen, isRegistrar, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const attemptedPortal = location.state?.attemptedPortal || "Restricted Portal";

  const handleSwitchUser = () => {
    logout();
    navigate("/auth/citizen");
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] text-[#101828] flex flex-col justify-between select-none">
      {/* 3px Tricolour strip */}
      <div className="flex h-[3px] w-full">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-[#FFFFFF]" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-[#D0D5DD] bg-white p-8 text-center space-y-5 shadow-card animate-fade-slide-up">
          {/* Alert Icon */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF2F2] text-[#B42318] border border-[#FECACA]">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <div className="space-y-1.5">
            <span className="rounded-full bg-[#FEF2F2] border border-[#FECACA] px-3 py-0.5 text-[10px] font-bold text-[#B42318] uppercase tracking-wider">
              Access Control Enforcement
            </span>
            <h1 className="text-xl font-bold text-[#101828]">
              Unauthorized Portal Access
            </h1>
            <p className="text-xs text-[#475467] leading-relaxed">
              Your session does not hold the clearance required to view{" "}
              <span className="font-semibold text-[#101828]">{attemptedPortal}</span>.
            </p>
          </div>

          {/* User Session Info */}
          {user && (
            <div className="rounded-md border border-[#D0D5DD] bg-[#F7F9FC] p-3 text-xs text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-[#667085]">Active Session:</span>
                <span className="font-semibold text-[#101828]">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Role Assigned:</span>
                <span className="font-mono text-[#0B3A67]">{(user.roles || []).join(", ")}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            {isCitizen && (
              <Link
                to="/citizen/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA] shadow-sm"
              >
                <Home className="h-4 w-4" />
                <span>Return to Citizen Dashboard</span>
              </Link>
            )}

            {isRegistrar && (
              <Link
                to="/registrar/transfer-desk"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0B3A67] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1769AA] shadow-sm"
              >
                <Landmark className="h-4 w-4" />
                <span>Return to Transfer Desk</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleSwitchUser}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[#D0D5DD] bg-white px-4 py-2 text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC]"
            >
              <LogOut className="h-4 w-4 text-[#667085]" />
              <span>Sign In as Another User</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#F2F4F7]">
            <Link to="/" className="text-xs font-semibold text-[#0B3A67] hover:underline">
              ← Return to Public Cadastral Map
            </Link>
          </div>
        </div>
      </div>

      <footer className="py-3 text-center text-xs text-[#667085] border-t border-[#D0D5DD] bg-white">
        Department of Land Records · Government of India
      </footer>
    </div>
  );
}
