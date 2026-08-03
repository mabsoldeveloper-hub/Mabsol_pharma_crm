"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
  FaShoppingBag,
  FaFileInvoiceDollar,
  FaExclamationTriangle,
  FaUndo,
  FaPlusCircle,
  FaReceipt,
  FaTruck,
  FaBoxes,
  FaBuilding,
  FaCalendarAlt,
  FaSync,
  FaArrowUp,
  FaArrowDown,
  FaSearch,
  FaChartLine,
  FaExchangeAlt,
} from "react-icons/fa";

interface PurchaseDashboardData {
  summary: {
    totalPurchases: number;
    purchaseReturns: number;
    netPurchase: number;
    totalBillsCount: number;
    totalOutstanding: number;
    totalOverdue: number;
    overdueBillsCount: number;
    suppliersCount: number;
    totalQty: number;
  };
  monthlyTrend: Array<{
    month: string;
    purchase: number;
    returns: number;
    bills: number;
  }>;
  topSuppliers: Array<{
    supplier: string;
    amount: number;
    billsCount: number;
  }>;
  recentBills: Array<{
    id: string;
    vcn: string;
    date: string;
    supplier: string;
    amount: number;
    type: string;
    status: string;
  }>;
}

export default function PurchaseDashboardContent() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [data, setData] = useState<PurchaseDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPurchaseDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (selectedCompany?._id) {
        params.set("companyId", selectedCompany._id);
      }

      if (selectedFY) {
        if (selectedFY.isAll) {
          params.set("fyId", "ALL");
        } else if (selectedFY._id) {
          params.set("fyId", selectedFY._id);
          if (selectedFY.startDate && selectedFY.endDate) {
            const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
            const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
            params.set("startDate", s);
            params.set("endDate", e);
          }
        }
      }

      const queryString = params.toString();
      const url = queryString ? `/api/purchase/dashboard?${queryString}` : "/api/purchase/dashboard";

      const res = await fetch(url);
      if (!res.ok) {
        console.error("Failed to fetch purchase dashboard:", res.status);
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Purchase Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedFY]);

  useEffect(() => {
    fetchPurchaseDashboard();
  }, [fetchPurchaseDashboard]);

  useEffect(() => {
    const handleFyChange = () => fetchPurchaseDashboard();
    const handleCompanyChange = () => fetchPurchaseDashboard();

    window.addEventListener("financial-year-changed", handleFyChange);
    window.addEventListener("company-changed", handleCompanyChange);

    return () => {
      window.removeEventListener("financial-year-changed", handleFyChange);
      window.removeEventListener("company-changed", handleCompanyChange);
    };
  }, [fetchPurchaseDashboard]);

  const summary = data?.summary || {
    totalPurchases: 0,
    purchaseReturns: 0,
    netPurchase: 0,
    totalBillsCount: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
    overdueBillsCount: 0,
    suppliersCount: 0,
    totalQty: 0,
  };

  const maxPurchaseMonth = Math.max(...(data?.monthlyTrend.map((m) => m.purchase) || [1]));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
          <FaShoppingBag className="text-[240px]" />
        </div>

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold tracking-wide">
            <FaShoppingBag /> Purchase & Creditors Control Center
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Purchase Dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-amber-100 text-xs font-medium pt-1">
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-lg">
              <FaBuilding className="text-amber-300" />
              {selectedCompany ? selectedCompany.companyName : "All Companies"}
            </span>
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-lg">
              <FaCalendarAlt className="text-amber-300" />
              FY: {selectedFY ? selectedFY.fyName : "Current Financial Year"}
            </span>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchPurchaseDashboard()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-semibold transition-all duration-200"
          >
            <FaSync className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <Link
            href="/dashboard/purchase/invoice/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-amber-900 hover:bg-amber-50 text-xs font-bold shadow-lg transition-all duration-200 hover:scale-105"
          >
            <FaPlusCircle /> Create Purchase Bill
          </Link>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchases Card */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Purchase</span>
            <span className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
              <FaShoppingBag />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              ₹{summary.totalPurchases.toLocaleString("en-IN")}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
              <span className="text-emerald-600 font-semibold flex items-center">
                <FaArrowUp size={10} /> Net: ₹{summary.netPurchase.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Purchase Outstanding Card */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Creditors</span>
            <span className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
              <FaFileInvoiceDollar />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              ₹{summary.totalOutstanding.toLocaleString("en-IN")}
            </div>
            <Link
              href="/dashboard/purchase/outstanding"
              className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              View Outstanding Statements &rarr;
            </Link>
          </div>
        </div>

        {/* Overdue Amount Card */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Overdue Amount</span>
            <span className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg">
              <FaExclamationTriangle />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              ₹{summary.totalOverdue.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {summary.overdueBillsCount} overdue creditor bills
            </div>
          </div>
        </div>

        {/* Purchase Returns Card */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Purchase Returns</span>
            <span className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg">
              <FaUndo />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              ₹{summary.purchaseReturns.toLocaleString("en-IN")}
            </div>
            <Link
              href="/dashboard/reports/purchase-return"
              className="inline-flex items-center gap-1 mt-1 text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline"
            >
              View Return Reports &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/dashboard/purchase/invoice/create"
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 transition-all text-xs font-semibold"
        >
          <FaPlusCircle className="text-amber-600 text-base shrink-0" />
          <span>New Purchase Bill</span>
        </Link>
        <Link
          href="/dashboard/purchase/outstanding"
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 transition-all text-xs font-semibold"
        >
          <FaFileInvoiceDollar className="text-blue-600 text-base shrink-0" />
          <span>Outstanding Payables</span>
        </Link>
        <Link
          href="/dashboard/purchase/payment"
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 transition-all text-xs font-semibold"
        >
          <FaReceipt className="text-emerald-600 text-base shrink-0" />
          <span>Payment Entry</span>
        </Link>
        <Link
          href="/dashboard/purchase/orders"
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 border border-indigo-200/60 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200 transition-all text-xs font-semibold"
        >
          <FaTruck className="text-indigo-600 text-base shrink-0" />
          <span>Purchase Orders</span>
        </Link>
      </div>

      {/* Analytics Section: Monthly Trend & Top Suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Purchase Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FaChartLine className="text-amber-500" /> Monthly Purchase Breakdown
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Monthly volume & bill count filtered for selected company and FY
                </p>
              </div>
              <span className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full font-medium">
                {data?.monthlyTrend.length || 0} Months Tracked
              </span>
            </div>

            {loading ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                Loading Trend Data...
              </div>
            ) : (
              <div className="space-y-4 my-4">
                {data?.monthlyTrend.map((m, idx) => {
                  const pct = Math.min(100, Math.max(8, (m.purchase / maxPurchaseMonth) * 100));
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-700 dark:text-slate-300 w-12">{m.month}</span>
                        <span className="text-slate-900 dark:text-white font-bold">
                          ₹{m.purchase.toLocaleString("en-IN")}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">({m.bills} bills)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden flex">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
            <span>Total Bills: <strong className="text-slate-800 dark:text-white">{summary.totalBillsCount}</strong></span>
            <span>Purchased Qty: <strong className="text-slate-800 dark:text-white">{summary.totalQty.toLocaleString("en-IN")} units</strong></span>
          </div>
        </div>

        {/* Top Suppliers List */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FaTruck className="text-amber-600" /> Top Suppliers / Vendors
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {summary.suppliersCount} total
              </span>
            </div>

            {loading ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                Loading Suppliers...
              </div>
            ) : data?.topSuppliers && data.topSuppliers.length > 0 ? (
              <div className="space-y-3">
                {data.topSuppliers.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {s.supplier}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {s.billsCount} transactions
                      </div>
                    </div>
                    <div className="font-bold text-amber-700 dark:text-amber-400 shrink-0">
                      ₹{s.amount.toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No vendor data recorded yet for selected filter.
              </div>
            )}
          </div>

          <Link
            href="/dashboard/master/customer-master"
            className="w-full text-center mt-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all"
          >
            Manage Vendor Masters &rarr;
          </Link>
        </div>
      </div>

      {/* Recent Purchases Table */}
      <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FaBoxes className="text-amber-600" /> Recent Purchase Transactions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest bill entries filtered by active company & financial year
            </p>
          </div>
          <Link
            href="/dashboard/purchase/invoice"
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
          >
            View All Purchase Invoices &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading Transactions...</div>
        ) : data?.recentBills && data.recentBills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-medium">
                  <th className="pb-3 px-2">Voucher / VCN</th>
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Supplier</th>
                  <th className="pb-3 px-2">Type</th>
                  <th className="pb-3 px-2 text-right">Amount</th>
                  <th className="pb-3 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {data.recentBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-2 font-semibold text-slate-800 dark:text-slate-200">
                      {b.vcn}
                    </td>
                    <td className="py-3 px-2 text-slate-500">{b.date}</td>
                    <td className="py-3 px-2 font-medium text-slate-700 dark:text-slate-300">
                      {b.supplier}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          b.type === "Return"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        }`}
                      >
                        {b.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-slate-900 dark:text-white">
                      ₹{b.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            No purchase records found for the selected company and financial year.
          </div>
        )}
      </div>
    </div>
  );
}
