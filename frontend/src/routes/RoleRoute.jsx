import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function RoleRoute({ roles = [], children }) {
  const { user, activeRole } = useAuth();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];

  const authorized = roles.some((r) => userRoles.includes(r) || activeRole === r);
  if (!authorized) {
    return (
      <Navigate
        to="/403"
        state={{
          message: `This workspace requires one of the following roles: ${roles.join(", ")}. Your active role is ${activeRole || "Unknown"}.`,
        }}
        replace
      />
    );
  }

  return children;
}

export default RoleRoute;
