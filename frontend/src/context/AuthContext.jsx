import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getSession,
  loginCitizen as mockLoginCitizen,
  loginRegistrar as mockLoginRegistrar,
  loginAuditor as mockLoginAuditor,
  loginBank as mockLoginBank,
  simulateDigiLocker as mockSimulateDigiLocker,
  createDemoCitizen as mockCreateDemoCitizen,
  switchWorkspace as mockSwitchWorkspace,
  logout as mockLogout,
} from "../services/mockAuth.js";
import { resetAllDemoData } from "../lib/store.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Synchronous initialisation to avoid blank flashes and bouncing redirects on hard refresh
  const [user, setUser] = useState(() => {
    try {
      return getSession();
    } catch (err) {
      console.error("Synchronous session restoration failed:", err);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const loginCitizen = useCallback(async (identifier, password) => {
    const res = await mockLoginCitizen(identifier, password);
    if (res.ok && res.user) {
      setUser(res.user);
    }
    return res;
  }, []);

  const loginRegistrar = useCallback(async (badge, email, password) => {
    const res = await mockLoginRegistrar(badge, email, password);
    if (res.ok && res.user) {
      setUser(res.user);
    }
    return res;
  }, []);

  const loginAuditor = useCallback(async (badge, email, password) => {
    const res = await mockLoginAuditor(badge, email, password);
    if (res.ok && res.user) {
      setUser(res.user);
    }
    return res;
  }, []);

  const loginBank = useCallback(async (email, password) => {
    const res = await mockLoginBank(email, password);
    if (res.ok && res.user) {
      setUser(res.user);
    }
    return res;
  }, []);

  const loginDigiLocker = useCallback(async (identifier, aadhaarLast4) => {
    const res = await mockSimulateDigiLocker(identifier, aadhaarLast4);
    if (res.ok && res.user) {
      setUser(res.user);
    }
    return res;
  }, []);

  const signup = useCallback(async (formData) => {
    const res = await mockCreateDemoCitizen(formData);
    if (res.ok && res.user) {
      setUser(res.user);
    }
    return res;
  }, []);

  const switchWorkspace = useCallback((targetRole) => {
    const res = mockSwitchWorkspace(targetRole);
    if (res.ok && res.user) {
      setUser(res.user);
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    mockLogout();
    setUser(null);
  }, []);

  const resetDemoData = useCallback(() => {
    resetAllDemoData();
    // Re-sync session if needed
    const current = getSession();
    setUser(current);
  }, []);

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const activeRole = user?.active_role || user?.activeRole || roles[0] || null;

  const isCitizen = Boolean(user && roles.some((r) => ["OWNER", "BUYER", "NOMINEE"].includes(r)));
  const isRegistrar = Boolean(user && roles.includes("REGISTRAR"));
  const isAuditor = Boolean(user && roles.includes("AUDITOR"));
  const isBank = Boolean(user && roles.includes("BANK"));
  const isDeceased = user?.account_status === "DECEASED";
  const isRestricted = user?.account_status === "RESTRICTED";

  const value = {
    user,
    isAuthenticated: Boolean(user),
    roles,
    activeRole,
    isCitizen,
    isRegistrar,
    isAuditor,
    isBank,
    isDeceased,
    isRestricted,
    loading,
    loginCitizen,
    loginRegistrar,
    loginAuditor,
    loginBank,
    loginDigiLocker,
    signup,
    switchWorkspace,
    logout,
    resetDemoData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
