import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { currentSession, login as apiLogin, logout as apiLogout, setUnauthorizedHandler } from "../lib/api.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "land_registry_token";

function usernameFor(identifier, role) {
  const value = String(identifier || "").trim().toLowerCase();
  if (role === "REGISTRAR") return value === "reg1" ? "reg1" : "registrar_noida2";
  if (role === "AUDITOR") return value === "auditor1" || value.includes("auditor") ? "auditor1" : value;
  if (role === "BANK") return value.includes("@") ? value.split("@")[0] : value;
  return value.includes("@") ? value.split("@")[0] : value;
}

function errorResult(error) {
  return { ok: false, error: error?.message || "Authentication failed. Please try again." };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
  };

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    if (!token) { setLoading(false); return undefined; }
    currentSession(token)
      .then((session) => {
        const liveUser = { ...session, roles: [session.role], active_role: session.role };
        setUser(liveUser);
      })
      .catch(clearSession)
      .finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, [token]);

  async function signIn(identifier, role) {
    try {
      const response = await apiLogin(usernameFor(identifier, role), role);
      const liveUser = { ...response, roles: [response.role], active_role: response.role };
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setUser(liveUser);
      return { ok: true, user: liveUser };
    } catch (error) {
      return errorResult(error);
    }
  }

  const value = useMemo(() => {
    const roles = user?.roles || [];
    return {
      user, token, loading, isAuthenticated: Boolean(token && user), roles,
      activeRole: user?.active_role || user?.role,
      isCitizen: roles.some((role) => ["OWNER", "BUYER", "NOMINEE"].includes(role)),
      isRegistrar: roles.includes("REGISTRAR"), isAuditor: roles.includes("AUDITOR"), isBank: roles.includes("BANK"),
      isDeceased: false, isRestricted: false,
      // Citizen identities may be an owner, buyer, or nominee. Let the server
      // directory select the assigned role instead of forcing every login to OWNER.
      loginCitizen: (identifier) => signIn(identifier, ""),
      loginRegistrar: (identifier) => signIn(identifier, "REGISTRAR"),
      loginAuditor: (identifier) => signIn(identifier, "AUDITOR"),
      loginBank: (identifier) => signIn(identifier, "BANK"),
      loginDigiLocker: (identifier) => signIn(identifier, "OWNER"),
      signup: async () => ({ ok: false, error: "Account provisioning is handled by the identity provider." }),
      switchWorkspace: async (role) => signIn(user?.username, role),
      logout: async () => { try { await apiLogout(token); } finally { clearSession(); } },
      resetDemoData: () => {},
    };
  }, [token, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
