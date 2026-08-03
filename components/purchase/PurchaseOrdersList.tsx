"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
  FaPlus,
  FaSearch,
  FaFileInvoice,
  FaBuilding,
  FaCalendarAlt,
  FaSync,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";

export default function PurchaseOrdersList() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (selectedFY?._id) params.set("fyId", selectedFY._id);
      if (search) params.set("search", search);

      const res = await fetch(`/api/purchase/orders?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setOrders(json.orders || []);
        }
      }
    } catch (err) {
      console.error("Fetch Purchase Orders Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedFY, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">
            Purchase Orders
          </h1>
          <p className="text-xs text-slate-500">
            List of generated purchase orders & vendor requisitions
          </p>
        </div>

        <Link
          href="/dashboard/purchase/orders/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition"
        >
          <FaPlus /> Create Purchase Order
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search PO Number, Vendor Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            onClick={() => fetchOrders()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition"
          >
            <FaSync className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading Purchase Orders...</div>
        ) : orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-medium">
                  <th className="pb-3 px-2">PO Number</th>
                  <th className="pb-3 px-2">PO Date</th>
                  <th className="pb-3 px-2">Vendor Name</th>
                  <th className="pb-3 px-2">Items Count</th>
                  <th className="pb-3 px-2 text-right">Net Total</th>
                  <th className="pb-3 px-2 text-center">Status</th>
                  <th className="pb-3 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {orders.map((po) => (
                  <tr key={po._id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                    <td className="py-3 px-2 font-bold text-slate-800 dark:text-slate-200">
                      {po.poNumber}
                    </td>
                    <td className="py-3 px-2 text-slate-500">{po.poDate}</td>
                    <td className="py-3 px-2 font-medium text-slate-700 dark:text-slate-300">
                      {po.vendorName}
                    </td>
                    <td className="py-3 px-2 text-slate-500">{po.items?.length || 0} items</td>
                    <td className="py-3 px-2 text-right font-bold text-slate-900 dark:text-white">
                      ₹{po.netTotal?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          po.status === "Billed"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Link
                        href="/dashboard/purchase/invoice/create"
                        className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold transition inline-flex items-center gap-1"
                      >
                        Create Bill &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            No purchase orders created yet. Click "Create Purchase Order" above to generate one.
          </div>
        )}
      </div>
    </div>
  );
}
