"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaTruck,
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
  FaTable,
} from "react-icons/fa";
import Link from "next/link";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";
import IndiaMapAreaBreakdown, { StateSummaryData } from "@/components/IndiaMapAreaBreakdown";

interface TotalPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Purchase Book Filter Options
const PURCHASE_FILTER_OPTIONS = [
  { id: "P", label: "Gross Purchase Invoices", desc: "Purchase bills only" },
  { id: "NET_PURCHASE", label: "Purchase Net of Returns", desc: "Purchases minus returns" },
  { id: "R", label: "Purchase Returns (Debit Notes)", desc: "Return debit notes only" },
  { id: "ALL", label: "All Purchase Vouchers", desc: "All voucher types" },
];

export default function TotalPurchaseModal({ isOpen, onClose }: TotalPurchaseModalProps) {
  const [activeTab, setActiveTab] = useState<"map" | "vouchers" | "summary">("map");
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [stateMapData, setStateMapData] = useState<StateSummaryData[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [purchaseFilterMode, setPurchaseFilterMode] = useState<string>("P");
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

  // Load Purchase Reports & India Map Rollup
  const loadData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      // 1. Fetch Purchase Reports
      let url = `/api/purchase/reports`;
      const params: string[] = [];
      if (selectedCompany?._id) {
        params.push(`companyId=${selectedCompany._id}`);
      }
      if (selectedFY?.startDate && selectedFY?.endDate) {
        const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
        const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
        params.push(`startDate=${s}&endDate=${e}`);
      }
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setInvoices(data.invoices || []);
        setReturns(data.returns || []);
      } else {
        setInvoices([]);
        setReturns([]);
      }

      // 2. Fetch India Map Rollup Data
      let mapUrl = `/api/dashboard/india-map`;
      const mapParams: string[] = [];
      if (selectedFY) {
        if (selectedFY.isAll || selectedFY.fyName?.toLowerCase().startsWith("all")) {
          mapParams.push("fy=All");
        } else if (selectedFY.fyName) {
          mapParams.push(`fy=${encodeURIComponent(selectedFY.fyName)}`);
        }
        if (selectedFY._id && selectedFY._id !== "ALL") {
          mapParams.push(`fyId=${selectedFY._id}`);
        }
      }
      if (selectedCompany?._id) {
        mapParams.push(`companyId=${selectedCompany._id}`);
      }
      if (mapParams.length > 0) {
        mapUrl += `?${mapParams.join("&")}`;
      }

      const mapRes = await fetch(mapUrl);
      if (mapRes.ok) {
        const mapJson = await mapRes.json();
        const list = mapJson.states || mapJson.stateData || [];
        if (Array.isArray(list)) {
          setStateMapData(list);
        }
      }
    } catch (err) {
      console.error("Failed to load purchase modal data:", err);
      setInvoices([]);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, selectedFY, selectedCompany]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combined Vouchers based on purchaseFilterMode
  const allVouchers = useMemo(() => {
    let list: any[] = [];

    const mappedBills = invoices.map((inv) => ({
      _id: inv._id,
      date: inv.billDate || inv.date || "",
      type: "P",
      typeName: "Purchase Invoice",
      number: inv.billNumber || inv.supplierInvoiceNo || inv.vcn || "PUR-BILL",
      vendorName: inv.vendorName || inv.supplierName || inv.NAME || "Supplier",
      city: inv.city || "",
      state: inv.state || "",
      taxable: Number(inv.subTotal || inv.taxable || 0),
      tax: Number(inv.taxAmount || inv.tax || 0),
      amount: Number(inv.netAmount || inv.finalAmount || inv.AMOUNT || 0),
    }));

    const mappedReturns = returns.map((ret) => ({
      _id: ret._id,
      date: ret.returnDate || ret.date || "",
      type: "R",
      typeName: "Purchase Return (DN)",
      number: ret.returnNumber || ret.debitNoteNo || "DN-RET",
      vendorName: ret.vendorName || ret.supplierName || "Supplier",
      city: ret.city || "",
      state: ret.state || "",
      taxable: Number(ret.subTotal || ret.taxable || 0),
      tax: Number(ret.taxAmount || ret.tax || 0),
      amount: Number(ret.netAmount || ret.finalAmount || 0),
    }));

    if (purchaseFilterMode === "P") {
      list = mappedBills;
    } else if (purchaseFilterMode === "R") {
      list = mappedReturns;
    } else {
      list = [...mappedBills, ...mappedReturns];
    }

    return list;
  }, [invoices, returns, purchaseFilterMode]);

  // Filtered vouchers based on search & selectedState
  const filtered = useMemo(() => {
    let list = allVouchers;
    if (selectedState) {
      const st = selectedState.trim().toLowerCase();
      list = list.filter(
        (v) =>
          String(v.state || "").toLowerCase().includes(st) ||
          String(v.city || "").toLowerCase().includes(st) ||
          String(v.vendorName || "").toLowerCase().includes(st)
      );
    }

    const s = search.trim().toLowerCase();
    if (!s) return list;

    return list.filter(
      (v) =>
        String(v.number || "").toLowerCase().includes(s) ||
        String(v.vendorName || "").toLowerCase().includes(s) ||
        String(v.city || "").toLowerCase().includes(s) ||
        String(v.state || "").toLowerCase().includes(s) ||
        String(v.date || "").toLowerCase().includes(s)
    );
  }, [allVouchers, search, selectedState]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, purchaseFilterMode, selectedState]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let grossPurchase = 0;
    let purchaseReturns = 0;
    let grossCount = 0;
    let returnCount = 0;
    let totalTaxable = 0;
    let totalTax = 0;

    allVouchers.forEach((v) => {
      const isReturn = v.type === "R";
      if (isReturn) {
        purchaseReturns += v.amount;
        returnCount++;
      } else {
        grossPurchase += v.amount;
        grossCount++;
      }
      totalTaxable += v.taxable;
      totalTax += v.tax;
    });

    const netPurchase = grossPurchase - purchaseReturns;

    return {
      grossPurchase,
      purchaseReturns,
      netPurchase,
      grossCount,
      returnCount,
      totalCount: filtered.length,
      totalTaxable,
      totalTax,
    };
  }, [allVouchers, filtered]);

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
      "BILL NO",
      "VENDOR NAME",
      "CITY",
      "STATE",
      "TAXABLE VALUE",
      "TAX AMOUNT",
      "BILL VALUE",
    ];

    const rows = filtered.map((v, idx) => [
      idx + 1,
      v.date || "",
      v.typeName,
      v.number || "",
      `"${(v.vendorName || "").replace(/"/g, '""')}"`,
      `"${(v.city || "").replace(/"/g, '""')}"`,
      `"${(v.state || "").replace(/"/g, '""')}"`,
      v.taxable.toFixed(2),
      v.tax.toFixed(2),
      v.amount.toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Purchase_Book_${purchaseFilterMode}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/40 dark:border-slate-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-b border-amber-500/20 text-white gap-2 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-amber-600/30 text-amber-400 border border-amber-400/30 flex-shrink-0">
              <FaTruck className="text-base sm:text-xl" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-bold text-white tracking-wide m-0 flex items-center gap-2 truncate">
                Total Inward Purchases & Area Map
                <span className="hidden xs:inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-500/30 text-amber-200 border border-amber-400/30 flex-shrink-0">
                  {selectedFY?.fyName || "FY Selected"}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-300 m-0 truncate hidden sm:block">
                Interactive State Purchase Inward Map, Area Rankings & Consolidated Register
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
            <button
              onClick={loadData}
              disabled={loading}
              title="Refresh Data"
              className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/10 text-white hover:bg-white/20 transition border border-white/10"
            >
              <FaSync className={`text-xs sm:text-sm ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={exportToCSV}
              title="Export to CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/30 text-emerald-200 hover:bg-emerald-600/50 transition border border-emerald-500/40 text-[10px] sm:text-xs font-medium"
            >
              <FaFileCsv className="text-xs sm:text-sm" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/10 text-gray-300 hover:bg-red-500 hover:text-white transition border border-white/10"
            >
              <FaTimes className="text-xs sm:text-base" />
            </button>
          </div>
        </div>

        {/* MODAL VIEW TABS */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-amber-500/20 text-xs font-semibold flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { id: "map", label: "🗺️ India Map & Area Analytics" },
              { id: "vouchers", label: "📋 Purchase Vouchers Register" },
              { id: "summary", label: "🏙️ State & Area Summary" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl transition text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-amber-600 text-white shadow-md shadow-amber-500/30 font-bold"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {selectedState && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-xl border border-amber-500/40">
              <span>State Filter: <strong>{selectedState}</strong></span>
              <button
                onClick={() => setSelectedState(null)}
                className="text-amber-400 hover:text-white font-bold ml-1"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
          
          {/* TAB 1: INDIA MAP & AREA ANALYTICS */}
          {activeTab === "map" && (
            <IndiaMapAreaBreakdown
              mode="purchase"
              stateData={stateMapData}
              selectedState={selectedState}
              onSelectState={(st) => {
                setSelectedState(st);
                if (st) {
                  setActiveTab("vouchers");
                }
              }}
              loading={loading}
            />
          )}

          {/* TAB 2: CONSOLIDATED PURCHASE REGISTER */}
          {activeTab === "vouchers" && (
            <div className="space-y-4">
              
              {/* PURCHASE FILTER SELECTOR */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-900 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-amber-500/30 shadow-md text-white">
                <div className="flex items-center gap-2">
                  <FaFilter size={13} className="text-amber-400 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold tracking-wide uppercase text-amber-200 shrink-0">
                    Purchase Book Filter:
                  </span>
                </div>

                <div className="flex-1 max-w-xl">
                  <select
                    value={purchaseFilterMode}
                    onChange={(e) => setPurchaseFilterMode(e.target.value)}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl bg-white/15 text-white border border-amber-400/40 outline-none focus:ring-2 focus:ring-amber-400 transition backdrop-blur-md cursor-pointer truncate"
                  >
                    {PURCHASE_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="text-gray-900 font-medium">
                        {opt.label} — ({opt.desc})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-[10px] sm:text-[11px] font-semibold text-amber-300 bg-white/10 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-white/10 whitespace-nowrap self-start sm:self-auto">
                  Active: <span className="text-white font-bold">{PURCHASE_FILTER_OPTIONS.find(o => o.id === purchaseFilterMode)?.label.split(" ")[0]}</span>
                </div>
              </div>

              {/* DYNAMIC SUMMARY CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-4 bg-gradient-to-br from-amber-50 to-orange-50/60 dark:from-amber-950/40 dark:to-slate-900/60 border border-amber-100 dark:border-amber-900/40 shadow-xs">
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 truncate">
                      {purchaseFilterMode === "NET_PURCHASE" ? "Net Purchases" : purchaseFilterMode === "R" ? "Purchase Returns" : "Gross Purchases"}
                    </span>
                    <FaReceipt className="text-xs sm:text-base flex-shrink-0" />
                  </div>
                  <div className="text-sm sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                    ₹ {summaryMetrics.netPurchase.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 truncate hidden xs:block">
                    {purchaseFilterMode === "NET_PURCHASE" ? "Gross minus Returns" : "Total Purchase Inward"}
                  </p>
                </div>

                <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-4 bg-gradient-to-br from-cyan-50 to-sky-50/60 dark:from-cyan-950/40 dark:to-slate-900/60 border border-cyan-100 dark:border-cyan-900/40 shadow-xs">
                  <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400 mb-1">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 truncate">
                      Taxable Amount
                    </span>
                    <FaRupeeSign className="text-xs sm:text-base flex-shrink-0" />
                  </div>
                  <div className="text-sm sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                    ₹ {summaryMetrics.totalTaxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-cyan-600/80 dark:text-cyan-400/80 mt-0.5 truncate hidden xs:block">
                    Net taxable purchase
                  </p>
                </div>

                <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-4 bg-gradient-to-br from-orange-50 to-rose-50/60 dark:from-orange-950/40 dark:to-slate-900/60 border border-orange-100 dark:border-orange-900/40 shadow-xs">
                  <div className="flex items-center justify-between text-orange-600 dark:text-orange-400 mb-1">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-300 truncate">
                      Debit Notes (Returns)
                    </span>
                    <FaUndo className="text-xs sm:text-base flex-shrink-0" />
                  </div>
                  <div className="text-sm sm:text-xl font-bold text-orange-700 dark:text-orange-400 truncate">
                    ₹ {summaryMetrics.purchaseReturns.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-orange-600/80 dark:text-orange-400/80 mt-0.5 truncate hidden xs:block">
                    Count: {summaryMetrics.returnCount} Debit Notes
                  </p>
                </div>

                <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-4 bg-gradient-to-br from-indigo-50 to-violet-50/60 dark:from-indigo-950/40 dark:to-slate-900/60 border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 truncate">
                      Total Vouchers
                    </span>
                    <FaCalendarAlt className="text-xs sm:text-base flex-shrink-0" />
                  </div>
                  <div className="text-sm sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                    {summaryMetrics.totalCount} <span className="text-xs font-normal text-gray-500">Vouchers</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5 truncate hidden xs:block">
                    Matched in active filter
                  </p>
                </div>
              </div>

              {/* SEARCH BAR */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs">
                <div className="relative w-full sm:w-80">
                  <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search Bill No, Vendor, City, Date..."
                    className="w-full pl-8 pr-3 py-1.5 sm:py-2 text-xs rounded-lg sm:rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white placeholder-gray-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
                  />
                </div>

                <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-slate-400 text-right sm:text-left">
                  Showing <span className="font-bold text-gray-800 dark:text-white">{filtered.length}</span> of{" "}
                  <span className="font-bold text-gray-800 dark:text-white">{allVouchers.length}</span> Total Vouchers
                </div>
              </div>

              {/* INVOICES TABLE */}
              <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-sm">
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="text-center py-16 text-xs sm:text-sm font-medium text-gray-500 flex flex-col items-center justify-center gap-2">
                      <FaSync size={20} className="animate-spin text-amber-600" />
                      Loading Purchase Register Data...
                    </div>
                  ) : (
                    <table className="w-full text-[11px] sm:text-xs text-left min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-900 text-white font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-slate-800">
                          <th className="py-2.5 px-3 sm:py-3 sm:px-3.5">Sr.</th>
                          <th className="py-2.5 px-3 sm:py-3 sm:px-3.5">Bill Date</th>
                          <th className="py-2.5 px-3 sm:py-3 sm:px-3.5">Voucher Type</th>
                          <th className="py-2.5 px-3 sm:py-3 sm:px-3.5">Bill / Inv No</th>
                          <th className="py-2.5 px-3 sm:py-3 sm:px-3.5">Supplier / Vendor</th>
                          <th className="py-2.5 px-3 sm:py-3 sm:px-3.5 text-right">Taxable (₹)</th>
                          <th className="py-2.5 px-3 sm:py-3 sm:px-3.5 text-right">Tax (₹)</th>
                          <th className="py-2.5 px-3 sm:py-3 sm:px-3.5 text-right">Bill Value (₹)</th>
                          <th className="py-2.5 px-3 sm:py-3 sm:px-3.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {paginated.length > 0 ? (
                          paginated.map((v, idx) => {
                            const srNo = (currentPage - 1) * pageSize + idx + 1;
                            const isReturn = v.type === "R";

                            return (
                              <tr
                                key={v._id || idx}
                                className={`transition-colors ${
                                  isReturn ? "bg-orange-50/60 dark:bg-orange-950/20 hover:bg-orange-100/70" : "hover:bg-amber-50/50 dark:hover:bg-slate-800/50"
                                }`}
                              >
                                <td className="py-2.5 px-3.5 font-medium text-gray-400">{srNo}</td>
                                <td className="py-2.5 px-3.5 font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">
                                  {v.date || "-"}
                                </td>
                                <td className="py-2.5 px-3.5 whitespace-nowrap">
                                  {isReturn ? (
                                    <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold text-[10px]">
                                      Debit Note (R)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                                      Purchase Bill (P)
                                    </span>
                                  )}
                                </td>
                                <td className={`py-2.5 px-3.5 font-bold whitespace-nowrap ${isReturn ? "text-orange-700 dark:text-orange-400" : "text-amber-700 dark:text-amber-400"}`}>
                                  {v.number || "-"}
                                </td>
                                <td className="py-2.5 px-3.5 font-semibold text-gray-800 dark:text-slate-200">
                                  <div>{v.vendorName || "Supplier Account"}</div>
                                  {(v.city || v.state) && (
                                    <div className="text-[10px] font-normal text-gray-400">
                                      {[v.city, v.state].filter(Boolean).join(", ")}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-medium text-gray-700 dark:text-slate-300">
                                  {v.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                  {v.tax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className={`py-2.5 px-3.5 text-right font-bold ${isReturn ? "text-orange-700 dark:text-orange-400" : "text-gray-900 dark:text-white"}`}>
                                  {isReturn ? `- ₹ ${v.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `₹ ${v.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </td>
                                <td className="py-2.5 px-3.5 text-center">
                                  <Link
                                    href={isReturn ? "/dashboard/purchase/purchase-return" : "/dashboard/purchase/invoice"}
                                    onClick={onClose}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-600 hover:text-white transition font-medium"
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
                              No Purchase Vouchers Found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* PAGINATION FOOTER */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-200/80 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400">
                  <span>
                    Page <span className="font-semibold text-gray-800 dark:text-white">{currentPage}</span> of{" "}
                    <span className="font-semibold text-gray-800 dark:text-white">{totalPages}</span> &middot; {filtered.length} total rows
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center justify-center h-8 w-8 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-amber-600 hover:text-white disabled:opacity-40 transition shadow-sm"
                    >
                      <FaChevronLeft size={10} />
                    </button>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center justify-center h-8 w-8 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-amber-600 hover:text-white disabled:opacity-40 transition shadow-sm"
                    >
                      <FaChevronRight size={10} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STATE & AREA SUMMARY TABLE */}
          {activeTab === "summary" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FaTable className="text-amber-500" /> State & Territory Purchase Inward Summary Table
                </h4>
                <span className="text-xs font-semibold text-slate-500">
                  {stateMapData.length} Active Regions Recorded
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white font-semibold uppercase">
                      <th className="py-2.5 px-3">State Code</th>
                      <th className="py-2.5 px-3">State Name</th>
                      <th className="py-2.5 px-3 text-right">Gross Purchase (₹)</th>
                      <th className="py-2.5 px-3 text-center">Suppliers</th>
                      <th className="py-2.5 px-3 text-right">Payments Made (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {stateMapData.map((st, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 uppercase font-mono font-bold text-amber-600">{st.stateId}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{st.stateName}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                          ₹ {(st.purchase || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-purple-600">
                          {typeof st.suppliers === "number" ? st.suppliers : st.suppliers?.size || 0}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-emerald-600">
                          ₹ {(st.payment || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
