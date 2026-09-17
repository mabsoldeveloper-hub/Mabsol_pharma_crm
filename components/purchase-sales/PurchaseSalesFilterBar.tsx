"use client";

import React from "react";
import {
  FaCalendarAlt,
  FaBuilding,
  FaFilter,
  FaSyncAlt,
  FaLayerGroup,
  FaCreditCard,
  FaUndo,
} from "react-icons/fa";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";

export type FilterState = {
  range: string;
  fyId: string;
  paymentStatus: string;
  category: string;
  startDate: string;
  endDate: string;
};

interface FilterBarProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  onRefresh: () => void;
  loading: boolean;
  categoriesList?: { id: string; name: string }[];
}

export default function PurchaseSalesFilterBar({
  filters,
  onChange,
  onRefresh,
  loading,
  categoriesList = [],
}: FilterBarProps) {
  const { selectedCompany } = useCompany();
  const { fyList } = useFinancialYear();

  const handleSelect = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onChange({
      range: "this_fy",
      fyId: "ALL",
      paymentStatus: "ALL",
      category: "ALL",
      startDate: "",
      endDate: "",
    });
  };

  const isFiltered =
    filters.range !== "this_fy" ||
    filters.fyId !== "ALL" ||
    filters.paymentStatus !== "ALL" ||
    filters.category !== "ALL" ||
    filters.startDate !== "" ||
    filters.endDate !== "";

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-5 shadow-lg shadow-indigo-500/5 mb-6 transition-all w-full max-w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
        {/* Title & Active Company Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
            <FaFilter className="text-base" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                Trade Filters
              </h3>
              {isFiltered && (
                <span className="text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Filtered
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filtered for current active company
            </p>
          </div>
        </div>

        {/* Controls Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Active Company Badge (NO SELECTOR) */}
          <div
            title={`Active Company: ${selectedCompany?.companyName || "Default"}`}
            className="flex items-center gap-2 bg-indigo-500/10 dark:bg-indigo-500/20 px-3.5 py-2 rounded-2xl border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs w-full sm:w-auto min-w-0 shadow-sm"
          >
            <FaBuilding className="text-indigo-500 text-xs shrink-0" />
            <span className="truncate max-w-[180px]">
              {selectedCompany?.companyName || selectedCompany?.companyCode || "Current Company"}
            </span>
          </div>

          {/* Financial Year Filter (Populated ONLY for Current Company) */}
          <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800/90 px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm hover:border-indigo-400 transition-all w-full sm:w-auto min-w-0">
            <span className="text-xs font-black text-amber-500 shrink-0">FY</span>
            <select
              value={filters.fyId}
              onChange={(e) => handleSelect("fyId", e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer w-full lg:max-w-[160px] truncate"
            >
              <option value="ALL">
                {selectedCompany
                  ? `All FYs (${selectedCompany.companyName || selectedCompany.companyCode})`
                  : "All Financial Years"}
              </option>
              {fyList
                .filter((f) => !f.isAll)
                .map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.fyName || f.fyCode}
                  </option>
                ))}
            </select>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800/90 px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm hover:border-indigo-400 transition-all w-full sm:w-auto min-w-0">
            <FaCalendarAlt className="text-indigo-500 text-xs shrink-0" />
            <select
              value={filters.range}
              onChange={(e) => handleSelect("range", e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer w-full"
            >
              <option value="this_fy">This Financial Year</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="7days">Last 7 Days</option>
              <option value="today">Today</option>
              <option value="12months">Last 12 Months</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {filters.range === "custom" && (
            <div className="flex items-center gap-2 col-span-1 sm:col-span-2 lg:col-span-1">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleSelect("startDate", e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-xs font-semibold px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none text-slate-700 dark:text-slate-200 w-full"
              />
              <span className="text-xs font-bold text-slate-400">to</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleSelect("endDate", e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 text-xs font-semibold px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none text-slate-700 dark:text-slate-200 w-full"
              />
            </div>
          )}

          {/* Payment Status Filter */}
          <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800/90 px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm hover:border-indigo-400 transition-all w-full sm:w-auto min-w-0">
            <FaCreditCard className="text-emerald-500 text-xs shrink-0" />
            <select
              value={filters.paymentStatus}
              onChange={(e) => handleSelect("paymentStatus", e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Payment Types</option>
              <option value="CREDIT">Credit Only</option>
              <option value="CASH">Cash Only</option>
              <option value="BANK">Bank / UPI</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800/90 px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm hover:border-indigo-400 transition-all w-full sm:w-auto min-w-0">
            <FaLayerGroup className="text-violet-500 text-xs shrink-0" />
            <select
              value={filters.category}
              onChange={(e) => handleSelect("category", e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer w-full lg:max-w-[130px] truncate"
            >
              <option value="ALL">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 col-span-1 sm:col-span-2 lg:col-span-1 ml-auto">
            {isFiltered && (
              <button
                onClick={handleReset}
                title="Reset all filters"
                className="flex items-center justify-center gap-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 px-3 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95"
              >
                <FaUndo className="text-[10px]" />
                <span>Reset</span>
              </button>
            )}

            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 min-w-[90px]"
            >
              <FaSyncAlt className={`text-xs ${loading ? "animate-spin" : ""}`} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
