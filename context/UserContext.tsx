"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { SESSION_CHECK_INTERVAL_MS } from "@/lib/constants/session.constant";

const UserContext = createContext<any>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const loadStarted = useRef(false);

  const logoutAndRedirect = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout failed:", e);
    }
    setUser(null);
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
      window.location.href = "/login";
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      // Add timestamp and no-cache headers to prevent browser response caching
      const res = await fetch(`/api/auth/me?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
          await logoutAndRedirect();
        }
      }
    } catch {
      setUser(null);
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
        await logoutAndRedirect();
      }
    } finally {
      setLoading(false);
    }
  }, [logoutAndRedirect]);

  useEffect(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    loadUser();
  }, [loadUser]);

  // Periodically check session (based on SESSION_CHECK_INTERVAL_MS) and when window gets focus
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
        loadUser();
      }
    }, SESSION_CHECK_INTERVAL_MS);

    const onFocus = () => {
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
        loadUser();
      }
    };

    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        reload: loadUser,
        logout: logoutAndRedirect,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}