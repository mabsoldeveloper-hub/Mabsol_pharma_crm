"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "./UserContext";

export interface CompanyType {
  _id: string;
  companyCode: string;
  companyName: string;
  ownerName?: string;
  email?: string;
  mobile?: string;
  website?: string;
  gstNo?: string;
  panNo?: string;
  drugLicenseNo?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  logo?: string;
  isDefault?: boolean;
  status?: string;
}

interface CompanyContextType {
  companies: CompanyType[];
  selectedCompany: CompanyType | null;
  setSelectedCompany: (company: CompanyType) => void;
  loading: boolean;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType>({
  companies: [],
  selectedCompany: null,
  setSelectedCompany: () => {},
  loading: true,
  refreshCompanies: async () => {},
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [companies, setCompanies] = useState<CompanyType[]>([]);
  const [selectedCompany, setSelectedCompanyState] = useState<CompanyType | null>(null);
  const [loading, setLoading] = useState(true);
  const initialLoadedRef = useRef(false);
  const userCompId = user?.companyId?._id || (typeof user?.companyId === "string" ? user?.companyId : null);

  const fetchCompanies = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground || !initialLoadedRef.current) {
        setLoading(true);
      }
      const res = await fetch("/api/company-master");
      if (!res.ok) return;
      const data: CompanyType[] = await res.json();
      
      setCompanies((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
        return data || [];
      });

      if (!data || data.length === 0) {
        setSelectedCompanyState(null);
        return;
      }

      // Check localStorage for saved company selection
      let savedStr: string | null = null;
      if (typeof window !== "undefined") {
        savedStr = localStorage.getItem("mabsol_selected_company");
      }

      let matchedComp: CompanyType | null = null;

      if (savedStr) {
        try {
          const parsed = JSON.parse(savedStr);
          const match = data.find((c) => c._id === parsed._id || c.companyCode === parsed.companyCode);
          if (match) {
            matchedComp = match;
          }
        } catch {
          // Fall through
        }
      }

      if (!matchedComp && userCompId) {
        const userMatch = data.find((c) => c._id === userCompId);
        if (userMatch) {
          matchedComp = userMatch;
        }
      }

      if (!matchedComp) {
        matchedComp =
          data.find((c) => c.isDefault) ||
          data.find((c) => c.companyName?.toLowerCase().includes("skylark")) ||
          data[0] ||
          null;
      }

      if (matchedComp) {
        setSelectedCompanyState((prev) => {
          if (prev?._id === matchedComp?._id && prev?.companyName === matchedComp?.companyName) {
            return prev;
          }
          return matchedComp;
        });
      }
      initialLoadedRef.current = true;
    } catch (err) {
      console.error("Failed to load companies", err);
    } finally {
      setLoading(false);
    }
  }, [userCompId]);

  useEffect(() => {
    fetchCompanies(initialLoadedRef.current);
  }, [fetchCompanies]);

  const changeSelectedCompany = useCallback((company: CompanyType) => {
    setSelectedCompanyState((prev) => {
      if (prev?._id === company._id) return prev;
      return company;
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("mabsol_selected_company", JSON.stringify(company));
      window.dispatchEvent(new CustomEvent("company-changed", { detail: company }));
    }
  }, []);

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        setSelectedCompany: changeSelectedCompany,
        loading,
        refreshCompanies: () => fetchCompanies(false),
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
