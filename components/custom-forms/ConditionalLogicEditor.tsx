"use client";

import React from "react";
import { FaPlus, FaTrash, FaExchangeAlt } from "react-icons/fa";
import { FormFieldConfig, IFormCondition } from "./FormBuilder";

interface ConditionalLogicEditorProps {
  fields: FormFieldConfig[];
  conditions: IFormCondition[];
  onChange: (conditions: IFormCondition[]) => void;
}

export default function ConditionalLogicEditor({
  fields,
  conditions,
  onChange,
}: ConditionalLogicEditorProps) {
  const addCondition = () => {
    if (fields.length < 2) return;
    const newCondition: IFormCondition = {
      id: `cond_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sourceFieldKey: fields[0]?.key || "",
      operator: "equals",
      compareValue: "",
      targetFieldKey: fields[1]?.key || fields[0]?.key || "",
      action: "show",
    };
    onChange([...conditions, newCondition]);
  };

  const updateCondition = (index: number, updated: Partial<IFormCondition>) => {
    const next = [...conditions];
    next[index] = { ...next[index], ...updated };
    onChange(next);
  };

  const removeCondition = (index: number) => {
    const next = conditions.filter((_, i) => i !== index);
    onChange(next);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
            <FaExchangeAlt className="text-violet-500" /> Conditional IF / THEN Logic Rules
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dynamically show, hide, or require fields based on the user&apos;s answers.
          </p>
        </div>
        <button
          onClick={addCondition}
          disabled={fields.length < 2}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-40"
        >
          <FaPlus /> Add Rule
        </button>
      </div>

      {fields.length < 2 ? (
        <div className="p-4 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-xl text-xs">
          Please add at least 2 form fields in the Designer tab before creating conditional IF/THEN rules.
        </div>
      ) : conditions.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-400">
          No conditional rules configured. Click &quot;Add Rule&quot; above to create IF/THEN conditions.
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((cond, idx) => (
            <div
              key={cond.id || idx}
              className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                  Rule #{idx + 1}
                </span>
                <button
                  onClick={() => removeCondition(idx)}
                  className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                >
                  <FaTrash />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                {/* IF Field */}
                <div>
                  <label className="block text-slate-500 font-medium mb-1">
                    IF Field
                  </label>
                  <select
                    value={cond.sourceFieldKey}
                    onChange={(e) => updateCondition(idx, { sourceFieldKey: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                  >
                    {fields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operator */}
                <div>
                  <label className="block text-slate-500 font-medium mb-1">
                    Condition Operator
                  </label>
                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(idx, { operator: e.target.value as any })}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="equals">Is Equal To</option>
                    <option value="notEquals">Is NOT Equal To</option>
                    <option value="contains">Contains</option>
                    <option value="greaterThan">Greater Than (&gt;)</option>
                    <option value="lessThan">Less Than (&lt;)</option>
                    <option value="isFilled">Is Filled (Not Empty)</option>
                  </select>
                </div>

                {/* Value */}
                <div>
                  <label className="block text-slate-500 font-medium mb-1">
                    Target Value
                  </label>
                  <input
                    type="text"
                    value={cond.compareValue}
                    onChange={(e) => updateCondition(idx, { compareValue: e.target.value })}
                    placeholder="Value to match..."
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>

                {/* ACTION */}
                <div>
                  <label className="block text-slate-500 font-medium mb-1">
                    THEN Action
                  </label>
                  <select
                    value={cond.action}
                    onChange={(e) => updateCondition(idx, { action: e.target.value as any })}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none font-semibold text-indigo-600 dark:text-indigo-400"
                  >
                    <option value="show">SHOW Target Field</option>
                    <option value="hide">HIDE Target Field</option>
                    <option value="require">REQUIRE Target Field</option>
                  </select>
                </div>

                {/* TARGET FIELD */}
                <div>
                  <label className="block text-slate-500 font-medium mb-1">
                    Target Field
                  </label>
                  <select
                    value={cond.targetFieldKey}
                    onChange={(e) => updateCondition(idx, { targetFieldKey: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                  >
                    {fields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
