import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ShieldCheck, User, LogOut, Lock, Globe } from "lucide-react";

/**
 * Modern Indian Government Portal Top Header
 * Features 3px Tricolour strip (#FF9933 / #FFFFFF / #138808), State Seal,
 * Portal designation and session authentication controls.
 */
export function GovHeader({ portal = "public" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-[#D0D5DD] shadow-sm">
      {/* 3px National Tricolour Accent Strip */}
      <div className="flex h-[3px] w-full">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-[#FFFFFF]" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Emblem & Portal Identity */}
        <Link to="/" className="flex items-center gap-3.5 group focus:outline-none">
          {/* Government Emblem Symbol */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B3A67] text-white font-bold shadow-sm group-hover:bg-[#1769AA] transition-colors">
            <svg
              className="h-6 w-6 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18l6 2.25v4.66c0 4.1-2.56 7.91-6 8.91-3.44-1-6-4.81-6-8.91V6.43l6-2.25zM11 7v2h2V7h-2zm0 4v6h2v-6h-2z" />
            </svg>
          </div>

          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight text-[#101828]">
                TitleLock
              </span>
              <span className="hidden sm:inline-block rounded-full bg-[#F0FDFA] px-2 py-0.5 text-[10px] font-semibold text-[#0F766E] border border-[#99F6E4]">
                .GOV.IN SPEC
              </span>
            </div>
            <p className="text-xs text-[#475467] font-medium leading-none">
              Department of Land Records · Government of India
            </p>
          </div>
        </Link>

        {/* Center: Active Portal Badge */}
        <div className="hidden md:flex items-center gap-2">
          {portal === "public" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8FAFC] border border-[#D0D5DD] px-3 py-1 text-xs font-medium text-[#344054]">
              <Globe className="h-3.5 w-3.5 text-[#667085]" />
              Public Cadastral Directory
            </span>
          )}
          {portal === "citizen" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FDFA] border border-[#99F6E4] px-3 py-1 text-xs font-semibold text-[#0F766E]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Citizen Titleholder Workspace
            </span>
          )}
          {portal === "registrar" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF2F2] border border-[#FECACA] px-3 py-1 text-xs font-semibold text-[#B42318]">
              <Lock className="h-3.5 w-3.5" />
              Sub-Registrar Official Desk (Audited)
            </span>
          )}
        </div>

        {/* Right: Auth Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-[#101828] leading-tight">
                  {user.name}
                </div>
                <div className="text-[10px] font-mono text-[#667085] leading-tight">
                  {user.badge || user.roles?.[0] || "CITIZEN"}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC] hover:text-[#101828] hover-lift focus:outline-none"
                title="Sign out of session"
              >
                <LogOut className="h-3.5 w-3.5 text-[#667085]" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth/citizen"
                className="inline-flex items-center justify-center rounded-md bg-[#0B3A67] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1769AA] hover-lift focus:outline-none shadow-sm"
              >
                Sign in to view more
              </Link>
              <Link
                to="/auth/registrar"
                className="hidden sm:inline-flex items-center justify-center rounded-md border border-[#D0D5DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC] focus:outline-none"
              >
                Official Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
