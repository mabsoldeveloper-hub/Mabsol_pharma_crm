"use client";
import React from "react";
import {
  FaTimes,
  FaFileInvoice,
  FaBuilding,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaRupeeSign,
} from "react-icons/fa";

function fmt(v: number) {
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)} K`;
  return `₹${(v || 0).toLocaleString("en-IN")}`;
}

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: {
    voucherId?: string;
    billDate?: string;
    supplierName?: string;
    supplierId?: string;
    division?: string;
    amount?: number;
    paidAgainstBill?: number;
    balanceDue?: number;
    paymentPct?: number;
    agingDays?: number;
    status?: string;
    paymentMode?: string;
    state?: string;
    city?: string;
    asm?: string;
  } | null;
}

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
  UNPAID: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  OVERDUE: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40",
};

export default function PurchaseBillDetailModal({
  isOpen,
  onClose,
  bill,
}: BillModalProps) {
  if (!isOpen || !bill) return null;

  const status = bill.status || "UNPAID";
  const paymentPct = bill.paymentPct || 0;
  const balance = bill.balanceDue ?? Math.max(0, (bill.amount || 0) - (bill.paidAgainstBill || 0));

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900 via-orange-900 to-amber-950 p-5 text-white flex items-center justify-between border-b border-amber-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-amber-300 text-lg">
              <FaFileInvoice />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/15 border border-white/20 text-amber-200 font-bold">
                  {bill.voucherId}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                    STATUS_STYLES[status] || ""
                  }`}
                >
                  {status}
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-1">
                Purchase Bill & Payment Audit
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-rose-500 text-white flex items-center justify-center transition-all cursor-pointer border border-white/15"
          >
            <FaTimes size={12} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Supplier Details */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <FaBuilding className="text-amber-600 dark:text-amber-400 text-xs" />
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Supplier Profile
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
              {bill.supplierName}
            </h4>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-400">
              {bill.supplierId && (
                <span className="font-mono font-semibold">Code: {bill.supplierId}</span>
              )}
              {bill.city && (
                <span className="flex items-center gap-1">
                  <FaMapMarkerAlt className="text-amber-500" size={10} />
                  {bill.city}, {bill.state || "India"}
                </span>
              )}
              {bill.division && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                  Div: {bill.division}
                </span>
              )}
            </div>
          </div>

          {/* Financial Breakdown Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
                Bill Gross
              </span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100">
                {fmt(bill.amount || 0)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                Paid Outflow
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {fmt(bill.paidAgainstBill || 0)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block mb-1">
                Balance Due
              </span>
              <span className="text-base font-black text-rose-600 dark:text-rose-400">
                {fmt(balance)}
              </span>
            </div>
          </div>

          {/* Progress Bar & Aging */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Payment Realization
              </span>
              <span className="font-black text-amber-600 dark:text-amber-400">
                {paymentPct}% Cleared
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${paymentPct}%`,
                  background:
                    paymentPct >= 100
                      ? "#10b981"
                      : paymentPct > 0
                      ? "#f59e0b"
                      : "#ef4444",
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Bill Date
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {bill.billDate?.slice(0, 10) || "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Aging Duration
                </span>
                <span
                  className={`font-bold ${
                    (bill.agingDays || 0) > 60 ? "text-rose-600" : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {bill.agingDays || 0} Days Outstanding
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
