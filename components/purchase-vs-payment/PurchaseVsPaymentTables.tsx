"use client";
import React, { useState, useMemo } from "react";
import {
  FaSearch,
  FaDownload,
  FaBuilding,
  FaFileInvoice,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaEye,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import SupplierLedgerDrilldownModal from "./SupplierLedgerDrilldownModal";
import PurchaseBillDetailModal from "./PurchaseBillDetailModal";

function fmt(v: number) {
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)} K`;
  return `₹${(v || 0).toLocaleString("en-IN")}`;
}

const GRADE_STYLES: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
  B: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40",
  C: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
  D: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40",
};

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
  UNPAID: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  OVERDUE: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40",
};

interface TablesProps {
  supplierLedger: any[];
  billLedger: any[];
  trendData: any[];
  stateData: any[];
  loading: boolean;
}

type SortDir = "asc" | "desc" | null;

function SortIcon({ dir }: { dir: SortDir }) {
  if (!dir) return <FaSort className="text-slate-400 text-[9px]" />;
  return dir === "asc" ? (
    <FaSortUp className="text-amber-600 text-[9px]" />
  ) : (
    <FaSortDown className="text-amber-600 text-[9px]" />
  );
}

export default function PurchaseVsPaymentTables({
  supplierLedger,
  billLedger,
  trendData,
  stateData,
  loading,
}: TablesProps) {
  const [activeTab, setActiveTab] = useState<
    "suppliers" | "bills" | "mom" | "states"
  >("suppliers");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("totalBilled");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const PAGE_SIZE = 20;

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const filteredSuppliers = useMemo(() => {
    let rows = [...supplierLedger];
    if (search)
      rows = rows.filter((r) =>
        [r.supplierName, r.supplierId, r.city].some((f) =>
          f?.toLowerCase().includes(search.toLowerCase())
        )
      );
    if (gradeFilter !== "ALL") rows = rows.filter((r) => r.grade === gradeFilter);
    if (sortKey && sortDir) {
      rows.sort((a, b) => {
        const av = a[sortKey] ?? 0;
        const bv = b[sortKey] ?? 0;
        return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
      });
    }
    return rows;
  }, [supplierLedger, search, gradeFilter, sortKey, sortDir]);

  const pagedSuppliers = filteredSuppliers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );
  const totalPages = Math.ceil(filteredSuppliers.length / PAGE_SIZE);

  const filteredBills = useMemo(() => {
    if (!search) return billLedger;
    return billLedger.filter((r) =>
      [r.supplierName, r.voucherId, r.city, r.division].some((f) =>
        f?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [billLedger, search]);

  const exportSuppliers = () => {
    const wb = XLSX.utils.book_new();
    const data = filteredSuppliers.map((s) => ({
      "Supplier ID": s.supplierId,
      "Supplier Name": s.supplierName,
      City: s.city,
      State: s.state,
      "Total Bills": s.totalBills,
      "Total Billed (₹)": s.totalBilled,
      "Total Paid (₹)": s.totalPaid,
      "Outstanding (₹)": s.outstanding,
      "Payment Rate (%)": s.paymentRate,
      Grade: s.grade,
      "DPO (Days)": s.dpo,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Supplier Ledger");
    XLSX.writeFile(wb, "Purchase_Supplier_Ledger.xlsx");
  };

  const exportBills = () => {
    const wb = XLSX.utils.book_new();
    const data = filteredBills.map((b) => ({
      "Voucher ID": b.voucherId,
      "Bill Date": b.billDate,
      Supplier: b.supplierName,
      Division: b.division,
      "Bill Amount (₹)": b.amount,
      "Paid (₹)": b.paidAgainstBill,
      "Balance (₹)": b.balanceDue,
      "Payment %": b.paymentPct,
      "Aging (Days)": b.agingDays,
      Status: b.status,
      State: b.state,
      City: b.city,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Bill Ledger");
    XLSX.writeFile(wb, "Purchase_Bill_Ledger.xlsx");
  };

  const thClass =
    "px-3.5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 select-none";
  const tdClass = "px-3.5 py-3.5 text-xs text-slate-700 dark:text-slate-300";

  const TABS = [
    { key: "suppliers", label: "🏭 Supplier Ledger", count: supplierLedger.length },
    { key: "bills", label: "📋 Bill Ledger", count: billLedger.length },
    { key: "mom", label: "📅 Month-on-Month", count: trendData.length },
    { key: "states", label: "🗺️ State-wise", count: stateData.length },
  ] as const;

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden transition-all">
        {/* Tab Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 py-3.5 bg-amber-50/30 dark:bg-amber-950/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab(t.key);
                  setPage(1);
                  setSearch("");
                }}
                className={`px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === t.key
                    ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-amber-300"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-black ${
                    activeTab === t.key
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {(activeTab === "suppliers" || activeTab === "bills") && (
              <button
                type="button"
                onClick={activeTab === "suppliers" ? exportSuppliers : exportBills}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <FaDownload size={10} />
                <span>Export Excel</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Search + Grade Filter Ribbon */}
          {(activeTab === "suppliers" || activeTab === "bills") && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "suppliers"
                      ? "Search supplier name, ID, city..."
                      : "Search bill voucher, supplier, division..."
                  }
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              {activeTab === "suppliers" && (
                <div className="flex gap-1.5">
                  {["ALL", "A", "B", "C", "D"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGradeFilter(g);
                        setPage(1);
                      }}
                      className={`px-3 py-2 rounded-xl text-[10.5px] font-black border transition-all cursor-pointer ${
                        gradeFilter === g
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300"
                      }`}
                    >
                      {g === "ALL" ? "All Grades" : `Grade ${g}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 1: SUPPLIER LEDGER ───────────────────────────── */}
          {activeTab === "suppliers" &&
            (loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full min-w-[920px]">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className={thClass} onClick={() => handleSort("supplierName")}>
                          <div className="flex items-center gap-1">
                            Supplier <SortIcon dir={sortKey === "supplierName" ? sortDir : null} />
                          </div>
                        </th>
                        <th className={thClass}>
                          <div className="flex items-center gap-1">
                            <FaMapMarkerAlt size={9} /> Location
                          </div>
                        </th>
                        <th
                          className={`${thClass} text-right`}
                          onClick={() => handleSort("totalBills")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Bills <SortIcon dir={sortKey === "totalBills" ? sortDir : null} />
                          </div>
                        </th>
                        <th
                          className={`${thClass} text-right`}
                          onClick={() => handleSort("totalBilled")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Invoiced <SortIcon dir={sortKey === "totalBilled" ? sortDir : null} />
                          </div>
                        </th>
                        <th
                          className={`${thClass} text-right`}
                          onClick={() => handleSort("totalPaid")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Paid Outflow <SortIcon dir={sortKey === "totalPaid" ? sortDir : null} />
                          </div>
                        </th>
                        <th
                          className={`${thClass} text-right`}
                          onClick={() => handleSort("outstanding")}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Outstanding <SortIcon dir={sortKey === "outstanding" ? sortDir : null} />
                          </div>
                        </th>
                        <th
                          className={`${thClass} text-center`}
                          onClick={() => handleSort("paymentRate")}
                        >
                          <div className="flex items-center justify-center gap-1">
                            Payment % <SortIcon dir={sortKey === "paymentRate" ? sortDir : null} />
                          </div>
                        </th>
                        <th className={`${thClass} text-center`}>Grade</th>
                        <th
                          className={`${thClass} text-center`}
                          onClick={() => handleSort("dpo")}
                        >
                          <div className="flex items-center justify-center gap-1">
                            DPO <SortIcon dir={sortKey === "dpo" ? sortDir : null} />
                          </div>
                        </th>
                        <th className="px-3.5 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                      {pagedSuppliers.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-xs text-slate-400">
                            No supplier data matches the filter criteria
                          </td>
                        </tr>
                      ) : (
                        pagedSuppliers.map((s, i) => (
                          <tr
                            key={i}
                            onClick={() => setSelectedSupplier(s)}
                            className="hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors cursor-pointer"
                          >
                            <td className={tdClass}>
                              <div className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                                {s.supplierName}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {s.supplierId}
                              </div>
                            </td>
                            <td className={tdClass}>
                              <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                                <FaMapMarkerAlt size={9} className="text-amber-500 shrink-0" />
                                <span className="truncate max-w-[120px]">
                                  {s.city || "—"}, {s.state || "—"}
                                </span>
                              </div>
                            </td>
                            <td className={`${tdClass} text-right`}>
                              <span className="font-semibold">{s.totalBills}</span>
                            </td>
                            <td className={`${tdClass} text-right`}>
                              <span className="font-black text-slate-900 dark:text-slate-100">
                                {fmt(s.totalBilled)}
                              </span>
                            </td>
                            <td className={`${tdClass} text-right`}>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {fmt(s.totalPaid)}
                              </span>
                            </td>
                            <td className={`${tdClass} text-right`}>
                              <span
                                className={`font-bold ${
                                  s.outstanding > 0
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-slate-400"
                                }`}
                              >
                                {fmt(s.outstanding)}
                              </span>
                            </td>
                            <td className={`${tdClass} text-center`}>
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">
                                  {s.paymentRate}%
                                </span>
                                <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${s.paymentRate}%`,
                                      background:
                                        s.paymentRate >= 90
                                          ? "#10b981"
                                          : s.paymentRate >= 70
                                          ? "#f59e0b"
                                          : "#ef4444",
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className={`${tdClass} text-center`}>
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${
                                  GRADE_STYLES[s.grade] || ""
                                }`}
                              >
                                {s.grade}
                              </span>
                            </td>
                            <td className={`${tdClass} text-center`}>
                              <span
                                className={`font-bold text-[11px] ${
                                  s.dpo > 60
                                    ? "text-rose-600"
                                    : s.dpo > 30
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                {s.dpo}d
                              </span>
                            </td>
                            <td className={`${tdClass} text-center`}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSupplier(s);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-200 dark:border-amber-500/30 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 mx-auto"
                              >
                                <FaEye size={10} />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Showing {(page - 1) * PAGE_SIZE + 1}–
                      {Math.min(page * PAGE_SIZE, filteredSuppliers.length)} of{" "}
                      {filteredSuppliers.length} suppliers
                    </span>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            page === p
                              ? "bg-amber-600 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ))}

          {/* ── TAB 2: BILL LEDGER ───────────────────────────── */}
          {activeTab === "bills" &&
            (loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full min-w-[920px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className={thClass}>
                        <div className="flex items-center gap-1">
                          <FaFileInvoice size={9} /> Voucher
                        </div>
                      </th>
                      <th className={thClass}>
                        <div className="flex items-center gap-1">
                          <FaCalendarAlt size={9} /> Date
                        </div>
                      </th>
                      <th className={thClass}>
                        <div className="flex items-center gap-1">
                          <FaBuilding size={9} /> Supplier
                        </div>
                      </th>
                      <th className={thClass}>Division</th>
                      <th className={`${thClass} text-right`}>Bill Amt</th>
                      <th className={`${thClass} text-right`}>Paid</th>
                      <th className={`${thClass} text-right`}>Balance</th>
                      <th className={`${thClass} text-center`}>Payment %</th>
                      <th className={`${thClass} text-center`}>Aging</th>
                      <th className={`${thClass} text-center`}>Status</th>
                      <th className="px-3.5 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {filteredBills.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-xs text-slate-400">
                          No purchase bills found matching the search criteria
                        </td>
                      </tr>
                    ) : (
                      filteredBills.slice(0, 250).map((b, i) => (
                        <tr
                          key={i}
                          onClick={() => setSelectedBill(b)}
                          className="hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors cursor-pointer"
                        >
                          <td className={tdClass}>
                            <span className="font-mono text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                              {b.voucherId}
                            </span>
                          </td>
                          <td className={tdClass}>
                            <span className="text-[11px]">{b.billDate?.slice(0, 10) || "—"}</span>
                          </td>
                          <td className={tdClass}>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                              {b.supplierName}
                            </div>
                          </td>
                          <td className={tdClass}>
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                              {b.division}
                            </span>
                          </td>
                          <td className={`${tdClass} text-right`}>
                            <span className="font-black text-slate-900 dark:text-slate-100">
                              {fmt(b.amount)}
                            </span>
                          </td>
                          <td className={`${tdClass} text-right`}>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {fmt(b.paidAgainstBill)}
                            </span>
                          </td>
                          <td className={`${tdClass} text-right`}>
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {fmt(b.balanceDue)}
                            </span>
                          </td>
                          <td className={`${tdClass} text-center`}>
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
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
                          <td className={`${tdClass} text-center`}>
                            <span
                              className={`text-[10.5px] font-bold ${
                                b.agingDays > 90
                                  ? "text-rose-600"
                                  : b.agingDays > 60
                                  ? "text-orange-600"
                                  : b.agingDays > 30
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {b.agingDays}d
                            </span>
                          </td>
                          <td className={`${tdClass} text-center`}>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                STATUS_STYLES[b.status] || ""
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className={`${tdClass} text-center`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBill(b);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-500/20 text-slate-700 dark:text-slate-300 text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 mx-auto"
                            >
                              <FaEye size={9} />
                              <span>Audit</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ))}

          {/* ── TAB 3: MONTH-ON-MONTH ───────────────────────── */}
          {activeTab === "mom" && (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full min-w-[650px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className={thClass}>Month</th>
                    <th className={`${thClass} text-right`}>Purchase Bills</th>
                    <th className={`${thClass} text-right`}>Payments Made</th>
                    <th className={`${thClass} text-right`}>Unpaid Gap</th>
                    <th className={`${thClass} text-center`}>Payment Rate</th>
                    <th className={`${thClass} text-right`}>Bill Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {trendData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                        No trend data available
                      </td>
                    </tr>
                  ) : (
                    trendData.map((t, i) => (
                      <tr
                        key={i}
                        className="hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors"
                      >
                        <td className={tdClass}>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {t.month}
                          </span>
                        </td>
                        <td className={`${tdClass} text-right font-black text-slate-900 dark:text-slate-100`}>
                          {fmt(t.salesValue)}
                        </td>
                        <td className={`${tdClass} text-right font-bold text-emerald-600 dark:text-emerald-400`}>
                          {fmt(t.collectedValue)}
                        </td>
                        <td className={`${tdClass} text-right font-bold text-rose-600 dark:text-rose-400`}>
                          {fmt(t.gap)}
                        </td>
                        <td className={`${tdClass} text-center`}>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${t.realizationRate}%`,
                                  background:
                                    t.realizationRate >= 90
                                      ? "#10b981"
                                      : t.realizationRate >= 70
                                      ? "#f59e0b"
                                      : "#ef4444",
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-black">{t.realizationRate}%</span>
                          </div>
                        </td>
                        <td className={`${tdClass} text-right font-semibold`}>
                          {t.orderCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TAB 4: STATE-WISE SUMMARY ───────────────────── */}
          {activeTab === "states" && (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full min-w-[650px]">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className={thClass}>#</th>
                    <th className={thClass}>State / Territory</th>
                    <th className={`${thClass} text-right`}>Purchase Value</th>
                    <th className={`${thClass} text-right`}>Payments Made</th>
                    <th className={`${thClass} text-right`}>Suppliers</th>
                    <th className={`${thClass} text-center`}>Payment Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {stateData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                        No state data available
                      </td>
                    </tr>
                  ) : (
                    stateData.map((s, i) => (
                      <tr
                        key={i}
                        className="hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors"
                      >
                        <td className={tdClass}>
                          <span className="text-slate-400 font-bold text-[11px]">#{i + 1}</span>
                        </td>
                        <td className={tdClass}>
                          <div className="flex items-center gap-1.5">
                            <FaMapMarkerAlt className="text-amber-500 shrink-0" size={10} />
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {s.state}
                            </span>
                          </div>
                        </td>
                        <td className={`${tdClass} text-right font-black text-slate-900 dark:text-slate-100`}>
                          {fmt(s.salesValue)}
                        </td>
                        <td className={`${tdClass} text-right font-bold text-emerald-600 dark:text-emerald-400`}>
                          {fmt(s.collectedValue)}
                        </td>
                        <td className={`${tdClass} text-right font-semibold`}>{s.count}</td>
                        <td className={`${tdClass} text-center`}>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${s.efficiency}%`,
                                  background:
                                    s.efficiency >= 90
                                      ? "#10b981"
                                      : s.efficiency >= 70
                                      ? "#f59e0b"
                                      : "#ef4444",
                                }}
                              />
                            </div>
                            <span className="text-[11px] font-black">{s.efficiency}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Supplier Ledger Drilldown Modal */}
      {selectedSupplier && (
        <SupplierLedgerDrilldownModal
          isOpen={Boolean(selectedSupplier)}
          onClose={() => setSelectedSupplier(null)}
          supplier={selectedSupplier}
          bills={billLedger}
        />
      )}

      {/* Purchase Bill Detail Modal */}
      {selectedBill && (
        <PurchaseBillDetailModal
          isOpen={Boolean(selectedBill)}
          onClose={() => setSelectedBill(null)}
          bill={selectedBill}
        />
      )}
    </>
  );
}
