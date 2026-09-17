"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear, FinancialYearType } from "@/context/FinancialYearContext";
import {
  FaFilter,
  FaSearch,
  FaTimes,
  FaCalendarAlt,
  FaSyncAlt,
  FaChevronDown,
  FaBuilding,
  FaMapMarkerAlt,
  FaUserTie,
  FaHistory,
} from "react-icons/fa";

export interface FilterState {
  companyId: string;
  fyId: string;
  range: string;
  startDate: string;
  endDate: string;
  state: string;
  area: string;
  asm: string;
  hq: string;
  customer: string;
  customerGrade: string;
  division: string;
  status: string;
  paymentMode: string;
  agingBucket: string;
  search: string;
}

export const DEFAULT_FILTERS: FilterState = {
  companyId: "ALL",
  fyId: "ALL",
  range: "this_fy",
  startDate: "",
  endDate: "",
  state: "ALL",
  area: "ALL",
  asm: "ALL",
  hq: "ALL",
  customer: "",
  customerGrade: "ALL",
  division: "ALL",
  status: "ALL",
  paymentMode: "ALL",
  agingBucket: "ALL",
  search: "",
};

const RANGES = [
  { value: "today", label: "⚡ Today" },
  { value: "yesterday", label: "⚡ Yesterday" },
  { value: "7days", label: "⚡ Last 7 Days" },
  { value: "14days", label: "⚡ Last 14 Days" },
  { value: "30days", label: "⚡ Last 30 Days" },
  { value: "this_month", label: "📅 This Month (MTD)" },
  { value: "last_month", label: "📅 Last Month" },
  { value: "q1", label: "📊 Q1 (Apr 1 – Jun 30)" },
  { value: "q2", label: "📊 Q2 (Jul 1 – Sep 30)" },
  { value: "q3", label: "📊 Q3 (Oct 1 – Dec 31)" },
  { value: "q4", label: "📊 Q4 (Jan 1 – Mar 31)" },
  { value: "h1", label: "🎯 H1 (Apr 1 – Sep 30)" },
  { value: "h2", label: "🎯 H2 (Oct 1 – Mar 31)" },
  { value: "this_quarter", label: "📈 This Quarter" },
  { value: "last_quarter", label: "📈 Last Quarter" },
  { value: "this_fy", label: "🏛️ This Financial Year (YTD)" },
  { value: "last_fy", label: "🏛️ Last Financial Year" },
  { value: "all_time", label: "🌐 All Time History" },
  { value: "custom", label: "⚙️ Custom Date Range..." },
];

const INDIA_STATES = [
  "ALL",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Chandigarh",
  "Jammu and Kashmir",
  "Ladakh",
];

interface FilterBarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onRefresh: () => void;
  loading: boolean;
  availableAreas?: string[];
  availableAsms?: string[];
  availableDivisions?: string[];
}

export default function SalesVsCollectionFilterBar({
  filters,
  onChange,
  onRefresh,
  loading,
  availableAreas = [],
  availableAsms = [],
  availableDivisions = [],
}: FilterBarProps) {
  const { companies, selectedCompany, setSelectedCompany } = useCompany();
  const { fyList, selectedFY } = useFinancialYear();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companyFYs, setCompanyFYs] = useState<FinancialYearType[]>([]);
  const [fyLoading, setFyLoading] = useState(false);

  // ── 1. Dynamic Dependent Financial Year Fetching on Company Selection ──
  const fetchFYsForCompany = useCallback(
    async (compId: string) => {
      if (!compId || compId === "ALL") {
        setCompanyFYs(fyList);
        return;
      }
      try {
        setFyLoading(true);
        const res = await fetch(`/api/financial-year?companyId=${compId}`);
        if (res.ok) {
          const data: FinancialYearType[] = await res.json();
          const comp = companies.find((c) => c._id === compId);
          const allOption: FinancialYearType = {
            _id: "ALL",
            fyName: comp ? `All FY (${comp.companyName})` : "All Financial Years",
            isAll: true,
          };
          const list = [allOption, ...data];
          setCompanyFYs(list);

          // Auto-select active/current FY if current filter is not in list
          const hasCurrent = list.some((f) => f._id === filters.fyId);
          if (!hasCurrent && data.length > 0) {
            const cur = data.find((f) => f.isCurrent) || data[0];
            if (cur) {
              onChange({
                ...filters,
                companyId: compId,
                fyId: cur._id,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching FYs for company:", err);
      } finally {
        setFyLoading(false);
      }
    },
    [companies, fyList, filters, onChange]
  );

  // Sync when company or context FY list changes
  useEffect(() => {
    const compId = filters.companyId || selectedCompany?._id || "ALL";
    fetchFYsForCompany(compId);
  }, [filters.companyId, selectedCompany, fetchFYsForCompany]);

  // Sync fyId in filters when global selectedFY changes (e.g. from navbar)
  useEffect(() => {
    const globalFyId = (selectedFY as any)?._id;
    if (globalFyId && globalFyId !== filters.fyId) {
      onChange({ ...filters, fyId: globalFyId });
    }
  }, [selectedFY]); // eslint-disable-line

  const set = (key: keyof FilterState, value: any) =>
    onChange({ ...filters, [key]: value });

  const handleCompanyChange = (compId: string) => {
    const comp = companies.find((c) => c._id === compId);
    if (comp) {
      setSelectedCompany(comp);
    }
    onChange({
      ...filters,
      companyId: compId,
      fyId: "ALL",
    });
    fetchFYsForCompany(compId);
  };

  const reset = () =>
    onChange({
      ...DEFAULT_FILTERS,
      companyId: selectedCompany?._id || "ALL",
      fyId: (selectedFY as any)?._id || "ALL",
    });

  // Quick Preset Jump for Custom Range
  const setQuickCustomDays = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    onChange({
      ...filters,
      range: "custom",
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });
  };

  const setQuickCustomFY = () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const fyBaseYear = curMonth >= 3 ? curYear : curYear - 1;
    onChange({
      ...filters,
      range: "custom",
      startDate: `${fyBaseYear}-04-01`,
      endDate: `${fyBaseYear + 1}-03-31`,
    });
  };

  const activeFilterCount = [
    filters.range !== "this_fy",
    filters.state !== "ALL",
    filters.area !== "ALL",
    filters.asm !== "ALL",
    filters.hq !== "ALL",
    filters.customer !== "",
    filters.customerGrade !== "ALL",
    filters.division !== "ALL",
    filters.status !== "ALL",
    filters.paymentMode !== "ALL",
    filters.agingBucket !== "ALL",
    filters.search !== "",
  ].filter(Boolean).length;

  const selectClass =
    "w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer transition-all hover:border-slate-300 dark:hover:border-slate-600 font-semibold shadow-xs";
  const inputClass =
    "w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500 transition-all font-semibold shadow-xs";
  const labelClass =
    "block text-slate-500 dark:text-slate-400 text-[10.5px] font-bold uppercase tracking-wider mb-1.5";

  const displayedFYs = companyFYs.length > 0 ? companyFYs : fyList;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden transition-all">
      {/* ── TOP HEADER & REPORT PERSPECTIVE TOGGLE ──────────────── */}
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
            <FaFilter size={13} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Universal Filter & Intelligence Matrix</span>
              {activeFilterCount > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black shadow-xs">
                  {activeFilterCount} Active
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Multi-company, financial year, ASM territory & real-time date horizon
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <FaTimes size={10} />
              <span>Reset All Filters</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          >
            <FaSyncAlt size={10} className={loading ? "animate-spin" : ""} />
            <span>Apply / Sync</span>
          </button>
        </div>
      </div>

      {/* Mobile Toggle Button */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden w-full flex items-center justify-between px-5 py-3 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
          {mobileOpen ? "Hide Filter Controls" : "Show All Filters & Conditions"}
        </span>
        <FaChevronDown
          className={`text-slate-400 transition-transform ${
            mobileOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Filter Matrix Content */}
      <div
        className={`${
          mobileOpen ? "block" : "hidden"
        } lg:block px-5 pb-5 pt-4 space-y-4`}
      >
        {/* ── ROW 1: PRIMARY 5-PILLAR CONTROLS (Cascading Company & FY) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {/* 1. Company Account */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <FaBuilding className="text-indigo-500" size={10} />
                <span>Company Account</span>
              </span>
            </label>
            <div className="relative">
              <select
                className={selectClass}
                value={filters.companyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
              >
                <option value="ALL">All Associated Companies</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
            </div>
          </div>

          {/* 2. Financial Year (Dependent on selected company) */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <FaCalendarAlt className="text-indigo-500" size={10} />
                <span>Financial Year</span>
                {fyLoading && (
                  <span className="text-[9px] text-indigo-500 font-normal lowercase animate-pulse">
                    (syncing...)
                  </span>
                )}
              </span>
            </label>
            <div className="relative">
              <select
                className={selectClass}
                value={filters.fyId}
                onChange={(e) => set("fyId", e.target.value)}
              >
                {displayedFYs.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.fyName} {f.isCurrent ? "★ Current" : ""}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
            </div>
          </div>

          {/* 3. Date Horizon Presets */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <FaHistory className="text-indigo-500" size={10} />
                <span>Date Horizon</span>
              </span>
            </label>
            <div className="relative">
              <select
                className={selectClass}
                value={filters.range}
                onChange={(e) => set("range", e.target.value)}
              >
                {RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
            </div>
          </div>

          {/* 4. State / Territory */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <FaMapMarkerAlt className="text-indigo-500" size={10} />
                <span>State / Territory</span>
              </span>
            </label>
            <div className="relative">
              <select
                className={selectClass}
                value={filters.state}
                onChange={(e) => set("state", e.target.value)}
              >
                <option value="ALL">All States & UTs (India)</option>
                {INDIA_STATES.filter((s) => s !== "ALL").map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
            </div>
          </div>

          {/* 5. Area / City / Region */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <FaMapMarkerAlt className="text-indigo-500" size={10} />
                <span>Area / City / Region</span>
              </span>
            </label>
            <div className="relative">
              <select
                className={selectClass}
                value={filters.area}
                onChange={(e) => set("area", e.target.value)}
              >
                <option value="ALL">All Areas / Cities</option>
                {availableAreas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
            </div>
          </div>
        </div>

        {/* ── ROW 2: ADVANCED DIMENSIONS & FIELD HIERARCHY ────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 pt-1">
          {/* 6. ASM / Field Representative */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <FaUserTie className="text-indigo-500" size={10} />
                <span>ASM / Field Rep</span>
              </span>
            </label>
            <div className="relative">
              <select
                className={selectClass}
                value={filters.asm}
                onChange={(e) => set("asm", e.target.value)}
              >
                <option value="ALL">All ASMs / Executives</option>
                {availableAsms.map((asm) => (
                  <option key={asm} value={asm}>
                    {asm}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
            </div>
          </div>

          {/* 7. Pharma Division */}
          <div>
            <label className={labelClass}>Pharma Division</label>
            <div className="relative">
              <select
                className={selectClass}
                value={filters.division}
                onChange={(e) => set("division", e.target.value)}
              >
                <option value="ALL">All Divisions</option>
                {availableDivisions.map((d) => (
                  <option key={d} value={d}>
                    Division {d}
                  </option>
                ))}
              </select>
              <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
            </div>
          </div>

          {/* 8. Customer Risk Grade */}
          <div>
            <label className={labelClass}>Customer Grade</label>
            <div className="relative">
              <select
                className={selectClass}
                value={filters.customerGrade}
                onChange={(e) => set("customerGrade", e.target.value)}
              >
                <option value="ALL">All Risk Grades</option>
                <option value="A">Grade A (Realization ≥90%)</option>
                <option value="B">Grade B (Realization 75–89%)</option>
                <option value="C">Grade C (Realization 50–74%)</option>
                <option value="D">Grade D (&lt;50% Defaulter)</option>
              </select>
              <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
            </div>
          </div>

          {/* 9. Invoice Settlement Status */}
          <div>
            <label className={labelClass}>Invoice Settlement</label>
            <div className="relative">
              <select
                className={selectClass}
                value={filters.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="ALL">All Settlement Statuses</option>
                <option value="PAID">Fully Settled (100%)</option>
                <option value="PARTIAL">Partially Collected</option>
                <option value="UNPAID">Uncollected (0%)</option>
                <option value="OVERDUE">Overdue (&gt;60 Days)</option>
              </select>
              <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
            </div>
          </div>

          {/* 10. Payment Mode */}
          <div>
            <label className={labelClass}>Payment Instrument</label>
            <div className="relative">
              <select
                className={selectClass}
                value={filters.paymentMode}
                onChange={(e) => set("paymentMode", e.target.value)}
              >
                <option value="ALL">All Payment Methods</option>
                <option value="Bank / NEFT">Bank / NEFT / RTGS</option>
                <option value="Cheque">Cheque / Demand Draft</option>
                <option value="Cash">Cash Receipt</option>
                <option value="UPI">UPI / Digital QR</option>
                <option value="Credit Note">Credit Note / Adjustment</option>
              </select>
              <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
            </div>
          </div>

          {/* 11. Aging Risk Bucket */}
          <div>
            <label className={labelClass}>Aging Risk Bucket</label>
            <div className="relative">
              <select
                className={selectClass}
                value={filters.agingBucket}
                onChange={(e) => set("agingBucket", e.target.value)}
              >
                <option value="ALL">All Aging Buckets</option>
                <option value="0-30">0 – 30 Days (Current)</option>
                <option value="31-60">31 – 60 Days (Moderate)</option>
                <option value="61-90">61 – 90 Days (Watchlist)</option>
                <option value="90+">90+ Days (Overdue Risk)</option>
              </select>
              <FaChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]" />
            </div>
          </div>
        </div>

        {/* ── CUSTOM DATE RANGE EXPANDED DRAWER ────────────────────── */}
        {filters.range === "custom" && (
          <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-indigo-600 dark:text-indigo-400" size={13} />
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  Custom Date Interval Selection
                </span>
              </div>
              {/* Quick Jump Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                <span className="text-slate-500 dark:text-slate-400 mr-1">Quick Jump:</span>
                <button
                  type="button"
                  onClick={() => setQuickCustomDays(7)}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer"
                >
                  7D
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCustomDays(30)}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer"
                >
                  30D
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCustomDays(90)}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer"
                >
                  90D
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCustomDays(180)}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer"
                >
                  180D
                </button>
                <button
                  type="button"
                  onClick={setQuickCustomFY}
                  className="px-2 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  Full FY
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Start Date (From)
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={filters.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  End Date (To)
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={filters.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── ROW 3: QUICK SEARCH & ACTION RIBBON ─────────────────── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-1">
          {/* Quick Search */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search by customer name, voucher no, city, MR territory, ASM..."
              className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
              value={filters.search}
              onChange={(e) => set("search", e.target.value)}
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => set("search", "")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <FaTimes size={11} />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={reset}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <FaTimes size={11} />
                <span>Reset ({activeFilterCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} size={12} />
              <span>{loading ? "Syncing..." : "Apply Filters"}</span>
            </button>
          </div>
        </div>

        {/* Active Filter Pills Bar */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="font-bold text-slate-500 dark:text-slate-400">Applied Conditions:</span>
            {filters.range !== "this_fy" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-500/30">
                Range: {filters.range}
                <FaTimes className="cursor-pointer ml-1" size={9} onClick={() => set("range", "this_fy")} />
              </span>
            )}
            {filters.state !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-500/30">
                State: {filters.state}
                <FaTimes className="cursor-pointer ml-1" size={9} onClick={() => set("state", "ALL")} />
              </span>
            )}
            {filters.area !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-500/30">
                Area: {filters.area}
                <FaTimes className="cursor-pointer ml-1" size={9} onClick={() => set("area", "ALL")} />
              </span>
            )}
            {filters.asm !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-500/30">
                ASM: {filters.asm}
                <FaTimes className="cursor-pointer ml-1" size={9} onClick={() => set("asm", "ALL")} />
              </span>
            )}
            {filters.division !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-500/30">
                Div: {filters.division}
                <FaTimes className="cursor-pointer ml-1" size={9} onClick={() => set("division", "ALL")} />
              </span>
            )}
            {filters.customerGrade !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-500/30">
                Grade: {filters.customerGrade}
                <FaTimes className="cursor-pointer ml-1" size={9} onClick={() => set("customerGrade", "ALL")} />
              </span>
            )}
            {filters.status !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-500/30">
                Status: {filters.status}
                <FaTimes className="cursor-pointer ml-1" size={9} onClick={() => set("status", "ALL")} />
              </span>
            )}
            {filters.paymentMode !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-500/30">
                Mode: {filters.paymentMode}
                <FaTimes className="cursor-pointer ml-1" size={9} onClick={() => set("paymentMode", "ALL")} />
              </span>
            )}
            {filters.agingBucket !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold border border-indigo-200/60 dark:border-indigo-500/30">
                Aging: {filters.agingBucket} Days
                <FaTimes className="cursor-pointer ml-1" size={9} onClick={() => set("agingBucket", "ALL")} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
