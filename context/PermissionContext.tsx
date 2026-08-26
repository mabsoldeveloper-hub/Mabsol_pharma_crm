"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useUser } from "./UserContext";

const PermissionContext = createContext<any>(null);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/permissions");
      const data = await res.json();

      if (data.success && Array.isArray(data.permissions)) {
        setPermissions(data.permissions);
      }
    } catch (error) {
      console.error("Failed to load permissions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [user, loadPermissions]);

  const can = (key: string) => {
    // If the logged-in user is an Admin, grant instant full access
    if (user?.roleType === "Admin" || user?.role === "Admin" || (user?.roleId as any)?.roleName === "Admin") {
      return true;
    }
    if (loading) return false;
    return permissions.includes("*") || permissions.includes(key);
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        loading,
        reload: loadPermissions,
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