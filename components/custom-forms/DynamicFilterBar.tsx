"use client";

import React from "react";
import { FaFilter, FaSearch, FaRedo } from "react-icons/fa";
import { FormFieldConfig } from "./FormBuilder";

interface DynamicFilterBarProps {
  fields: FormFieldConfig[];
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onReset: () => void;
}

export default function DynamicFilterBar({
  fields,
  filters,
  onFilterChange,
  onReset,
}: DynamicFilterBarProps) {
  // Extract filterable fields (select, date, radio, or custom text)
  const filterableFields = fields.filter(
    (f) =>
      f.type === "select" ||
      f.type === "radio" ||
      f.type === "date" ||
      f.type === "number" ||
      f.type === "text"
  );

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
          <FaFilter className="text-indigo-600 dark:text-indigo-400" />
          <span>Dynamic Contextual Filters</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1 font-semibold"
        >
          <FaRedo /> Reset Filters
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Universal Search Input */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Global Search
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.search || ""}
              onChange={(e) => onFilterChange("search", e.target.value)}
              placeholder="Search anything..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <FaSearch className="absolute left-2.5 top-2.5 text-slate-400 text-xs" />
          </div>
        </div>

        {/* Date Filters */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Submitted From Date
          </label>
          <input
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => onFilterChange("startDate", e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Submitted To Date
          </label>
          <input
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => onFilterChange("endDate", e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
          />
        </div>

        {/* Dynamically Generated Field Filters */}
        {filterableFields.map((field, idx) => {
          const currentValue = filters[field.key] || "";
          // Use composite key: id + key + index to guarantee uniqueness
          // even when the same DB field key appears more than once in the form
          const uniqueKey = `${field.id || field.key}_${idx}`;

          if (field.type === "select" || field.type === "radio") {
            return (
              <div key={uniqueKey}>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 truncate">
                  Filter by {field.label}
                </label>
                <select
                  value={currentValue}
                  onChange={(e) => onFilterChange(field.key, e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="">All {field.label}</option>
                  {(field.options || []).map((opt, optIdx) => (
                    <option key={`${uniqueKey}_opt_${optIdx}`} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (field.type === "text" || field.type === "number") {
            return (
              <div key={uniqueKey}>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 truncate">
                  Filter {field.label}
                </label>
                <input
                  type={field.type === "number" ? "number" : "text"}
                  value={currentValue}
                  onChange={(e) => onFilterChange(field.key, e.target.value)}
                  placeholder={`Search ${field.label}...`}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
