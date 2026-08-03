"use client";

import React, { useState, useEffect } from "react";
import {
  FaHistory,
  FaFileInvoiceDollar,
  FaShoppingBag,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";

interface SupplierHistoryPanelProps {
  vendorName: string;
  vendorCode?: string;
  vendorId?: string;
}

export default function SupplierHistoryPanel({
  vendorName,
  vendorCode,
  vendorId,
}: SupplierHistoryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);

  useEffect(() => {
    if (!vendorName && !vendorCode && !vendorId) {
      setHistoryData(null);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (vendorName) params.set("vendorName", vendorName);
        if (vendorCode) params.set("vendorCode", vendorCode);
        if (vendorId) params.set("vendorId", vendorId);

        const res = await fetch(`/api/purchase/supplier-history?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setHistoryData(json);
          }
        }
      } catch (err) {
        console.error("Supplier History Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchHistory();
    }, 300);

    return () => clearTimeout(timer);
  }, [vendorName, vendorCode, vendorId]);

  if (!vendorName) return null;

  const summary = historyData?.summary || {
    totalOrdersCount: 0,
    totalBillsCount: 0,
    totalPurchasedAmount: 0,
    totalOutstanding: 0,
    overdueAmount: 0,
    lastOrderDate: "N/A",
  };

  const recentOrders = historyData?.recentOrders || [];
  const recentBills = historyData?.recentBills || [];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-amber-50/40 dark:from-slate-900/60 dark:to-slate-800/60 rounded-3xl p-6 border border-amber-200/60 dark:border-white/10 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
          <FaHistory className="text-amber-600" /> Supplier Purchase & Payment History: <span className="text-amber-700 dark:text-amber-400">{vendorName}</span>
        </h3>
        <span className="text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full">
          Live Vendor Analytics
        </span>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">Fetching supplier history...</div>
      ) : (
        <div className="space-y-4">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-100 dark:border-white/5 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Total Purchases</div>
              <div className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5">
                ₹{summary.totalPurchasedAmount.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{summary.totalBillsCount} bills recorded</div>
            </div>

            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-100 dark:border-white/5 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Pending Payables</div>
              <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                ₹{summary.totalOutstanding.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Unpaid balance</div>
            </div>

            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-100 dark:border-white/5 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Overdue Amount</div>
              <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                ₹{summary.overdueAmount.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] text-rose-500 font-medium mt-0.5">Payment due passed</div>
            </div>

            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-100 dark:border-white/5 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Last Transaction</div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">
                {summary.lastOrderDate}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{summary.totalOrdersCount} POs generated</div>
            </div>
          </div>

          {/* Tables Section: Recent POs & Bills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Recent POs */}
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-2">
              <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between">
                <span>Recent Purchase Orders</span>
                <span className="text-[10px] text-slate-400 font-normal">Last {recentOrders.length}</span>
              </div>
              {recentOrders.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {recentOrders.map((po: any) => (
                    <div
                      key={po.id}
                      className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-white/5"
                    >
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{po.poNumber}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({po.poDate})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">₹{po.netTotal.toLocaleString("en-IN")}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            po.status === "Billed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {po.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-[11px] text-slate-400">No previous purchase orders found.</div>
              )}
            </div>

            {/* Recent Bills */}
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-2">
              <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between">
                <span>Recent Invoices & Payables</span>
                <span className="text-[10px] text-slate-400 font-normal">Last {recentBills.length}</span>
              </div>
              {recentBills.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {recentBills.map((b: any) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-white/5"
                    >
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{b.billNumber}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({b.billDate})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">₹{b.netAmount.toLocaleString("en-IN")}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            b.paymentStatus === "Paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {b.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-[11px] text-slate-400">No previous purchase invoices found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
