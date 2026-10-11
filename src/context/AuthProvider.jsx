import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AuthContext } from "./AuthContext";
import { tokenStore } from "../services/axios";
import { AuthServices } from "../services/AuthServices";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => ({
    user: readUser(),
    token: tokenStore.access,
    refresh_token: tokenStore.refresh,
  }));
  const timerRef = useRef(null);

  const logout = useCallback(() => {
    tokenStore.clear();
    setAuth({ user: null, token: null, refresh_token: null });
    clearTimeout(timerRef.current);
    window.location.href = "/login";
  }, []);

  const login = useCallback((user, token, refresh_token) => {
    tokenStore.set(token, refresh_token);
    if (user) localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("lastActivityTime", String(Date.now()));
    setAuth({ user, token, refresh_token });
  }, []);

  const setUser = useCallback((user) => {
    localStorage.setItem("user", JSON.stringify(user));
    setAuth((a) => ({ ...a, user }));
  }, []);

  // Refresh the profile (role / store may have changed since last login).
  useEffect(() => {
    if (!auth.token) return;
    AuthServices.me()
      .then((res) => res?.data && setUser(res.data))
      .catch(() => {});
  }, [auth.token, setUser]);

  // Auto logout after inactivity, also across tabs (uses lastActivityTime in localStorage).
  useEffect(() => {
    if (!auth.token) return undefined;
    const schedule = () => {
      clearTimeout(timerRef.current);
      const last = Number(localStorage.getItem("lastActivityTime")) || Date.now();
      const remaining = INACTIVITY_TIMEOUT - (Date.now() - last);
      if (remaining <= 0) {
        logout();
        return;
      }
      timerRef.current = setTimeout(schedule, remaining);
    };
    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite > 15000) {
        lastWrite = now;
        localStorage.setItem("lastActivityTime", String(now));
      }
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    schedule();
    return () => {
      clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [auth.token, logout]);

  const value = useMemo(() => {
    const role = (auth.user?.role_name || "").toLowerCase();
    const perms = auth.user?.permissions || {};
    // can("invoices", "add") — Admin can do everything; the server enforces the same rules.
    const can = (module, action = "view") => role === "admin" || (perms[module] || []).includes(action);
    return {
      can,
      auth,
      user: auth.user,
      login,
      logout,
      setUser,
      isAdmin: role === "admin",
      isManager: role === "admin" || role === "manager",
    };
  }, [auth, login, logout, setUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
