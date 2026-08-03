"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
  FaPlus,
  FaSearch,
  FaFileInvoice,
  FaSync,
  FaCheckCircle,
} from "react-icons/fa";

export default function PurchaseBillsList() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (selectedFY?._id) params.set("fyId", selectedFY._id);
      if (search) params.set("search", search);

      const res = await fetch(`/api/purchase/invoice?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setBills(json.bills || []);
        }
      }
    } catch (err) {
      console.error("Fetch Purchase Bills Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedFY, search]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">
            Purchase Invoices / Bills
          </h1>
          <p className="text-xs text-slate-500">
            List of inward purchase bills & supplier invoices
          </p>
        </div>

        <Link
          href="/dashboard/purchase/invoice/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition"
        >
          <FaPlus /> Create Purchase Bill
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search Bill No, Supplier Inv No, Vendor Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            onClick={() => fetchBills()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition"
          >
            <FaSync className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading Purchase Invoices...</div>
        ) : bills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-medium">
                  <th className="pb-3 px-2">Bill Number</th>
                  <th className="pb-3 px-2">Supplier Inv No</th>
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Vendor Name</th>
                  <th className="pb-3 px-2">Linked PO</th>
                  <th className="pb-3 px-2 text-right">Net Amount</th>
                  <th className="pb-3 px-2 text-right">Balance</th>
                  <th className="pb-3 px-2 text-center">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {bills.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                    <td className="py-3 px-2 font-bold text-slate-800 dark:text-slate-200">
                      {b.billNumber}
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-700 dark:text-slate-300">
                      {b.supplierInvoiceNo || "N/A"}
                    </td>
                    <td className="py-3 px-2 text-slate-500">{b.billDate}</td>
                    <td className="py-3 px-2 font-medium text-slate-700 dark:text-slate-300">
                      {b.vendorName}
                    </td>
                    <td className="py-3 px-2 text-slate-500 font-medium">
                      {b.poNumber ? (
                        <span className="text-amber-700 dark:text-amber-300 font-semibold">{b.poNumber}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-slate-900 dark:text-white">
                      ₹{b.netAmount?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-rose-600 dark:text-rose-400">
                      ₹{b.balanceAmount?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          b.paymentStatus === "Paid"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : b.paymentStatus === "Partial"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}
                      >
                        {b.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            No purchase bills recorded yet. Click "Create Purchase Bill" above to enter a new bill.
          </div>
        )}
      </div>
    </div>
  );
}
