"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import CustomerHeader from "@/components/customer/CustomerHeader";
import CustomerSummaryCards from "@/components/customer/CustomerSummaryCards";
import CustomerQuickActions from "@/components/customer/CustomerQuickActions";
import CustomerOverview from "@/components/customer/CustomerOverview";

export default function CustomerViewPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/customers/${id}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch customer`);
      }

      const data = await res.json();

      if (!data || Object.keys(data).length === 0) {
        setError("Customer not found");
      } else {
        setCustomer(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load customer");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-8 h-8 rounded-full border-[3px] border-[#343872]/20 border-t-[#343872] animate-spin" />
          <p className="text-xs text-slate-500">Loading customer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-6">
        <div className="relative isolate overflow-hidden rounded-xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_rgba(52,56,114,0.08)] p-6 text-center max-w-xs">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />
          <div className="relative">
            <p className="text-rose-600 text-sm font-semibold mb-1">Something went wrong</p>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <button
              onClick={loadCustomer}
              className="rounded-lg bg-[#343872] text-white text-xs font-medium px-3.5 py-2 shadow-[0_4px_14px_rgba(52,56,114,0.35)] hover:bg-[#2a2d5c] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-3 sm:p-4 print:bg-white print:p-0">
      <div id="printable-area">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 print:block">
          <div className="lg:col-span-9 print:col-span-12">
            <CustomerHeader customer={customer} />
          </div>
          <div className="lg:col-span-3 print:hidden">
            <CustomerQuickActions customer={customer} />
          </div>
        </div>

        <CustomerSummaryCards customer={customer} />
        <CustomerOverview customer={customer} />
      </div>
    </div>
  );
}