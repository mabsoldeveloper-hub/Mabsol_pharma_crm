"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaPlus,
  FaTrash,
  FaArrowUp,
  FaArrowDown,
  FaSave,
  FaEye,
  FaDatabase,
  FaCheck,
  FaTimes,
  FaList,
  FaICursor,
  FaHashtag,
  FaCalendar,
  FaChevronDown,
  FaCheckSquare,
  FaLayerGroup,
  FaSlidersH,
  FaSearch,
  FaExchangeAlt,
  FaCog,
  FaPalette,
  FaShieldAlt,
  FaUserCheck,
} from "react-icons/fa";
import DynamicFormRenderer from "./DynamicFormRenderer";
import ConditionalLogicEditor from "./ConditionalLogicEditor";

export interface FormFieldConfig {
  id: string;
  key: string;
  label: string;
  type:
    | "text"
    | "number"
    | "date"
    | "select"
    | "textarea"
    | "checkbox"
    | "radio"
    | "mappedTable";
  required: boolean;
  placeholder?: string;
  options?: string[];
  mappedTable?: string;
  mappedField?: string;
  defaultValue?: any;
  order: number;
  section?: string;
  helpText?: string;
}

export interface IFormCondition {
  id: string;
  sourceFieldKey: string;
  operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan" | "isFilled";
  compareValue: string;
  targetFieldKey: string;
  action: "show" | "hide" | "require";
}

interface FormBuilderProps {
  initialData?: {
    _id?: string;
    formId?: string;
    title?: string;
    description?: string;
    category?: string;
    status?: string;
    fields?: FormFieldConfig[];
    conditions?: IFormCondition[];
    accessMode?: string;
    accessPin?: string;
    approvalWorkflow?: { enabled: boolean; approverRole: string };
    autoMasterSync?: { enabled: boolean; targetModel: string };
    theme?: { accentColor: string; logoUrl?: string; headerBanner?: string };
  };
  isEditMode?: boolean;
}

export default function FormBuilder({ initialData, isEditMode = false }: FormBuilderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || "General");
  const [status, setStatus] = useState(initialData?.status || "Active");
  const [fields, setFields] = useState<FormFieldConfig[]>(initialData?.fields || []);

  // Enterprise Features State
  const [conditions, setConditions] = useState<IFormCondition[]>(initialData?.conditions || []);
  const [accessMode, setAccessMode] = useState(initialData?.accessMode || "Internal");
  const [accessPin, setAccessPin] = useState(initialData?.accessPin || "");
  const [approvalEnabled, setApprovalEnabled] = useState(initialData?.approvalWorkflow?.enabled || false);
  const [approverRole, setApproverRole] = useState(initialData?.approvalWorkflow?.approverRole || "Admin");
  const [autoMasterSyncEnabled, setAutoMasterSyncEnabled] = useState(initialData?.autoMasterSync?.enabled || false);
  const [targetModel, setTargetModel] = useState(initialData?.autoMasterSync?.targetModel || "");
  const [accentColor, setAccentColor] = useState(initialData?.theme?.accentColor || "#4f46e5");

  const [activeTab, setActiveTab] = useState<"builder" | "logic" | "settings" | "theme" | "preview">("builder");
  const [schemas, setSchemas] = useState<any[]>([]);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedSchemaTable, setSelectedSchemaTable] = useState("");
  const [tableFieldSearch, setTableFieldSearch] = useState("");
  const [selectedTableCategory, setSelectedTableCategory] = useState("All");

  useEffect(() => {
    fetchSchemas();
  }, []);

  const fetchSchemas = async () => {
    try {
      setLoadingSchemas(true);
      const res = await fetch("/api/custom-forms/schema-fields");
      const data = await res.json();
      if (data.success) {
        setSchemas(data.schemas || []);
      }
    } catch (err) {
      console.error("Error fetching schemas:", err);
    } finally {
      setLoadingSchemas(false);
    }
  };

  const addField = (type: FormFieldConfig["type"], presetField?: any) => {
    const fieldCount = fields.length + 1;
    const newField: FormFieldConfig = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      key: presetField
        ? presetField.key
        : `field_${fieldCount}_${type}`,
      label: presetField ? presetField.label : `Custom ${type.toUpperCase()} Field ${fieldCount}`,
      type: presetField ? presetField.type : type,
      required: false,
      placeholder: presetField ? `Enter ${presetField.label}` : `Enter value...`,
      options: presetField?.options || (type === "select" || type === "radio" ? ["Option 1", "Option 2"] : []),
      mappedTable: presetField?.tableName || "",
      mappedField: presetField?.key || "",
      defaultValue: "",
      order: fields.length,
      section: "General Details",
      helpText: "",
    };

    setFields([...fields, newField]);
  };

  const importAllFieldsFromTable = (tableName: string) => {
    const targetSchema = schemas.find((s) => s.tableName === tableName);
    if (!targetSchema) return;

    const newImportedFields: FormFieldConfig[] = targetSchema.fields.map(
      (f: any, idx: number) => ({
        id: `field_${Date.now()}_${idx}`,
        key: `${f.key}`,
        label: f.label,
        type: (f.type as any) || "text",
        required: false,
        placeholder: `Enter ${f.label}`,
        options: f.options || [],
        mappedTable: tableName,
        mappedField: f.key,
        defaultValue: "",
        order: fields.length + idx,
        section: `${targetSchema.displayName}`,
        helpText: `Mapped from ${tableName}.${f.key}`,
      })
    );

    setFields([...fields, ...newImportedFields]);
  };

  const updateField = (index: number, updatedProperties: Partial<FormFieldConfig>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updatedProperties };
    setFields(updated);
  };

  const removeField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
  };

  const moveField = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === fields.length - 1)
    )
      return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFields(updated);
  };

  const handleSaveForm = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!title.trim()) {
      setErrorMsg("Please provide a Form Title.");
      return;
    }

    if (fields.length === 0) {
      setErrorMsg("Please add at least one field to the form.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title,
        description,
        category,
        status,
        fields,
        conditions,
        accessMode,
        accessPin,
        approvalWorkflow: { enabled: approvalEnabled, approverRole },
        autoMasterSync: { enabled: autoMasterSyncEnabled, targetModel },
        theme: { accentColor },
      };

      const url = isEditMode
        ? `/api/custom-forms/templates/${initialData?._id || initialData?.formId}`
        : "/api/custom-forms/templates";

      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(
          isEditMode
            ? "Form template updated successfully!"
            : "Form template created successfully!"
        );
        setTimeout(() => {
          router.push("/dashboard/custom-forms");
        }, 1200);
      } else {
        setErrorMsg(data.error || "Failed to save form template.");
      }
    } catch (err: any) {
      console.error("Error saving form template:", err);
      setErrorMsg("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <FaSlidersH className="text-indigo-600 dark:text-indigo-400" />
            {isEditMode ? "Edit Enterprise Dynamic Form" : "Create Enterprise Dynamic Form"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build dynamic forms, visual IF/THEN rules, public shareable links, and approval workflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Navigation Tabs */}
          <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex items-center text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab("builder")}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "builder"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <FaSlidersH /> Designer
            </button>
            <button
              onClick={() => setActiveTab("logic")}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "logic"
                  ? "bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <FaExchangeAlt /> IF/THEN Logic ({conditions.length})
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "settings"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <FaCog /> Settings & Access
            </button>
            <button
              onClick={() => setActiveTab("theme")}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "theme"
                  ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <FaPalette /> Theme
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "preview"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <FaEye /> Live Preview
            </button>
          </div>

          <button
            onClick={handleSaveForm}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
          >
            <FaSave /> {saving ? "Saving..." : "Save Form"}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <FaTimes className="text-rose-500" /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <FaCheck className="text-emerald-500" /> {successMsg}
        </div>
      )}

      {/* Main Tab Renderers */}
      {activeTab === "logic" ? (
        <ConditionalLogicEditor
          fields={fields}
          conditions={conditions}
          onChange={(newConds) => setConditions(newConds)}
        />
      ) : activeTab === "settings" ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6 max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <FaShieldAlt className="text-emerald-500" /> Enterprise Form Settings & Access Controls
          </h2>

          {/* Access Mode */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              Form Access Mode
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <label
                onClick={() => setAccessMode("Internal")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  accessMode === "Internal"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <span className="font-bold text-slate-800 dark:text-slate-100 block mb-1">
                  🔒 Internal CRM Users Only
                </span>
                <span className="text-slate-500">
                  Only logged-in staff and MRs can access and submit entries.
                </span>
              </label>

              <label
                onClick={() => setAccessMode("Public")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  accessMode === "Public"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <span className="font-bold text-slate-800 dark:text-slate-100 block mb-1">
                  🌐 Public Shareable Link
                </span>
                <span className="text-slate-500">
                  Anyone with the public link or QR code can fill out the form.
                </span>
              </label>

              <label
                onClick={() => setAccessMode("PasswordProtected")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  accessMode === "PasswordProtected"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <span className="font-bold text-slate-800 dark:text-slate-100 block mb-1">
                  🔑 PIN Code Protected
                </span>
                <span className="text-slate-500">
                  Respondents must enter a secret PIN code before filling.
                </span>
              </label>
            </div>

            {accessMode === "PasswordProtected" && (
              <div className="pt-2 max-w-xs">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Secret Access PIN Code
                </label>
                <input
                  type="text"
                  value={accessPin}
                  onChange={(e) => setAccessPin(e.target.value)}
                  placeholder="e.g. 1234"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>
            )}
          </div>

          {/* Manager Approval Workflow */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <FaUserCheck className="text-indigo-500" /> Manager Approval Workflow
                </h3>
                <p className="text-xs text-slate-500">
                  Submissions require manager approval (`Approve` / `Reject`) before completion.
                </p>
              </div>
              <input
                type="checkbox"
                checked={approvalEnabled}
                onChange={(e) => setApprovalEnabled(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded"
              />
            </div>

            {approvalEnabled && (
              <div className="pt-2 max-w-xs text-xs">
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Required Approver Role
                </label>
                <select
                  value={approverRole}
                  onChange={(e) => setApproverRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="Admin">Admin</option>
                  <option value="RSM">RSM / Manager</option>
                  <option value="ZSM">ZSM</option>
                </select>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "theme" ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6 max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <FaPalette className="text-rose-500" /> Custom Branding & Theme Accent
          </h2>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              Primary Theme Accent Color
            </label>
            <div className="flex items-center gap-4">
              {["#4f46e5", "#059669", "#7c3aed", "#e11d48", "#d97706", "#0284c7"].map((hex) => (
                <button
                  key={hex}
                  onClick={() => setAccentColor(hex)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    accentColor === hex ? "scale-110 border-slate-900 dark:border-white shadow-md" : "border-transparent"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-10 h-10 rounded-full cursor-pointer border-0"
              />
            </div>
          </div>
        </div>
      ) : activeTab === "preview" ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-4xl mx-auto">
          <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {title || "Untitled Form"}
            </h2>
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {description}
              </p>
            )}
          </div>
          <DynamicFormRenderer
            template={{
              title,
              description,
              fields,
              conditions,
              theme: { accentColor },
            }}
            readOnly={true}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Details & Field Toolboxes */}
          <div className="space-y-6 lg:col-span-1">
            {/* Form Meta Box */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base pb-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <FaLayerGroup className="text-indigo-500" /> Form Settings
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Form Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Doctor Feedback & Sample Request"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief overview of what this form collects..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="General">General</option>
                    <option value="Sales">Sales & Orders</option>
                    <option value="Field Work">MR & Field Work</option>
                    <option value="Customers">Customers & Doctors</option>
                    <option value="Feedback">Feedback & Surveys</option>
                    <option value="Accounts">Accounts & Finance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Toolbox 1: Add Custom Standard Fields */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base pb-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <FaPlus className="text-emerald-500" /> Add Custom Field
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => addField("text")}
                  className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 font-medium transition-all"
                >
                  <FaICursor className="text-indigo-500" /> Text Line
                </button>
                <button
                  onClick={() => addField("number")}
                  className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 font-medium transition-all"
                >
                  <FaHashtag className="text-amber-500" /> Number
                </button>
                <button
                  onClick={() => addField("date")}
                  className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 font-medium transition-all"
                >
                  <FaCalendar className="text-rose-500" /> Date
                </button>
                <button
                  onClick={() => addField("select")}
                  className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 font-medium transition-all"
                >
                  <FaChevronDown className="text-sky-500" /> Dropdown
                </button>
                <button
                  onClick={() => addField("textarea")}
                  className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 font-medium transition-all"
                >
                  <FaList className="text-violet-500" /> Textarea
                </button>
                <button
                  onClick={() => addField("checkbox")}
                  className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 font-medium transition-all"
                >
                  <FaCheckSquare className="text-emerald-500" /> Checkbox
                </button>
              </div>
            </div>

            {/* Toolbox 2: Import from Existing System & MongoDB Database Tables */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base pb-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FaDatabase className="text-cyan-500" /> Import Table Fields
                </span>
                <span className="text-[10px] bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 font-mono px-2 py-0.5 rounded-full">
                  {schemas.length} DB Tables
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a table OR use the Global Search bar below to search across ALL MongoDB tables and fields in your database.
              </p>

              {/* Category Pills for Quick Table Filtering */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                {["All", "⭐ Presets", "Sales", "Purchase", "Masters & Stock", "MR Work", "Finance & Users", "Raw DB Collections"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedTableCategory(cat);
                      setSelectedSchemaTable("");
                    }}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      selectedTableCategory === cat
                        ? "bg-cyan-600 text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Global Search across ALL MongoDB tables */}
              <div className="relative">
                <input
                  type="text"
                  value={tableFieldSearch}
                  onChange={(e) => setTableFieldSearch(e.target.value)}
                  placeholder="🔍 Global Search ALL DB Fields (e.g. Rate, GST, Bill, Party)..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-cyan-300 dark:border-cyan-700 rounded-xl dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                />
                <FaSearch className="absolute left-2.5 top-2.5 text-cyan-500 text-xs" />
              </div>

              {/* Table Dropdown Selector */}
              <div>
                <select
                  value={selectedSchemaTable}
                  onChange={(e) => setSelectedSchemaTable(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none font-medium"
                >
                  <option value="">-- Select Table from {selectedTableCategory} Category --</option>
                  {schemas
                    .filter((s) => {
                      if (selectedTableCategory === "All") return true;
                      if (selectedTableCategory === "⭐ Presets") return s.isCurated;
                      if (selectedTableCategory === "Raw DB Collections") return !s.isCurated;
                      return s.category === selectedTableCategory;
                    })
                    .map((s) => (
                      <option key={s.tableName} value={s.tableName}>
                        {s.displayName} ({s.fields.length} fields)
                      </option>
                    ))}
                </select>
              </div>

              {/* Global Search Results List */}
              {tableFieldSearch.trim() && (
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                    Global Search Results for &quot;{tableFieldSearch}&quot;
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 text-xs border border-cyan-100 dark:border-slate-700 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/30">
                    {schemas
                      .flatMap((s) =>
                        s.fields
                          .filter(
                            (f: any) =>
                              f.label.toLowerCase().includes(tableFieldSearch.toLowerCase()) ||
                              f.key.toLowerCase().includes(tableFieldSearch.toLowerCase()) ||
                              s.tableName.toLowerCase().includes(tableFieldSearch.toLowerCase()) ||
                              s.displayName.toLowerCase().includes(tableFieldSearch.toLowerCase())
                          )
                          .map((f: any) => ({ ...f, tableName: s.tableName, tableDisplayName: s.displayName }))
                      )
                      .slice(0, 50)
                      .map((f: any, idx: number) => (
                        <div
                          key={`${f.tableName}_${f.key}_${idx}`}
                          className="flex items-center justify-between p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60 shadow-2xs transition-all"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-100 block text-xs">
                              {f.label}
                            </span>
                            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
                              Table: {f.tableDisplayName || f.tableName} • <span className="font-mono text-slate-400">{f.key}</span>
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              addField(f.type || "text", {
                                ...f,
                                tableName: f.tableName,
                              })
                            }
                            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-md transition-all shadow-2xs shrink-0"
                          >
                            + Add Field
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Single Selected Table View */}
              {selectedSchemaTable && !tableFieldSearch.trim() && (
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => importAllFieldsFromTable(selectedSchemaTable)}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  >
                    Import All Fields from {selectedSchemaTable}
                  </button>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs border border-slate-100 dark:border-slate-700 rounded-lg p-2">
                    {schemas
                      .find((s) => s.tableName === selectedSchemaTable)
                      ?.fields.map((f: any) => (
                        <div
                          key={f.key}
                          className="flex items-center justify-between p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-all"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {f.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {f.key} ({f.type})
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              addField(f.type || "text", {
                                ...f,
                                tableName: selectedSchemaTable,
                              })
                            }
                            className="px-2 py-1 bg-cyan-50 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-800/50 text-xs font-bold rounded transition-all"
                          >
                            + Add
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Form Fields List & Reordering Canvas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                  Form Fields Canvas ({fields.length} fields)
                </h3>
                {fields.length > 0 && (
                  <button
                    onClick={() => setFields([])}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {fields.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                  <FaSlidersH className="mx-auto text-4xl text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-600 dark:text-slate-300 font-semibold">
                    No fields added yet
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Use the toolboxes on the left to add custom input fields or import fields from system database tables.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {field.type}
                          </span>
                          {field.mappedTable && (
                            <span className="text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300 px-2 py-0.5 rounded">
                              {field.mappedTable}.{field.mappedField}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveField(idx, "up")}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="Move Up"
                          >
                            <FaArrowUp />
                          </button>
                          <button
                            onClick={() => moveField(idx, "down")}
                            disabled={idx === fields.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="Move Down"
                          >
                            <FaArrowDown />
                          </button>
                          <button
                            onClick={() => removeField(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 ml-2"
                            title="Delete Field"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>

                      {/* Field Configuration Inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                            Field Label *
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) =>
                              updateField(idx, { label: e.target.value })
                            }
                            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                            Field Key (Unique Identifier)
                          </label>
                          <input
                            type="text"
                            value={field.key}
                            onChange={(e) =>
                              updateField(idx, {
                                key: e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9_]/g, "_"),
                              })
                            }
                            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                            Placeholder Text
                          </label>
                          <input
                            type="text"
                            value={field.placeholder || ""}
                            onChange={(e) =>
                              updateField(idx, { placeholder: e.target.value })
                            }
                            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                            Form Section Group
                          </label>
                          <input
                            type="text"
                            value={field.section || "General Details"}
                            onChange={(e) =>
                              updateField(idx, { section: e.target.value })
                            }
                            placeholder="e.g. Personal Info, Visit Details"
                            className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                          />
                        </div>

                        {(field.type === "select" || field.type === "radio") && (
                          <div className="md:col-span-2">
                            <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                              Options (Comma Separated)
                            </label>
                            <input
                              type="text"
                              value={(field.options || []).join(", ")}
                              onChange={(e) =>
                                updateField(idx, {
                                  options: e.target.value
                                    .split(",")
                                    .map((s) => s.trim()),
                                })
                              }
                              placeholder="e.g. High, Medium, Low"
                              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-4 pt-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                updateField(idx, { required: e.target.checked })
                              }
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Required Field
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
