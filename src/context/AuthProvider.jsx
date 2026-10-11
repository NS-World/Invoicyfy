import { useState, useEffect, useRef } from "react";
import { AuthContext } from "./AuthContext";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    user: null,
    token: localStorage.getItem("token") || null,
    refresh_token: localStorage.getItem("refresh_token") || null,
  });

  const inactivityTimerRef = useRef(null);

  // Function to log out user
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("lastActivityTime");
    setAuth({ user: null, token: null, refresh_token: null });
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Redirect to login
    window.location.href = "/login";
  };

  // Function to reset inactivity timer
  const resetInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Update last activity time
    localStorage.setItem("lastActivityTime", new Date().getTime().toString());

    // Set new timer only if user is logged in
    if (auth.token) {
      inactivityTimerRef.current = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  // Login function
  const login = (user, token, refresh_token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("lastActivityTime", new Date().getTime().toString());
    setAuth({ user, token, refresh_token });
  };

  // Track user activity
  useEffect(() => {
    if (!auth.token) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      return;
    }

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Initialize timer on mount if token exists
    resetInactivityTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [auth.token]);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
