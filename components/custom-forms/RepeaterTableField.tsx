"use client";

import React, { useState } from "react";
import { FaPlus, FaTrash, FaTable } from "react-icons/fa";

interface RepeaterTableFieldProps {
  subFields?: Array<{ key: string; label: string; type?: string }>;
  value?: any[];
  onChange: (items: any[]) => void;
  readOnly?: boolean;
}

export default function RepeaterTableField({
  subFields = [
    { key: "productName", label: "Product Name", type: "text" },
    { key: "qty", label: "Quantity", type: "number" },
    { key: "remarks", label: "Notes / Sample Pks", type: "text" },
  ],
  value = [],
  onChange,
  readOnly = false,
}: RepeaterTableFieldProps) {
  const items = Array.isArray(value) && value.length > 0 ? value : [createEmptyRow()];

  function createEmptyRow() {
    const row: Record<string, any> = {};
    subFields.forEach((f) => {
      row[f.key] = "";
    });
    return row;
  }

  const addRow = () => {
    if (readOnly) return;
    onChange([...items, createEmptyRow()]);
  };

  const removeRow = (index: number) => {
    if (readOnly || items.length === 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const updateCell = (index: number, key: string, val: any) => {
    if (readOnly) return;
    const updated = [...items];
    updated[index] = { ...updated[index], [key]: val };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              <th className="p-2.5 w-10 text-center">#</th>
              {subFields.map((f) => (
                <th key={f.key} className="p-2.5 min-w-[130px]">
                  {f.label}
                </th>
              ))}
              {!readOnly && <th className="p-2.5 w-12 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-2.5 text-center font-bold text-slate-400">
                  {rowIdx + 1}
                </td>
                {subFields.map((f) => (
                  <td key={f.key} className="p-2">
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      disabled={readOnly}
                      value={row[f.key] ?? ""}
                      onChange={(e) => updateCell(rowIdx, f.key, e.target.value)}
                      placeholder={`Enter ${f.label}`}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(rowIdx)}
                      disabled={items.length === 1}
                      className="p-1.5 text-rose-500 hover:text-rose-700 disabled:opacity-30"
                    >
                      <FaTrash />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
        >
          <FaPlus /> Add Line Item Row
        </button>
      )}
    </div>
  );
}
