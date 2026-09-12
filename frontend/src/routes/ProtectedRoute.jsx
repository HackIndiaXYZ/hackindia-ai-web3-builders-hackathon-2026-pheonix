import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Route guard enforcing role and portal boundaries.
 * - Redirects unauthenticated users to the portal's login page preserving target location.
 * - Handles DECEASED citizen routing exclusively to /citizen/succession (SCN-04).
 * - Preserves RESTRICTED sessions for read-only adjudication with banners (SCN-16).
 * - Redirects cross-portal unauthorized access to /403.
 */
export function ProtectedRoute({ portal = "citizen", allowedRoles, children }) {
  const { user, isAuthenticated, loading, activeRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F7F9FC] text-[#344054]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0B3A67] border-t-transparent" />
          <span className="text-xs text-[#667085]">Verifying session authority...</span>
        </div>
      </div>
    );
  }

  // 1. Not authenticated -> Redirect to matching login page preserving return path
  if (!isAuthenticated || !user) {
    let targetLogin = "/auth/citizen";
    if (portal === "registrar") targetLogin = "/auth/registrar";
    else if (portal === "auditor") targetLogin = "/auth/auditor";
    else if (portal === "bank") targetLogin = "/auth/bank";
    return <Navigate to={targetLogin} state={{ from: location }} replace />;
  }

  const userRoles = Array.isArray(user.roles) ? user.roles : [];

  // 2. Deceased Account Gate (SCN-04 / SCN-05)
  // Mohan Nair (USR-DEAD-001) is restricted to succession review only
  if (user.account_status === "DECEASED") {
    if (portal !== "citizen") {
      return <Navigate to="/403" state={{ message: "Deceased account records cannot access departmental portals." }} replace />;
    }
    // In citizen portal, allow /citizen/succession and /citizen/account, but redirect other pages to /citizen/succession
    const allowedDeceasedPaths = ["/citizen/succession", "/citizen/account"];
    if (!allowedDeceasedPaths.some(p => location.pathname.startsWith(p))) {
      return <Navigate to="/citizen/succession" replace />;
    }
  }

  // 3. Portal / Role Authorization
  if (portal === "citizen") {
    const isCitizen = userRoles.some((r) => ["OWNER", "BUYER", "NOMINEE"].includes(r));
    if (!isCitizen) {
      return (
        <Navigate
          to="/403"
          state={{
            attemptedPortal: "Citizen Portal",
            message: "Your departmental credentials are not provisioned for citizen private title access.",
            suggestedUrl: userRoles.includes("REGISTRAR") ? "/registrar/dashboard" : userRoles.includes("AUDITOR") ? "/auditor/dashboard" : "/bank/dashboard"
          }}
          replace
        />
      );
    }
  } else if (portal === "registrar") {
    if (!userRoles.includes("REGISTRAR")) {
      return (
        <Navigate
          to="/403"
          state={{
            attemptedPortal: "Registrar Portal",
            message: "Sub-Registrar authorization required. Employee credentials not recognized.",
            suggestedUrl: "/auth/registrar"
          }}
          replace
        />
      );
    }
  } else if (portal === "auditor") {
    if (!userRoles.includes("AUDITOR")) {
      return (
        <Navigate
          to="/403"
          state={{
            attemptedPortal: "Auditor Portal",
            message: "State Land Audit Directorate credentials required.",
            suggestedUrl: "/auth/auditor"
          }}
          replace
        />
      );
    }
  } else if (portal === "bank") {
    if (!userRoles.includes("BANK")) {
      return (
        <Navigate
          to="/403"
          state={{
            attemptedPortal: "Bank Mortgage Desk",
            message: "Institutional credit officer credentials required.",
            suggestedUrl: "/auth/bank"
          }}
          replace
        />
      );
    }
  }

  // Explicit allowedRoles check if passed
  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      return (
        <Navigate
          to="/403"
          state={{
            attemptedPortal: portal,
            message: `Requires one of roles: ${allowedRoles.join(", ")}`,
          }}
          replace
        />
      );
    }
  }

  return children;
}

export default ProtectedRoute;
