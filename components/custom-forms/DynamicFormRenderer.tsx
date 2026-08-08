"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FaPaperPlane,
  FaCheck,
  FaExclamationTriangle,
  FaLock,
  FaStar,
  FaHistory,
  FaUndo,
  FaTrashAlt,
} from "react-icons/fa";
import { FormFieldConfig, IFormCondition } from "./FormBuilder";
import SignaturePad from "./SignaturePad";
import GpsLocationPicker from "./GpsLocationPicker";
import FileUploadField from "./FileUploadField";
import RepeaterTableField from "./RepeaterTableField";

interface DynamicFormRendererProps {
  template: {
    formId?: string;
    title: string;
    description?: string;
    fields: FormFieldConfig[];
    conditions?: IFormCondition[];
    accessMode?: string;
    theme?: { accentColor?: string };
  };
  readOnly?: boolean;
  isPublic?: boolean;
  onSuccess?: () => void;
}

export default function DynamicFormRenderer({
  template,
  readOnly = false,
  isPublic = false,
  onSuccess,
}: DynamicFormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    template.fields?.forEach((f) => {
      initial[f.key] = f.defaultValue || "";
    });
    return initial;
  });

  const [pin, setPin] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [remarks, setRemarks] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Draft Auto-Save & Recovery State
  const [draftFound, setDraftFound] = useState(false);
  const [draftTime, setDraftTime] = useState("");
  const [pendingDraft, setPendingDraft] = useState<Record<string, any> | null>(null);

  const accentColor = template.theme?.accentColor || "#4f46e5";

  // Check for unsaved local draft on mount
  useEffect(() => {
    if (!template.formId || readOnly) return;
    const draftKey = `form_draft_${template.formId}`;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.formData && Object.keys(parsed.formData).length > 0) {
          setDraftTime(parsed.savedAt || "previously");
          setPendingDraft(parsed.formData);
          setDraftFound(true);
        }
      } catch (err) {
        console.error("Error reading form draft:", err);
      }
    }
  }, [template.formId, readOnly]);

  // Auto-save form progress to localStorage
  useEffect(() => {
    if (!template.formId || readOnly || draftFound) return;
    const draftKey = `form_draft_${template.formId}`;
    const hasAnyContent = Object.values(formData).some(
      (v) => v !== "" && v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
    );

    if (hasAnyContent) {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          formData,
          savedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        })
      );
    }
  }, [formData, template.formId, readOnly, draftFound]);

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setFormData(pendingDraft);
    }
    setDraftFound(false);
  };

  const handleDiscardDraft = () => {
    if (template.formId) {
      localStorage.removeItem(`form_draft_${template.formId}`);
    }
    setDraftFound(false);
  };

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Evaluate Conditional IF/THEN Rules
  const evaluatedFields = useMemo(() => {
    const hiddenFields = new Set<string>();
    const requiredFieldsOverride = new Map<string, boolean>();

    (template.conditions || []).forEach((cond) => {
      const sourceVal = formData[cond.sourceFieldKey];
      let isMatch = false;

      if (cond.operator === "equals") {
        isMatch = String(sourceVal).trim().toLowerCase() === String(cond.compareValue).trim().toLowerCase();
      } else if (cond.operator === "notEquals") {
        isMatch = String(sourceVal).trim().toLowerCase() !== String(cond.compareValue).trim().toLowerCase();
      } else if (cond.operator === "contains") {
        isMatch = String(sourceVal).toLowerCase().includes(String(cond.compareValue).toLowerCase());
      } else if (cond.operator === "greaterThan") {
        isMatch = Number(sourceVal) > Number(cond.compareValue);
      } else if (cond.operator === "lessThan") {
        isMatch = Number(sourceVal) < Number(cond.compareValue);
      } else if (cond.operator === "isFilled") {
        isMatch = sourceVal !== undefined && sourceVal !== null && sourceVal !== "";
      }

      if (isMatch) {
        if (cond.action === "hide") {
          hiddenFields.add(cond.targetFieldKey);
        } else if (cond.action === "show") {
          // If action is show, field remains visible
        } else if (cond.action === "require") {
          requiredFieldsOverride.set(cond.targetFieldKey, true);
        }
      } else {
        if (cond.action === "show") {
          hiddenFields.add(cond.targetFieldKey); // Hide if condition is not met
        }
      }
    });

    return template.fields.map((f) => ({
      ...f,
      isHidden: hiddenFields.has(f.key),
      isRequired: requiredFieldsOverride.has(f.key)
        ? requiredFieldsOverride.get(f.key)!
        : f.required,
    }));
  }, [template.fields, template.conditions, formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    setErrorMsg("");
    setSuccessMsg("");

    // Check PIN if PasswordProtected
    if (template.accessMode === "PasswordProtected" && !pin.trim()) {
      setErrorMsg("Please enter the secret PIN code.");
      return;
    }

    // Validate visible required fields
    const missing: string[] = [];
    evaluatedFields.forEach((field) => {
      if (!field.isHidden && field.isRequired) {
        const val = formData[field.key];
        if (val === undefined || val === null || val === "") {
          missing.push(field.label || field.key);
        }
      }
    });

    if (missing.length > 0) {
      setErrorMsg(`Please fill in all required fields: ${missing.join(", ")}`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/custom-forms/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: template.formId,
          data: formData,
          pin,
          submittedBy: {
            userName: userName.trim() || (isPublic ? "Public Respondent" : "CRM User"),
            userEmail: userEmail.trim() || "",
            isPublicRespondent: isPublic,
          },
          remarks,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setSuccessMsg(result.message || "Form entry submitted successfully!");
        if (template.formId) {
          localStorage.removeItem(`form_draft_${template.formId}`);
        }
        const reset: Record<string, any> = {};
        template.fields.forEach((f) => {
          reset[f.key] = f.defaultValue || "";
        });
        setFormData(reset);
        setRemarks("");
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(result.error || "Failed to submit form entry.");
      }
    } catch (err: any) {
      console.error("Error submitting form entry:", err);
      setErrorMsg("An unexpected error occurred while submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  // Group visible fields by section
  const visibleFields = evaluatedFields.filter((f) => !f.isHidden);
  const sectionsMap = new Map<string, typeof visibleFields>();
  visibleFields.forEach((f) => {
    const sec = f.section || "General Details";
    if (!sectionsMap.has(sec)) {
      sectionsMap.set(sec, []);
    }
    sectionsMap.get(sec)!.push(f);
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Draft Auto-Restore Banner */}
      {draftFound && !readOnly && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-xl">
              <FaHistory className="text-lg" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Unsaved Draft Found
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                We saved your unfinished responses from {draftTime}. Would you like to restore them?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <FaUndo className="text-[10px]" /> Restore Draft
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <FaTrashAlt className="text-[10px]" /> Discard
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <FaExclamationTriangle className="text-rose-500" /> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <FaCheck className="text-emerald-500" /> {successMsg}
        </div>
      )}

      {/* Password Protection PIN Input */}
      {template.accessMode === "PasswordProtected" && !readOnly && (
        <div className="p-4 bg-indigo-50/60 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2 max-w-sm">
          <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
            <FaLock className="text-indigo-600" /> PIN Code Required *
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter secret PIN code..."
            className="w-full px-3 py-2 text-sm border border-indigo-300 dark:border-indigo-700 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
          />
        </div>
      )}

      {Array.from(sectionsMap.entries()).map(([sectionName, sectionFields]) => (
        <div
          key={sectionName}
          className="bg-slate-50/70 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4"
        >
          <h3
            className="text-sm font-bold uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-slate-700"
            style={{ color: accentColor }}
          >
            {sectionName}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sectionFields.map((field) => {
              const value = formData[field.key] ?? "";

              return (
                <div
                  key={field.id || field.key}
                  className={
                    field.type === "textarea" ? "md:col-span-2" : "col-span-1"
                  }
                >
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {field.label}{" "}
                    {field.isRequired && <span className="text-rose-500">*</span>}
                    {field.mappedTable && (
                      <span className="ml-1 text-[10px] text-cyan-600 font-normal">
                        ({field.mappedTable}.{field.mappedField})
                      </span>
                    )}
                  </label>

                  {/* Input Controls */}
                  {field.type === "text" || field.type === "mappedTable" ? (
                    <input
                      type="text"
                      disabled={readOnly}
                      value={value}
                      placeholder={field.placeholder}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 outline-none"
                    />
                  ) : field.type === "number" ? (
                    <input
                      type="number"
                      disabled={readOnly}
                      value={value}
                      placeholder={field.placeholder}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 outline-none"
                    />
                  ) : field.type === "date" ? (
                    <input
                      type="date"
                      disabled={readOnly}
                      value={value}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 outline-none"
                    />
                  ) : field.type === "select" ? (
                    <select
                      disabled={readOnly}
                      value={value}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 outline-none"
                    >
                      <option value="">-- Select Option --</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      rows={3}
                      disabled={readOnly}
                      value={value}
                      placeholder={field.placeholder}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 outline-none"
                    />
                  ) : field.type === "checkbox" ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={!!value}
                        onChange={(e) => handleChange(field.key, e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        Check / Uncheck option
                      </span>
                    </div>
                  ) : field.type === "radio" ? (
                    <div className="flex flex-wrap gap-4 pt-1">
                      {(field.options || []).map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={field.key}
                            disabled={readOnly}
                            checked={value === opt}
                            onChange={() => handleChange(field.key, opt)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : field.type === "signature" ? (
                    <SignaturePad
                      value={value}
                      readOnly={readOnly}
                      onChange={(val) => handleChange(field.key, val)}
                    />
                  ) : field.type === "gps" ? (
                    <GpsLocationPicker
                      value={value}
                      readOnly={readOnly}
                      onChange={(val) => handleChange(field.key, val)}
                    />
                  ) : field.type === "fileUpload" ? (
                    <FileUploadField
                      value={value}
                      readOnly={readOnly}
                      onChange={(val) => handleChange(field.key, val)}
                    />
                  ) : field.type === "repeaterTable" ? (
                    <div className="col-span-full">
                      <RepeaterTableField
                        value={value}
                        readOnly={readOnly}
                        onChange={(val) => handleChange(field.key, val)}
                      />
                    </div>
                  ) : field.type === "rating" ? (
                    <div className="flex items-center gap-2 pt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleChange(field.key, star)}
                          className={`text-xl transition-all ${
                            Number(value) >= star
                              ? "text-amber-400 scale-110"
                              : "text-slate-300 dark:text-slate-700 hover:text-amber-300"
                          }`}
                        >
                          <FaStar />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-2">
                        {value ? `${value} / 5 Stars` : "Select rating"}
                      </span>
                    </div>
                  ) : null}

                  {field.helpText && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      {field.helpText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Submitter Info & Remarks */}
      {!readOnly && (
        <div className="bg-slate-50/70 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <h3
            className="text-sm font-bold uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-slate-700"
            style={{ color: accentColor }}
          >
            Submitter Info & Notes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Additional Remarks / Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any special remarks..."
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            style={{ backgroundColor: accentColor }}
            className="w-full md:w-auto px-8 py-3 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FaPaperPlane /> {submitting ? "Submitting Entry..." : "Submit Form Entry"}
          </button>
        </div>
      )}
    </form>
  );
}
