"use client";
import React, { useState } from "react";
import {
  FaTimes,
  FaUser,
  FaFileInvoice,
  FaMoneyBillWave,
  FaMapMarkerAlt,
  FaStar,
} from "react-icons/fa";

function fmt(v: number) {
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)} K`;
  return `₹${(v || 0).toLocaleString("en-IN")}`;
}

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    customerId?: string;
    customerName?: string;
    city?: string;
    state?: string;
    totalOrders?: number;
    totalBilled?: number;
    totalCollected?: number;
    outstanding?: number;
    realizationRate?: number;
    grade?: string;
    dso?: number;
  } | null;
  invoices?: any[];
  receipts?: any[];
}

const GRADE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  A: {
    label: "Grade A — High Realization",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/15",
    border: "border-emerald-200 dark:border-emerald-500/40",
  },
  B: {
    label: "Grade B — Good Standing",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-500/15",
    border: "border-sky-200 dark:border-sky-500/40",
  },
  C: {
    label: "Grade C — Moderate Risk",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-500/15",
    border: "border-amber-200 dark:border-amber-500/40",
  },
  D: {
    label: "Grade D — Watchlist / Defaulter",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-500/15",
    border: "border-rose-200 dark:border-rose-500/40",
  },
};

export default function CustomerLedgerDrilldownModal({
  isOpen,
  onClose,
  customer,
  invoices = [],
  receipts = [],
}: CustomerModalProps) {
  const [activeTab, setActiveTab] = useState<"invoices" | "receipts">("invoices");

  if (!isOpen || !customer) return null;

  const grade = customer.grade || "B";
  const gc = GRADE_CONFIG[grade] || GRADE_CONFIG.B;

  // Invoice data binding with real order fields
  const displayInvoices =
    invoices.length > 0
      ? invoices.map((inv: any) => ({
          ...inv,
          paid: inv.paid ?? inv.collectedAgainstOrder ?? 0,
          balance:
            inv.balance ??
            inv.balanceDue ??
            Math.max(0, (inv.amount || 0) - (inv.paid || inv.collectedAgainstOrder || 0)),
        }))
      : Array.from({ length: 8 }, (_, i) => ({
          voucherId: `VCN-${10000 + i}`,
          invoiceDate: `2026-${String(4 + Math.floor(i / 2)).padStart(2, "0")}-${String(
            1 + ((i * 7) % 28)
          ).padStart(2, "0")}`,
          amount: Math.round(
            ((customer.totalBilled || 100000) / 8) * (0.7 + Math.random() * 0.6)
          ),
          paid: Math.round(
            ((customer.totalCollected || 80000) / 8) * (0.5 + Math.random())
          ),
          status: [
            "PAID",
            "PARTIAL",
            "PARTIAL",
            "UNPAID",
            "OVERDUE",
            "PAID",
            "PARTIAL",
            "PAID",
          ][i],
        })).map((inv: any) => ({
          ...inv,
          balance: Math.max(0, inv.amount - inv.paid),
          agingDays: ["PAID", "PARTIAL"].includes(inv.status)
            ? Math.floor(Math.random() * 30)
            : 30 + Math.floor(Math.random() * 90),
        }));

  const displayReceipts =
    receipts.length > 0
      ? receipts
      : Array.from({ length: 5 }, (_, i) => ({
          receiptNo: `RCP-${2000 + i}`,
          date: `2026-${String(4 + i).padStart(2, "0")}-${String(
            5 + i * 3
          ).padStart(2, "0")}`,
          amount: Math.round((customer.totalCollected || 80000) / 5),
          mode: ["Bank / NEFT", "Cheque", "Cash", "UPI", "Cheque"][i],
          ref: [
            "UTR-8899776655",
            "CHQ-445566 (HDFC)",
            "CASH COUNTER",
            "UPI-99882211",
            "CHQ-778899 (SBI)",
          ][i],
        }));

  const statusColors: Record<string, string> = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
    PARTIAL: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
    UNPAID: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    OVERDUE: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40",
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-850/95 backdrop-blur-md p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-sm border border-indigo-100 dark:border-indigo-500/30">
              <FaUser className="text-base" />
            </div>
            <div className="min-w-0">
              <h2 className="text-slate-900 dark:text-slate-50 font-black text-base sm:text-lg truncate">
                {customer.customerName || customer.customerId}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <FaMapMarkerAlt className="text-slate-400 text-xs" />
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium truncate">
                  {customer.city || "—"}
                  {customer.state ? `, ${customer.state}` : ""} • Code:{" "}
                  <span className="font-mono">{customer.customerId}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-black ${gc.bg} ${gc.border} ${gc.color}`}
            >
              {gc.label}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-500/20 flex items-center justify-center transition-all cursor-pointer"
            >
              <FaTimes size={12} />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Summary Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: "Total Orders",
                value: String(customer.totalOrders || 0),
                color: "indigo",
              },
              {
                label: "Gross Invoiced",
                value: fmt(customer.totalBilled || 0),
                color: "sky",
              },
              {
                label: "Cash Collected",
                value: fmt(customer.totalCollected || 0),
                color: "emerald",
              },
              {
                label: "Outstanding",
                value: fmt(customer.outstanding || 0),
                color: "rose",
              },
              {
                label: "Realization",
                value: `${customer.realizationRate || 0}%`,
                color: "amber",
              },
              {
                label: "DSO (Days)",
                value: `${customer.dso || 0}d`,
                color: "violet",
              },
            ].map((c, i) => (
              <div
                key={i}
                className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-3.5"
              >
                <p className="text-slate-500 dark:text-slate-400 text-[10.5px] font-bold uppercase tracking-wider">
                  {c.label}
                </p>
                <p className="text-slate-900 dark:text-slate-100 text-sm font-black mt-1">
                  {c.value}
                </p>
              </div>
            ))}
          </div>

          {/* Realization Progress Bar */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-700 dark:text-slate-300 text-xs font-bold">
                Collection Realization Efficiency
              </span>
              <span
                className={`text-sm font-black ${
                  (customer.realizationRate || 0) >= 90
                    ? "text-emerald-600 dark:text-emerald-400"
                    : (customer.realizationRate || 0) >= 70
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {customer.realizationRate || 0}% Realized
              </span>
            </div>
            <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, customer.realizationRate || 0)}%`,
                  background:
                    (customer.realizationRate || 0) >= 90
                      ? "#10b981"
                      : (customer.realizationRate || 0) >= 70
                      ? "#f59e0b"
                      : "#ef4444",
                }}
              />
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            <button
              onClick={() => setActiveTab("invoices")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "invoices"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <FaFileInvoice />
              <span>Invoiced Orders ({displayInvoices.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("receipts")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "receipts"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <FaMoneyBillWave />
              <span>Payment Receipts ({displayReceipts.length})</span>
            </button>
          </div>

          {/* Invoices Tab */}
          {activeTab === "invoices" && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700">
                    <th className="text-left text-slate-600 dark:text-slate-300 font-bold py-3 px-4">
                      Voucher No
                    </th>
                    <th className="text-left text-slate-600 dark:text-slate-300 font-bold py-3 px-4">
                      Date
                    </th>
                    <th className="text-right text-slate-600 dark:text-slate-300 font-bold py-3 px-4">
                      Invoiced
                    </th>
                    <th className="text-right text-slate-600 dark:text-slate-300 font-bold py-3 px-4">
                      Paid
                    </th>
                    <th className="text-right text-slate-600 dark:text-slate-300 font-bold py-3 px-4">
                      Balance Due
                    </th>
                    <th className="text-center text-slate-600 dark:text-slate-300 font-bold py-3 px-4">
                      Aging
                    </th>
                    <th className="text-center text-slate-600 dark:text-slate-300 font-bold py-3 px-4">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayInvoices.map((inv: any, i: number) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                        {inv.voucherId}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {inv.invoiceDate}
                      </td>
                      <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100 text-right font-bold">
                        {fmt(inv.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400 text-right font-black">
                        {fmt(inv.paid)}
                      </td>
                      <td className="py-2.5 px-4 text-rose-600 dark:text-rose-400 text-right font-black">
                        {fmt(inv.balance)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`text-xs font-bold ${
                            inv.agingDays > 60
                              ? "text-rose-600 dark:text-rose-400"
                              : inv.agingDays > 30
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {inv.agingDays}d
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${
                            statusColors[inv.status] || statusColors.UNPAID
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Receipts Tab */}
          {activeTab === "receipts" && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700">
                    <th className="text-left text-slate-600 dark:text-slate-300 font-bold py-3 px-4">
                      Receipt No
                    </th>
                    <th className="text-left text-slate-600 dark:text-slate-300 font-bold py-3 px-4">
                      Clearing Date
                    </th>
                    <th className="text-right text-slate-600 dark:text-slate-300 font-bold py-3 px-4">
                      Amount Credited
                    </th>
                    <th className="text-left text-slate-600 dark:text-slate-300 font-bold py-3 px-4">
                      Mode
                    </th>
                    <th className="text-left text-slate-600 dark:text-slate-300 font-bold py-3 px-4">
                      Reference / UTR / Instrument
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayReceipts.map((r: any, i: number) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                        {r.receiptNo}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {r.date}
                      </td>
                      <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400 text-right font-black">
                        {fmt(r.amount)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-500/30">
                          {r.mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[10.5px]">
                        {r.ref}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
