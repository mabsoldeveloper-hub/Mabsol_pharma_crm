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

  const isDesktopApp = useCallback(() => {
    if (typeof window === "undefined") return false;
    return Boolean(
      (window as any).electronAPI ||
      navigator.userAgent.toLowerCase().includes("electron")
    );
  }, []);

  const logoutAndRedirect = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout failed:", e);
    }
    setUser(null);

    // In desktop EXE mode, NEVER redirect to web /login page
    if (isDesktopApp()) {
      console.log("Desktop app session ended. Reloading desktop session...");
      try {
        const autoRes = await fetch("/api/auth/desktop-login", { method: "POST" });
        const autoData = await autoRes.json();
        if (autoData.success && autoData.user) {
          setUser(autoData.user);
          return;
        }
      } catch (_) {}
    } else if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
      window.location.href = "/login";
    }
  }, [isDesktopApp]);

  const loadUser = useCallback(async () => {
    try {
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
        // Retry desktop auto-login if running inside Electron
        if (isDesktopApp()) {
          const autoRes = await fetch("/api/auth/desktop-login", { method: "POST" });
          const autoData = await autoRes.json();
          if (autoData.success && autoData.user) {
            setUser(autoData.user);
            return;
          }
        }
        setUser(null);
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
          await logoutAndRedirect();
        }
      }
    } catch {
      if (isDesktopApp()) {
        try {
          const autoRes = await fetch("/api/auth/desktop-login", { method: "POST" });
          const autoData = await autoRes.json();
          if (autoData.success && autoData.user) {
            setUser(autoData.user);
            return;
          }
        } catch (_) {}
      }
      setUser(null);
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
        await logoutAndRedirect();
      }
    } finally {
      setLoading(false);
    }
  }, [logoutAndRedirect, isDesktopApp]);

  useEffect(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    loadUser();
  }, [loadUser]);

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