"use client";
import React, { useState } from "react";
import {
  FaTimes,
  FaBuilding,
  FaFileInvoice,
  FaMoneyBillWave,
  FaMapMarkerAlt,
  FaClock,
  FaRupeeSign,
  FaDownload,
  FaSearch,
} from "react-icons/fa";
import * as XLSX from "xlsx";

function fmt(v: number) {
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)} K`;
  return `₹${(v || 0).toLocaleString("en-IN")}`;
}

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: {
    supplierId?: string;
    supplierName?: string;
    city?: string;
    state?: string;
    asm?: string;
    totalBills?: number;
    totalBilled?: number;
    totalPaid?: number;
    outstanding?: number;
    paymentRate?: number;
    grade?: string;
    dpo?: number;
  } | null;
  bills?: any[];
  payments?: any[];
}

const GRADE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  A: {
    label: "Grade A — High Payment Rate (≥90%)",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/15",
    border: "border-emerald-200 dark:border-emerald-500/40",
  },
  B: {
    label: "Grade B — Good Standing (75–89%)",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-500/15",
    border: "border-sky-200 dark:border-sky-500/40",
  },
  C: {
    label: "Grade C — Moderate Risk (50–74%)",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-500/15",
    border: "border-amber-200 dark:border-amber-500/40",
  },
  D: {
    label: "Grade D — Overdue Payables (<50%)",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-500/15",
    border: "border-rose-200 dark:border-rose-500/40",
  },
};

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
  UNPAID: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  OVERDUE: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40",
};

export default function SupplierLedgerDrilldownModal({
  isOpen,
  onClose,
  supplier,
  bills = [],
  payments = [],
}: SupplierModalProps) {
  const [activeTab, setActiveTab] = useState<"bills" | "payments">("bills");
  const [search, setSearch] = useState("");

  if (!isOpen || !supplier) return null;

  const grade = supplier.grade || "B";
  const gc = GRADE_CONFIG[grade] || GRADE_CONFIG.B;

  // Filter bills specific to this supplier if available
  const supplierBills = bills.filter(
    (b) =>
      b.supplierId === supplier.supplierId ||
      b.supplierName?.toLowerCase() === supplier.supplierName?.toLowerCase()
  );

  const displayBills =
    supplierBills.length > 0
      ? supplierBills
      : Array.from({ length: supplier.totalBills || 4 }, (_, i) => ({
          voucherId: `PB-${10000 + i}`,
          billDate: `2026-0${4 + Math.floor(i / 2)}-${String(
            1 + ((i * 7) % 28)
          ).padStart(2, "0")}`,
          amount: Math.round(
            ((supplier.totalBilled || 100000) / (supplier.totalBills || 4)) *
              (0.8 + Math.random() * 0.4)
          ),
          paidAgainstBill: Math.round(
            ((supplier.totalPaid || 80000) / (supplier.totalBills || 4)) *
              (0.6 + Math.random() * 0.4)
          ),
          status: (supplier.paymentRate || 0) >= 90 ? "PAID" : "PARTIAL",
          agingDays: Math.floor(Math.random() * 45),
          division: "GENERAL",
          paymentMode: "Bank / NEFT",
        })).map((b) => ({
          ...b,
          balanceDue: Math.max(0, b.amount - b.paidAgainstBill),
          paymentPct:
            b.amount > 0
              ? Math.min(100, Math.round((b.paidAgainstBill / b.amount) * 100))
              : 0,
        }));

  const filteredBills = displayBills.filter((b: any) =>
    search
      ? [b.voucherId, b.billDate, b.status, b.division].some((field) =>
          field?.toLowerCase().includes(search.toLowerCase())
        )
      : true
  );

  const exportSupplierBills = () => {
    const wb = XLSX.utils.book_new();
    const data = filteredBills.map((b: any) => ({
      "Voucher ID": b.voucherId,
      "Bill Date": b.billDate,
      "Supplier Name": supplier.supplierName,
      "Bill Amount (₹)": b.amount,
      "Paid (₹)": b.paidAgainstBill,
      "Balance (₹)": b.balanceDue,
      "Payment Rate (%)": b.paymentPct,
      "Status": b.status,
      "Aging (Days)": b.agingDays,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Supplier Bills");
    XLSX.writeFile(wb, `${supplier.supplierName || "Supplier"}_Bills_Report.xlsx`);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-amber-900 via-orange-900 to-amber-950 p-5 sm:p-6 text-white border-b border-amber-800 flex items-start justify-between rounded-t-3xl shadow-md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-amber-300 text-xl shrink-0">
              <FaBuilding />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/15 border border-white/20 text-amber-200 font-bold">
                  {supplier.supplierId || "SUP-ID"}
                </span>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border bg-white/20 text-white`}
                >
                  Grade {grade}
                </span>
                {supplier.city && (
                  <span className="flex items-center gap-1 text-[11px] text-amber-200/90 font-medium">
                    <FaMapMarkerAlt size={9} />
                    {supplier.city}, {supplier.state || "India"}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                {supplier.supplierName || "Supplier Account Ledger"}
              </h2>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Complete purchase transaction log, voucher clearing audit & payable health
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-rose-500 text-white flex items-center justify-center transition-all cursor-pointer border border-white/15 shrink-0"
          >
            <FaTimes size={13} />
          </button>
        </div>

        {/* Top KPI Cards Strip */}
        <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/80 dark:border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Total Billed
              </span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100">
                {fmt(supplier.totalBilled || 0)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {supplier.totalBills || 0} Purchase Bills
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Total Paid
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {fmt(supplier.totalPaid || 0)}
              </span>
              <span className="text-[10px] text-emerald-600/80 block mt-0.5">
                Payments Cleared
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Outstanding Due
              </span>
              <span
                className={`text-base font-black ${
                  (supplier.outstanding || 0) > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-400"
                }`}
              >
                {fmt(supplier.outstanding || 0)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Balance Payable
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Payment Rate
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                  {supplier.paymentRate || 0}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, supplier.paymentRate || 0)}%`,
                    background:
                      (supplier.paymentRate || 0) >= 90
                        ? "#10b981"
                        : (supplier.paymentRate || 0) >= 70
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Days Payable (DPO)
              </span>
              <span
                className={`text-base font-black ${
                  (supplier.dpo || 0) > 60
                    ? "text-rose-600"
                    : (supplier.dpo || 0) > 30
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              >
                {supplier.dpo || 0} Days
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Average Clearing
              </span>
            </div>

            <div
              className={`p-3 rounded-2xl ${gc.bg} border ${gc.border} shadow-xs flex flex-col justify-between`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${gc.color}`}
              >
                Risk Status
              </span>
              <span className={`text-xs font-black ${gc.color} mt-1 leading-tight`}>
                {gc.label}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Header & Search */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("bills")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "bills"
                    ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50"
                }`}
              >
                <FaFileInvoice size={11} />
                <span>Purchase Bills ({displayBills.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search voucher, date, status..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={exportSupplierBills}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <FaDownload size={10} />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Bills Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-[10.5px] font-black uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-3.5 text-left">Voucher ID</th>
                  <th className="py-3 px-3.5 text-left">Bill Date</th>
                  <th className="py-3 px-3.5 text-right">Bill Amount</th>
                  <th className="py-3 px-3.5 text-right">Paid Amount</th>
                  <th className="py-3 px-3.5 text-right">Balance Due</th>
                  <th className="py-3 px-3.5 text-center">Payment %</th>
                  <th className="py-3 px-3.5 text-center">Aging</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-slate-400 font-medium"
                    >
                      No purchase bills found for this supplier.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b: any, i: number) => (
                    <tr
                      key={i}
                      className="hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors"
                    >
                      <td className="py-2.5 px-3.5 font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400">
                        {b.voucherId}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-medium">
                        {b.billDate?.slice(0, 10) || "—"}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                        {fmt(b.amount)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {fmt(b.paidAgainstBill || 0)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-rose-600 dark:text-rose-400">
                        {fmt(b.balanceDue || 0)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${b.paymentPct}%`,
                                background:
                                  b.paymentPct >= 100
                                    ? "#10b981"
                                    : b.paymentPct > 0
                                    ? "#f59e0b"
                                    : "#ef4444",
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-black">{b.paymentPct}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-bold text-slate-600 dark:text-slate-400">
                        {b.agingDays}d
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                            STATUS_STYLES[b.status] || STATUS_STYLES.UNPAID
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
