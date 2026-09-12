import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export function AccessDenied() {
  const { user, isCitizen, isRegistrar, isAuditor, isBank, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const message = location.state?.message || "You do not have the required role or administrative credentials to access this portal or resource.";
  const attemptedPortal = location.state?.attemptedPortal || "Restricted Area";

  let homePath = "/";
  if (isRegistrar) homePath = "/registrar/dashboard";
  else if (isAuditor) homePath = "/auditor/dashboard";
  else if (isBank) homePath = "/bank/dashboard";
  else if (isCitizen) homePath = "/citizen/dashboard";

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-6 text-[#1D2939]">
      <div className="w-full max-w-md rounded-2xl border border-[#D0D5DD] bg-white p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF3F2] text-[#D92D20]">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <span className="inline-block rounded-full bg-[#FEF3F2] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#B42318]">
          403 Access Forbidden
        </span>

        <h1 className="mt-3 text-2xl font-bold text-[#101828]">Access Restricted</h1>
        <p className="mt-2 text-sm text-[#475467] leading-relaxed">
          {message}
        </p>

        {user && (
          <div className="mt-4 rounded-lg bg-[#F8F9FA] p-3 text-left text-xs border border-[#EAECF0]">
            <p className="font-semibold text-[#344054]">Active Session:</p>
            <p className="text-[#475467]">{user.name} ({user.id})</p>
            <p className="text-[#475467]">Roles: {user.roles?.join(", ") || "None"}</p>
            {user.account_status && (
              <p className="text-[#475467]">Status: <span className="font-medium text-[#B42318]">{user.account_status}</span></p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            to={homePath}
            className="w-full rounded-lg bg-[#0B3A67] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#082949] transition-colors"
          >
            Return to Authorized Dashboard
          </Link>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="w-full rounded-lg border border-[#D0D5DD] bg-white px-4 py-2 text-sm font-medium text-[#475467] hover:bg-[#F9FAFB] transition-colors"
          >
            Switch Account / Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccessDenied;
