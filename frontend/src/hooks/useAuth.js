import { useState, useCallback, useEffect } from "react";
import { apiGet, apiPost, setUnauthorizedHandler } from "../lib/api.js";

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("lr_token") || "");
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("lr_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      // Corrupt localStorage shouldn't take the whole app down on boot.
      return null;
    }
  });
  // Until the stored token is checked against the server we don't know if it's
  // real. Pages use this to avoid flashing a "log in" gate at a user who
  // actually has a valid session.
  const [checking, setChecking] = useState(() => !!localStorage.getItem("lr_token"));

  const clearSession = useCallback(() => {
    setToken("");
    setUser(null);
    localStorage.removeItem("lr_token");
    localStorage.removeItem("lr_user");
  }, []);

  // Backend sessions are in-memory, so restarting the server invalidates a
  // token the browser still holds. Without this the sidebar kept showing a
  // REGISTRAR session while every write returned 401.
  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    apiGet("/auth/me", token)
      .then((session) => {
        if (cancelled) return;
        setUser({ username: session.username, role: session.role });
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
    // Deliberately only on mount: re-running this on every token change would
    // duplicate the validation the login call already performed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any 401 from anywhere in the app drops the dead session.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(async (username) => {
    const data = await apiPost("/auth/login", { username });
    setToken(data.token);
    setUser({ username: data.username, role: data.role });
    localStorage.setItem("lr_token", data.token);
    localStorage.setItem("lr_user", JSON.stringify({ username: data.username, role: data.role }));
  }, []);

  const logout = useCallback(() => {
    apiPost("/auth/logout", {}, token).catch(() => {});
    clearSession();
  }, [token, clearSession]);

  const isRegistrar = !!user && user.role === "REGISTRAR";

  return { token, user, login, logout, checking, isRegistrar };
}
