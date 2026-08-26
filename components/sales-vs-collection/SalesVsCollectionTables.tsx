"use client";
import React, { useState, useMemo } from "react";
import {
  FaSearch,
  FaDownload,
  FaUser,
  FaFileInvoice,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaSort,
  FaSortUp,
  FaSortDown,
} from "react-icons/fa";
import CustomerLedgerDrilldownModal from "./CustomerLedgerDrilldownModal";
import * as XLSX from "xlsx";

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
  customerLedger: any[];
  orderLedger: any[];
  trendData: any[];
  stateData: any[];
  loading: boolean;
}

type SortDir = "asc" | "desc" | null;

function SortIcon({ dir }: { dir: SortDir }) {
  if (!dir) return <FaSort className="text-slate-400 text-[9px]" />;
  return dir === "asc" ? (
    <FaSortUp className="text-indigo-600 text-[9px]" />
  ) : (
    <FaSortDown className="text-indigo-600 text-[9px]" />
  );
}

export default function SalesVsCollectionTables({
  customerLedger,
  orderLedger,
  trendData,
  stateData,
  loading,
}: TablesProps) {
  const [activeTab, setActiveTab] = useState<
    "customers" | "orders" | "mom" | "states"
  >("customers");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("totalBilled");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const PAGE_SIZE = 20;

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const filteredCustomers = useMemo(() => {
    let rows = [...customerLedger];
    if (search)
      rows = rows.filter((r) =>
        [r.customerName, r.customerId, r.city].some((f) =>
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
  }, [customerLedger, search, gradeFilter, sortKey, sortDir]);

  const filteredOrders = useMemo(() => {
    if (!search) return orderLedger;
    return orderLedger.filter((r) =>
      [r.voucherId, r.customerName, r.customerId].some((f) =>
        f?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [orderLedger, search]);

  const filteredStates = useMemo(() => {
    if (!search) return stateData;
    return stateData.filter((r) =>
      r.state?.toLowerCase().includes(search.toLowerCase())
    );
  }, [stateData, search]);

  const thClass =
    "text-left text-slate-600 dark:text-slate-300 font-bold py-3.5 px-4 text-xs whitespace-nowrap cursor-pointer select-none hover:text-indigo-600 dark:hover:text-white transition-colors";

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    // Sheet 1: Customer Ledger
    const custData = customerLedger.map((c) => ({
      "Customer Code": c.customerId,
      "Customer Name": c.customerName,
      City: c.city,
      "Total Orders": c.totalOrders,
      "Total Billed (₹)": c.totalBilled,
      "Collected (₹)": c.totalCollected,
      "Outstanding (₹)": c.outstanding,
      "Realization %": c.realizationRate,
      Grade: c.grade,
      "DSO (Days)": c.dso,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(custData),
      "Customer Ledger"
    );
    // Sheet 2: Order Ledger
    const ordData = orderLedger.map((o) => ({
      "Voucher No": o.voucherId,
      Date: o.invoiceDate,
      Customer: o.customerName,
      Division: o.division,
      "Amount (₹)": o.amount,
      "Aging (Days)": o.agingDays,
      Status: o.status,
      "Payment Mode": o.paymentMode,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(ordData),
      "Order Ledger"
    );
    // Sheet 3: MoM
    const momData = trendData.map((t) => ({
      Month: t.month,
      "Sales (₹)": t.salesValue,
      "Collected (₹)": t.collectedValue,
      "Gap (₹)": t.gap,
      "Realization %": t.realizationRate,
      "Order Count": t.orderCount,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(momData),
      "Month-on-Month"
    );
    // Sheet 4: State
    const stateSheetData = stateData.map((s, i) => ({
      Rank: i + 1,
      State: s.state,
      "Sales (₹)": s.salesValue,
      "Collected (₹)": s.collectedValue,
      "Efficiency %": s.efficiency,
      "Customer Count": s.count,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(stateSheetData),
      "State Performance"
    );
    XLSX.writeFile(
      wb,
      `Sales_vs_Collection_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const TABS = [
    { key: "customers", label: "👥 Customer Ledger", count: customerLedger.length },
    { key: "orders", label: "📋 Order Transactions", count: orderLedger.length },
    { key: "mom", label: "📅 MoM Matrix", count: trendData.length },
    { key: "states", label: "🗺️ State Summary", count: stateData.length },
  ] as const;

  const pagedCustomers = filteredCustomers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );
  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {/* Navigation Tabs + Export Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTab(t.key as any);
                  setPage(1);
                  setSearch("");
                }}
                className={`flex-none flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === t.key
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    activeTab === t.key
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={exportToExcel}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <FaDownload size={11} />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>

        {/* Search & Sub-Filter Ribbon */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200/80 dark:border-slate-800">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder={
                activeTab === "customers"
                  ? "Search by customer name, code, city..."
                  : activeTab === "orders"
                  ? "Search by voucher no, customer, division..."
                  : "Search state name..."
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
          </div>
          {activeTab === "customers" && (
            <select
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
            >
              <option value="ALL">All Risk Grades</option>
              <option value="A">Grade A (≥90%)</option>
              <option value="B">Grade B (75–89%)</option>
              <option value="C">Grade C (50–74%)</option>
              <option value="D">Grade D (&lt;50%)</option>
            </select>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm font-medium animate-pulse">
              Loading ledger data...
            </div>
          ) : (
            <>
              {/* TAB 1: CUSTOMER LEDGER */}
              {activeTab === "customers" && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700">
                      <th
                        className={thClass}
                        onClick={() => handleSort("customerId")}
                      >
                        Code <SortIcon dir={sortKey === "customerId" ? sortDir : null} />
                      </th>
                      <th
                        className={thClass}
                        onClick={() => handleSort("customerName")}
                      >
                        Customer Name{" "}
                        <SortIcon dir={sortKey === "customerName" ? sortDir : null} />
                      </th>
                      <th className={thClass}>City</th>
                      <th
                        className={`${thClass} text-right`}
                        onClick={() => handleSort("totalOrders")}
                      >
                        Orders <SortIcon dir={sortKey === "totalOrders" ? sortDir : null} />
                      </th>
                      <th
                        className={`${thClass} text-right`}
                        onClick={() => handleSort("totalBilled")}
                      >
                        Invoiced (₹){" "}
                        <SortIcon dir={sortKey === "totalBilled" ? sortDir : null} />
                      </th>
                      <th
                        className={`${thClass} text-right`}
                        onClick={() => handleSort("totalCollected")}
                      >
                        Collected (₹){" "}
                        <SortIcon dir={sortKey === "totalCollected" ? sortDir : null} />
                      </th>
                      <th
                        className={`${thClass} text-right`}
                        onClick={() => handleSort("outstanding")}
                      >
                        Outstanding{" "}
                        <SortIcon dir={sortKey === "outstanding" ? sortDir : null} />
                      </th>
                      <th
                        className={`${thClass} text-center`}
                        onClick={() => handleSort("realizationRate")}
                      >
                        Realization %{" "}
                        <SortIcon dir={sortKey === "realizationRate" ? sortDir : null} />
                      </th>
                      <th className="text-center text-slate-600 dark:text-slate-300 font-bold py-3.5 px-4 text-xs">
                        Grade
                      </th>
                      <th
                        className={`${thClass} text-center`}
                        onClick={() => handleSort("dso")}
                      >
                        DSO <SortIcon dir={sortKey === "dso" ? sortDir : null} />
                      </th>
                      <th className="text-center text-slate-600 dark:text-slate-300 font-bold py-3.5 px-4 text-xs">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCustomers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="py-12 text-center text-slate-400 font-medium"
                        >
                          No customer ledger records match your filter criteria
                        </td>
                      </tr>
                    ) : (
                      pagedCustomers.map((c: any, i: number) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px] font-medium">
                            {c.customerId}
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-bold max-w-[180px] truncate">
                            {c.customerName || "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                            {c.city || "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 text-right font-semibold">
                            {c.totalOrders}
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100 text-right font-bold">
                            {fmt(c.totalBilled)}
                          </td>
                          <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 text-right font-black">
                            {fmt(c.totalCollected)}
                          </td>
                          <td className="py-3 px-4 text-rose-600 dark:text-rose-400 text-right font-black">
                            {fmt(c.outstanding)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`font-black text-xs ${
                                  c.realizationRate >= 90
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : c.realizationRate >= 70
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {c.realizationRate}%
                              </span>
                              <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, c.realizationRate)}%`,
                                    background:
                                      c.realizationRate >= 90
                                        ? "#10b981"
                                        : c.realizationRate >= 70
                                        ? "#f59e0b"
                                        : "#ef4444",
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-black ${
                                GRADE_STYLES[c.grade] || GRADE_STYLES.B
                              }`}
                            >
                              Grade {c.grade}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                            {c.dso}d
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedCustomer(c)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 2: ORDER LEDGER (Order Invoiced vs Against-Ledger Receipts) */}
              {activeTab === "orders" && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700">
                      <th className={thClass}>Voucher No</th>
                      <th className={thClass}>Invoice Date</th>
                      <th className={thClass}>Customer Name</th>
                      <th className={thClass}>Territory / ASM</th>
                      <th className={`${thClass} text-right`}>Order Invoiced (₹)</th>
                      <th className={`${thClass} text-right`}>Receipts Collected (₹)</th>
                      <th className={`${thClass} text-right`}>Balance Due (₹)</th>
                      <th className={`${thClass} text-center`}>Settlement %</th>
                      <th className={`${thClass} text-center`}>Aging</th>
                      <th className={`${thClass} text-center`}>Status</th>
                      <th className={thClass}>Payment Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice(0, 150).map((o: any, i: number) => {
                      const coll = o.collectedAgainstOrder !== undefined ? o.collectedAgainstOrder : o.amount;
                      const bal = o.balanceDue !== undefined ? o.balanceDue : Math.max(0, o.amount - coll);
                      const pct = o.realizationPct !== undefined ? o.realizationPct : (o.amount > 0 ? Math.round((coll / o.amount) * 100) : 0);

                      return (
                        <tr
                          key={i}
                          className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                            {o.voucherId}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                            {o.invoiceDate}
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-bold max-w-[160px] truncate">
                            {o.customerName || "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                            {o.asm && o.asm !== "GENERAL" ? o.asm : o.state || "—"}
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100 text-right font-black">
                            {fmt(o.amount)}
                          </td>
                          <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 text-right font-black">
                            {fmt(coll)}
                          </td>
                          <td className="py-3 px-4 text-rose-600 dark:text-rose-400 text-right font-black">
                            {fmt(bal)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                                {pct}%
                              </span>
                              <div className="h-1.5 w-14 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, pct)}%`,
                                    background: pct >= 100 ? "#10b981" : pct > 0 ? "#f59e0b" : "#ef4444",
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-xs font-bold ${
                                o.agingDays > 60
                                  ? "text-rose-600 dark:text-rose-400"
                                  : o.agingDays > 30
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {o.agingDays}d
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-lg border text-[10px] font-black ${
                                STATUS_STYLES[o.status] || STATUS_STYLES.UNPAID
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                            {o.paymentMode}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* TAB 3: MOM MATRIX */}
              {activeTab === "mom" && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700">
                      <th className={thClass}>Month</th>
                      <th className={`${thClass} text-right`}>Orders Count</th>
                      <th className={`${thClass} text-right`}>Sales Invoiced (₹)</th>
                      <th className={`${thClass} text-right`}>Collections Received (₹)</th>
                      <th className={`${thClass} text-right`}>Net Cash Gap (₹)</th>
                      <th className={`${thClass} text-center`}>Realization Rate %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendData.map((t: any, i: number) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-bold">
                          {t.month}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 text-right font-semibold">
                          {t.orderCount}
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-slate-100 text-right font-black">
                          {fmt(t.salesValue)}
                        </td>
                        <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 text-right font-black">
                          {fmt(t.collectedValue)}
                        </td>
                        <td className="py-3 px-4 text-rose-600 dark:text-rose-400 text-right font-black">
                          {fmt(t.gap)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-black text-xs ${
                              t.realizationRate >= 90
                                ? "text-emerald-600 dark:text-emerald-400"
                                : t.realizationRate >= 70
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {t.realizationRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* TAB 4: STATE SUMMARY */}
              {activeTab === "states" && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700">
                      <th className={`${thClass} text-center`}>Rank</th>
                      <th className={thClass}>State / Territory</th>
                      <th className={`${thClass} text-right`}>Orders Count</th>
                      <th className={`${thClass} text-right`}>Sales Value (₹)</th>
                      <th className={`${thClass} text-right`}>Collections (₹)</th>
                      <th className={`${thClass} text-center`}>Collection Efficiency %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStates
                      .sort((a, b) => b.salesValue - a.salesValue)
                      .map((s: any, i: number) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-center">
                            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black inline-flex items-center justify-center">
                              {i + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-bold">
                            {s.state}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 text-right font-semibold">
                            {s.count}
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100 text-right font-black">
                            {fmt(s.salesValue)}
                          </td>
                          <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 text-right font-black">
                            {fmt(s.collectedValue)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-black text-xs ${
                                s.efficiency >= 90
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : s.efficiency >= 70
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {s.efficiency}%
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

        {/* Pagination Bar for Customer Ledger */}
        {activeTab === "customers" && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filteredCustomers.length)} of{" "}
              {filteredCustomers.length} customers
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all cursor-pointer"
              >
                ← Prev
              </button>
              <span className="px-3 py-1 font-bold text-slate-700 dark:text-slate-300">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Drilldown History Modal */}
      <CustomerLedgerDrilldownModal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
        invoices={
          selectedCustomer
            ? (orderLedger || []).filter(
                (o) =>
                  o.customerId === selectedCustomer.customerId ||
                  o.customerName === selectedCustomer.customerName
              )
            : []
        }
      />
    </>
  );
}
