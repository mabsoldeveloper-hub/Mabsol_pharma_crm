"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaChartLine,
  FaRupeeSign,
  FaReceipt,
  FaTimes,
  FaSearch,
  FaSync,
  FaFileCsv,
  FaChevronLeft,
  FaChevronRight,
  FaFileInvoiceDollar,
  FaCalendarAlt,
  FaEye,
  FaFilter,
  FaUndo,
} from "react-icons/fa";
import Link from "next/link";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";

interface TotalSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Marg ERP Consolidated Sales Book Filter Options
const MARG_FILTER_OPTIONS = [
  { id: "S", label: "3. Sale (Gross Sales Invoices)", desc: "Gross sale bills only" },
  { id: "NET_SALE", label: "2. Sale - S/R (Sales Net of Returns)", desc: "Sales minus returns" },
  { id: "R", label: "5. Sales Return (Credit Notes)", desc: "Return credit notes only" },
  { id: "S_AND_R", label: "1. Sal S/R Bk + R (Sales & Returns Book)", desc: "All sales + returns" },
  { id: "ALL", label: "All Sales Vouchers", desc: "All voucher types" },
];

export default function TotalSalesModal({ isOpen, onClose }: TotalSalesModalProps) {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [salesFilterMode, setSalesFilterMode] = useState<string>("S");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const loadData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      let url = `/api/sales/invoice?type=${salesFilterMode}`;
      if (selectedCompany?._id) {
        url += `&companyId=${selectedCompany._id}`;
      }
      if (selectedFY) {
        if (selectedFY.isAll) {
          url += "&fyId=ALL";
        } else if (selectedFY._id) {
          url += `&fyId=${selectedFY._id}`;
          if (selectedFY.startDate && selectedFY.endDate) {
            const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
            const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
            url += `&startDate=${s}&endDate=${e}`;
          }
        }
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && Array.isArray(data.invoices)) {
        setInvoices(data.invoices);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.error("Failed to load sales invoices in modal:", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, selectedFY, salesFilterMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered invoices based on search
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return invoices;
    return invoices.filter(
      (inv) =>
        String(inv.vcn || "").toLowerCase().includes(s) ||
        String(inv.voucher || "").toLowerCase().includes(s) ||
        String(inv.customer || "").toLowerCase().includes(s) ||
        String(inv.city || "").toLowerCase().includes(s) ||
        String(inv.date || "").toLowerCase().includes(s) ||
        String(inv.gst || "").toLowerCase().includes(s)
    );
  }, [invoices, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, salesFilterMode]);

  // Calculated Summary Totals
  const summaryMetrics = useMemo(() => {
    let grossSales = 0;
    let salesReturns = 0;
    let grossCount = 0;
    let returnCount = 0;
    let totalTaxable = 0;
    let totalTax = 0;

    filtered.forEach((inv) => {
      const val = Number(inv.finalAmount || inv.total || 0);
      const isReturn = inv.type === "R" || String(inv.vcn || "").startsWith("CN");

      if (isReturn) {
        salesReturns += val;
        returnCount++;
      } else {
        grossSales += val;
        grossCount++;
      }

      totalTaxable += Number(inv.taxable || 0);
      totalTax += Number(inv.tax || 0);
    });

    const netSales = grossSales - salesReturns;

    return {
      grossSales,
      salesReturns,
      netSales,
      grossCount,
      returnCount,
      totalCount: filtered.length,
      totalTaxable,
      totalTax,
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // CSV Export
  const exportToCSV = () => {
    if (filtered.length === 0) return;

    const headers = [
      "SR NO",
      "DATE",
      "VOUCHER TYPE",
      "BILL NO (VCN)",
      "CUSTOMER NAME",
      "CITY",
      "TAXABLE VALUE",
      "TAX AMOUNT",
      "BILL VALUE",
    ];

    const rows = filtered.map((inv, idx) => [
      idx + 1,
      inv.date || "",
      inv.type === "R" ? "Sales Return" : "Sale Invoice",
      inv.vcn || inv.voucher || "",
      `"${(inv.customer || "").replace(/"/g, '""')}"`,
      `"${(inv.city || "").replace(/"/g, '""')}"`,
      Number(inv.taxable || 0).toFixed(2),
      Number(inv.tax || 0).toFixed(2),
      Number(inv.finalAmount || 0).toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Sales_Book_${salesFilterMode}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-500/20 text-white flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex-shrink-0">
              <FaChartLine className="text-sm sm:text-xl" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-bold text-white tracking-wide m-0 flex items-center gap-1.5 sm:gap-2 truncate">
                Consolidated Sales Book
                <span className="hidden xs:inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex-shrink-0">
                  {selectedFY?.fyName || "FY Selected"}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-300 m-0 truncate hidden sm:block">
                Marg ERP-style Consolidated Sales Register with Gross Sales, Returns & Net Sales filtering
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={loadData}
              disabled={loading}
              title="Refresh Data"
              className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10"
            >
              <FaSync className={`text-xs sm:text-sm ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={exportToCSV}
              title="Export to CSV"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-600/30 text-emerald-200 hover:bg-emerald-600/50 transition-all border border-emerald-500/40 text-[10px] sm:text-xs font-medium"
            >
              <FaFileCsv className="text-xs sm:text-sm" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-white/10 text-gray-300 hover:bg-red-500 hover:text-white transition-all border border-white/10"
            >
              <FaTimes className="text-xs sm:text-base" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 bg-slate-50/50">
          
          {/* MARG CONSOLIDATED FILTER SELECTOR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-gradient-to-r from-indigo-900/90 via-slate-900 to-indigo-950 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-indigo-500/30 shadow-md text-white">
            <div className="flex items-center gap-2">
              <FaFilter size={13} className="text-indigo-400 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold tracking-wide uppercase text-indigo-200 shrink-0">
                Less Return's Filter:
              </span>
            </div>

            <div className="flex-1 max-w-xl">
              <select
                value={salesFilterMode}
                onChange={(e) => setSalesFilterMode(e.target.value)}
                className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl bg-white/15 text-white border border-indigo-400/40 outline-none focus:ring-2 focus:ring-indigo-400 transition-all backdrop-blur-md cursor-pointer truncate"
              >
                {MARG_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="text-gray-900 font-medium">
                    {opt.label} — ({opt.desc})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[10px] sm:text-[11px] font-semibold text-indigo-300 bg-white/10 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-white/10 whitespace-nowrap self-start sm:self-auto">
              Active: <span className="text-white font-bold">{MARG_FILTER_OPTIONS.find(o => o.id === salesFilterMode)?.label.split(" ")[1]}</span>
            </div>
          </div>

          {/* DYNAMIC SUMMARY CARDS DEPENDING ON FILTER MODE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            
            {/* Card 1 */}
            <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-4 bg-gradient-to-br from-indigo-50 to-blue-50/60 border border-indigo-100 shadow-xs">
              <div className="flex items-center justify-between text-indigo-600 mb-1">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-700 truncate">
                  {salesFilterMode === "NET_SALE"
                    ? "Net Sales"
                    : salesFilterMode === "R"
                    ? "Sales Returns"
                    : "Gross Sales"}
                </span>
                <FaReceipt className="text-xs sm:text-base flex-shrink-0" />
              </div>
              <div className="text-sm sm:text-xl font-bold text-gray-900 truncate">
                ₹{" "}
                {salesFilterMode === "NET_SALE"
                  ? summaryMetrics.netSales.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                  : salesFilterMode === "R"
                  ? summaryMetrics.salesReturns.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                  : summaryMetrics.grossSales.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] sm:text-[11px] text-indigo-600/80 mt-0.5 truncate hidden xs:block">
                {salesFilterMode === "NET_SALE"
                  ? "Gross minus Returns"
                  : "Exact Marg Sales Book match"}
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-4 bg-gradient-to-br from-cyan-50 to-sky-50/60 border border-cyan-100 shadow-xs">
              <div className="flex items-center justify-between text-cyan-600 mb-1">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-cyan-700 truncate">
                  {salesFilterMode === "NET_SALE" ? "Gross Value" : "Taxable Amount"}
                </span>
                <FaRupeeSign className="text-xs sm:text-base flex-shrink-0" />
              </div>
              <div className="text-sm sm:text-xl font-bold text-gray-900 truncate">
                ₹{" "}
                {salesFilterMode === "NET_SALE"
                  ? summaryMetrics.grossSales.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                  : summaryMetrics.totalTaxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] sm:text-[11px] text-cyan-600/80 mt-0.5 truncate hidden xs:block">
                {salesFilterMode === "NET_SALE" ? `Count: ${summaryMetrics.grossCount} Gross` : "Net taxable turnover"}
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-4 bg-gradient-to-br from-rose-50 to-pink-50/60 border border-rose-100 shadow-xs">
              <div className="flex items-center justify-between text-rose-600 mb-1">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-700 truncate">
                  {salesFilterMode === "NET_SALE" ? "Returns Value" : "Total Tax"}
                </span>
                {salesFilterMode === "NET_SALE" ? <FaUndo className="text-xs sm:text-base flex-shrink-0" /> : <FaFileInvoiceDollar className="text-xs sm:text-base flex-shrink-0" />}
              </div>
              <div className="text-sm sm:text-xl font-bold text-rose-700 truncate">
                ₹{" "}
                {salesFilterMode === "NET_SALE"
                  ? summaryMetrics.salesReturns.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                  : summaryMetrics.totalTax.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] sm:text-[11px] text-rose-600/80 mt-0.5 truncate hidden xs:block">
                {salesFilterMode === "NET_SALE" ? `Count: ${summaryMetrics.returnCount} Notes` : "CGST + SGST + IGST"}
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-4 bg-gradient-to-br from-purple-50 to-violet-50/60 border border-purple-100 shadow-xs">
              <div className="flex items-center justify-between text-purple-600 mb-1">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-purple-700 truncate">
                  Total Vouchers
                </span>
                <FaCalendarAlt className="text-xs sm:text-base flex-shrink-0" />
              </div>
              <div className="text-sm sm:text-xl font-bold text-gray-900 truncate">
                {summaryMetrics.totalCount} <span className="text-xs font-normal text-gray-500">Vouchers</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-purple-600/80 mt-0.5 truncate hidden xs:block">
                Matched in active filter
              </p>
            </div>
          </div>

          {/* SEARCH BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="relative w-full sm:w-80">
              <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Bill No, Customer, City, Date..."
                className="w-full pl-8 pr-3 py-1.5 sm:py-2 text-xs rounded-lg sm:rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>

            <div className="text-[11px] sm:text-xs font-medium text-gray-500 text-right sm:text-left">
              Showing <span className="font-bold text-gray-800">{filtered.length}</span> of{" "}
              <span className="font-bold text-gray-800">{invoices.length}</span> Total Vouchers
            </div>
          </div>

          {/* INVOICES TABLE */}
          <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-white border border-gray-200/80 shadow-sm">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-16 text-xs sm:text-sm font-medium text-gray-500 flex flex-col items-center justify-center gap-2">
                  <FaSync size={20} className="animate-spin text-indigo-600" />
                  Loading Sales Register Data...
                </div>
              ) : (
                <table className="w-full text-[11px] sm:text-xs text-left min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-semibold uppercase tracking-wider border-b border-gray-200">
                      <th className="py-2.5 px-3 sm:py-3 sm:px-3.5">Sr.</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-3.5">Bill Date</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-3.5">Voucher Type</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-3.5">Bill No (VCN)</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-3.5">Customer Name</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-3.5 text-right">Taxable (₹)</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-3.5 text-right">Tax (₹)</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-3.5 text-right">Bill Value (₹)</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginated.length > 0 ? (
                      paginated.map((inv, idx) => {
                        const srNo = (currentPage - 1) * pageSize + idx + 1;
                        const isReturn = inv.type === "R" || String(inv.vcn || "").startsWith("CN");
                        const billVal = Number(inv.finalAmount || inv.total || 0);
                        const taxVal = Number(inv.tax || 0);
                        const taxableVal = Number(inv.taxable || 0);

                        return (
                          <tr
                            key={inv._id || idx}
                            className={`transition-colors ${
                              isReturn ? "bg-rose-50/60 hover:bg-rose-100/70" : "hover:bg-indigo-50/50"
                            }`}
                          >
                            <td className="py-2.5 px-3.5 font-medium text-gray-400">{srNo}</td>
                            <td className="py-2.5 px-3.5 font-semibold text-gray-700 whitespace-nowrap">
                              {inv.date || "-"}
                            </td>
                            <td className="py-2.5 px-3.5 whitespace-nowrap">
                              {isReturn ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                                  Sales Return (CN)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                  Sale Invoice (S)
                                </span>
                              )}
                            </td>
                            <td className={`py-2.5 px-3.5 font-bold whitespace-nowrap ${isReturn ? "text-rose-700" : "text-indigo-600"}`}>
                              {inv.vcn || inv.voucher || "-"}
                            </td>
                            <td className="py-2.5 px-3.5 font-semibold text-gray-800">
                              <div>{inv.customer || "Party Account"}</div>
                              {inv.city && (
                                <div className="text-[10px] font-normal text-gray-400">{inv.city}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-medium text-gray-700">
                              {taxableVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-medium text-emerald-600">
                              {taxVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className={`py-2.5 px-3.5 text-right font-bold ${isReturn ? "text-rose-700" : "text-gray-900"}`}>
                              {isReturn ? `- ₹ ${billVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `₹ ${billVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <Link
                                href={isReturn ? "/dashboard/sales/sale-return" : "/dashboard/sales/invoice"}
                                onClick={onClose}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all font-medium"
                              >
                                <FaEye size={11} />
                                <span>View</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-gray-400 font-medium">
                          No Vouchers Found for Active Filter
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* PAGINATION FOOTER */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200/80 text-xs text-gray-500">
              <span>
                Page <span className="font-semibold text-gray-800">{currentPage}</span> of{" "}
                <span className="font-semibold text-gray-800">{totalPages}</span> &middot; {filtered.length} total rows
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center h-8 w-8 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-indigo-600 hover:text-white disabled:opacity-40 transition-all shadow-sm"
                >
                  <FaChevronLeft size={10} />
                </button>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center h-8 w-8 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-indigo-600 hover:text-white disabled:opacity-40 transition-all shadow-sm"
                >
                  <FaChevronRight size={10} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
