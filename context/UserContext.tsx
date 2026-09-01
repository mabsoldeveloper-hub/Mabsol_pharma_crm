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
  const userRef = useRef<any>(null);
  userRef.current = user;

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

  const loadUser = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      // Add timestamp and no-cache headers to prevent browser response caching
      const res = await fetch(`/api/auth/me?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (res.status === 401) {
        setUser(null);
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
          await logoutAndRedirect();
        }
        return;
      }

      if (!res.ok) {
        // Transient network or server error: do not force logout during background check
        return;
      }

      const data = await res.json();

      if (data.success && data.user) {
        setUser((prevUser: any) => {
          if (prevUser && JSON.stringify(prevUser) === JSON.stringify(data.user)) {
            return prevUser;
          }
          return data.user;
        });
      } else {
        if (!isBackground) {
          setUser(null);
          if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
            await logoutAndRedirect();
          }
        }
      }
    } catch (err) {
      console.error("Failed to load user:", err);
      if (!isBackground && !userRef.current) {
        setUser(null);
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
          await logoutAndRedirect();
        }
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [logoutAndRedirect]);

  useEffect(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    loadUser(false);
  }, [loadUser]);

  // Periodically verify session in background without triggering UI loading flicker
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
        loadUser(true);
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [loadUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        reload: () => loadUser(false),
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