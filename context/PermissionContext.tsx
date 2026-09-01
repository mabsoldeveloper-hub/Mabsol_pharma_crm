"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useUser } from "./UserContext";

const PermissionContext = createContext<any>(null);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = user?._id;
  const initialLoadedRef = useRef(false);

  const loadPermissions = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground || !initialLoadedRef.current) {
        setLoading(true);
      }
      const res = await fetch("/api/auth/permissions");
      const data = await res.json();

      if (data.success && Array.isArray(data.permissions)) {
        setPermissions((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data.permissions)) {
            return prev;
          }
          return data.permissions;
        });
        initialLoadedRef.current = true;
      }
    } catch (error) {
      console.error("Failed to load permissions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadPermissions(initialLoadedRef.current);
    }
  }, [userId, loadPermissions]);

  const can = (key: string) => {
    // If the logged-in user is an Admin, grant instant full access
    if (user?.roleType === "Admin" || user?.role === "Admin" || (user?.roleId as any)?.roleName === "Admin") {
      return true;
    }
    if (loading && !initialLoadedRef.current) return false;
    return permissions.includes("*") || permissions.includes(key);
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        reload: () => loadPermissions(false),
        can,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (!context) {
    return {
      permissions: [],
      loading: false,
      reload: async () => {},
      can: (_key: string) => true,
    };
  }
  return context;
}