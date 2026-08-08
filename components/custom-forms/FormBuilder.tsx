"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  FaSignature,
  FaMapMarkerAlt,
  FaCloudUploadAlt,
  FaCalculator,
  FaTable,
  FaStar,
  FaMagic,
  FaCopy,
  FaUndo,
  FaRedo,
  FaChevronUp,
  FaGripVertical,
  FaFont,
  FaImage,
  FaLink,
  FaSync,
  FaCalendarTimes,
  FaSmile,
  FaTextHeight,
} from "react-icons/fa";
import DynamicFormRenderer from "./DynamicFormRenderer";
import ConditionalLogicEditor from "./ConditionalLogicEditor";
import PharmaTemplatesModal from "./PharmaTemplatesModal";
import AiFormStudioModal from "./AiFormStudioModal";

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
    | "mappedTable"
    | "signature"
    | "gps"
    | "fileUpload"
    | "formula"
    | "repeaterTable"
    | "rating";
  required: boolean;
  placeholder?: string;
  options?: string[];
  mappedTable?: string;
  mappedField?: string;
  formulaExpression?: string;
  subFields?: any[];
  defaultValue?: any;
  order: number;
  section?: string;
  stepId?: string;
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

// ── Field type metadata ──────────────────────────────────────────────────────
const FIELD_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  text:          { label: "Text",          color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",  icon: "Aa" },
  number:        { label: "Number",        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",    icon: "#" },
  date:          { label: "Date",          color: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",        icon: "📅" },
  select:        { label: "Dropdown",      color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",           icon: "▾" },
  textarea:      { label: "Textarea",      color: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300", icon: "¶" },
  checkbox:      { label: "Checkbox",      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", icon: "☑" },
  radio:         { label: "Radio",         color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",        icon: "◉" },
  mappedTable:   { label: "DB Lookup",     color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",        icon: "⇋" },
  signature:     { label: "Signature",     color: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300", icon: "✍" },
  gps:           { label: "GPS Stamp",     color: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",        icon: "📍" },
  fileUpload:    { label: "File/Photo",    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300", icon: "📎" },
  formula:       { label: "Formula",       color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",    icon: "ƒ" },
  repeaterTable: { label: "Repeater",      color: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",       icon: "⊞" },
  rating:        { label: "Rating",        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",    icon: "★" },
};

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
  const [logoUrl, setLogoUrl] = useState((initialData?.theme as any)?.logoUrl || "");
  const [headerBanner, setHeaderBanner] = useState((initialData?.theme as any)?.headerBanner || "");
  const [fontFamily, setFontFamily] = useState((initialData?.theme as any)?.fontFamily || "Inter");
  const [submitButtonText, setSubmitButtonText] = useState((initialData?.theme as any)?.submitButtonText || "Submit Form");
  const [expiresAt, setExpiresAt] = useState((initialData as any)?.expirationConfig?.expiresAt ? new Date((initialData as any).expirationConfig.expiresAt).toISOString().split("T")[0] : "");
  const [maxSubmissions, setMaxSubmissions] = useState((initialData as any)?.expirationConfig?.maxSubmissions || 0);
  const [thankYouTitle, setThankYouTitle] = useState((initialData as any)?.thankYouConfig?.title || "Thank You!");
  const [thankYouMessage, setThankYouMessage] = useState((initialData as any)?.thankYouConfig?.message || "Your response has been successfully recorded.");

  // UX State
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"builder" | "logic" | "settings" | "theme" | "preview">("builder");
  const [schemas, setSchemas] = useState<any[]>([]);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Undo / Redo History
  const historyRef = useRef<FormFieldConfig[][]>([initialData?.fields || []]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushHistory = useCallback((newFields: FormFieldConfig[]) => {
    const hist = historyRef.current.slice(0, historyIndexRef.current + 1);
    hist.push(JSON.parse(JSON.stringify(newFields)));
    if (hist.length > 50) hist.shift();
    historyRef.current = hist;
    historyIndexRef.current = hist.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const prev = historyRef.current[historyIndexRef.current];
    setFields(JSON.parse(JSON.stringify(prev)));
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const next = historyRef.current[historyIndexRef.current];
    setFields(JSON.parse(JSON.stringify(next)));
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  const [selectedSchemaTable, setSelectedSchemaTable] = useState("");
  const [tableFieldSearch, setTableFieldSearch] = useState("");
  const [selectedTableCategory, setSelectedTableCategory] = useState("All");
  const [showPharmaModal, setShowPharmaModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const toggleFieldExpand = (id: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplyAiSchema = (schema: any) => {
    if (schema.title) setTitle(schema.title);
    if (schema.description) setDescription(schema.description);
    if (schema.category) setCategory(schema.category);
    if (schema.accessMode) setAccessMode(schema.accessMode);
    if (Array.isArray(schema.fields) && schema.fields.length > 0) {
      setFields(schema.fields);
    }
    if (Array.isArray(schema.conditions)) {
      setConditions(schema.conditions);
    }
    setSuccessMsg("✨ AI Form Schema successfully loaded into Builder!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

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
    const updated = [...fields, newField];
    setFields(updated);
    pushHistory(updated);
    // Auto-expand newly added field
    setExpandedFields((prev) => new Set([...prev, newField.id]));
  };

  const duplicateField = (index: number) => {
    const original = fields[index];
    const copy: FormFieldConfig = {
      ...JSON.parse(JSON.stringify(original)),
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      key: `${original.key}_copy`,
      label: `${original.label} (Copy)`,
      order: fields.length,
    };
    const updated = [
      ...fields.slice(0, index + 1),
      copy,
      ...fields.slice(index + 1),
    ];
    setFields(updated);
    pushHistory(updated);
    setExpandedFields((prev) => new Set([...prev, copy.id]));
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
    pushHistory(updated);
  };

  const removeField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
    pushHistory(updated);
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
    pushHistory(updated);
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
        theme: { accentColor, logoUrl, headerBanner, fontFamily, submitButtonText },
        expirationConfig: {
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          maxSubmissions: maxSubmissions || 0,
        },
        thankYouConfig: { title: thankYouTitle, message: thankYouMessage },
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Navigation Tabs */}
          <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex items-center text-xs font-semibold overflow-x-auto gap-0.5">
            {([
              { key: "builder",  icon: <FaSlidersH />,    label: "Designer",          color: "text-indigo-600 dark:text-indigo-400" },
              { key: "logic",    icon: <FaExchangeAlt />, label: `Logic (${conditions.length})`, color: "text-violet-600 dark:text-violet-400" },
              { key: "settings", icon: <FaCog />,         label: "Settings",          color: "text-emerald-600 dark:text-emerald-400" },
              { key: "theme",    icon: <FaPalette />,     label: "Theme",             color: "text-rose-600 dark:text-rose-400" },
              { key: "preview",  icon: <FaEye />,         label: "Preview",           color: "text-indigo-600 dark:text-indigo-400" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.key
                    ? `bg-white dark:bg-slate-800 ${tab.color} shadow-sm`
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-30 transition-all"
            >
              <FaUndo className="text-xs" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-30 transition-all"
            >
              <FaRedo className="text-xs" />
            </button>
          </div>

          <button
            onClick={() => setShowAiModal(true)}
            className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            <FaMagic className="text-amber-300" /> AI Studio
          </button>

          <button
            onClick={() => setShowPharmaModal(true)}
            className="px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            <FaMagic /> Presets
          </button>

          <button
            onClick={handleSaveForm}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0"
          >
            <FaSave /> {saving ? "Saving..." : "Save Form"}
          </button>
        </div>
      </div>

      {showPharmaModal && (
        <PharmaTemplatesModal
          onSelect={(preset) => {
            setTitle(preset.title);
            setCategory(preset.category);
            setDescription(preset.description);
            setFields(preset.fields);
            if (preset.conditions) setConditions(preset.conditions);
            setShowPharmaModal(false);
            setSuccessMsg(`Loaded "${preset.title}" template successfully!`);
          }}
          onClose={() => setShowPharmaModal(false)}
        />
      )}

      {/* AI Form Studio Assistant Modal */}
      <AiFormStudioModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onApplySchema={handleApplyAiSchema}
      />

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
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6 w-full">
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
                  Submissions require manager approval (Approve / Reject) before completion.
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

          {/* Auto Master Sync */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <FaSync className="text-cyan-500" /> Auto Master DB Sync
                </h3>
                <p className="text-xs text-slate-500">
                  Auto-create a database record in a master collection when a form is submitted.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoMasterSyncEnabled}
                onChange={(e) => setAutoMasterSyncEnabled(e.target.checked)}
                className="w-5 h-5 text-cyan-600 rounded"
              />
            </div>
            {autoMasterSyncEnabled && (
              <div className="pt-2 max-w-xs text-xs">
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Target Master Collection (Model Name)
                </label>
                <input
                  type="text"
                  value={targetModel}
                  onChange={(e) => setTargetModel(e.target.value)}
                  placeholder="e.g. Customer, MrCallLog, StockEntry"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none font-mono"
                />
              </div>
            )}
          </div>

          {/* Expiry & Limits */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <FaCalendarTimes className="text-rose-500" /> Form Expiry & Submission Limits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Auto-Close Date (optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                />
                <p className="text-slate-400 mt-1">Form auto-closes on this date.</p>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Max Submissions (0 = unlimited)
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxSubmissions}
                  onChange={(e) => setMaxSubmissions(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                />
                <p className="text-slate-400 mt-1">Form stops accepting after this count.</p>
              </div>
            </div>
          </div>

          {/* Thank You Page Config */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <FaSmile className="text-amber-500" /> Thank You / Confirmation Page
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Success Title</label>
                <input
                  type="text"
                  value={thankYouTitle}
                  onChange={(e) => setThankYouTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Success Message</label>
                <input
                  type="text"
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "theme" ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6 w-full">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <FaPalette className="text-rose-500" /> Custom Branding & Theme
          </h2>

          {/* Accent Color */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              Primary Accent Color
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {["#4f46e5", "#059669", "#7c3aed", "#e11d48", "#d97706", "#0284c7", "#0f172a", "#be185d"].map((hex) => (
                <button
                  key={hex}
                  onClick={() => setAccentColor(hex)}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                    accentColor === hex ? "scale-110 border-slate-900 dark:border-white shadow-lg ring-2 ring-offset-1 ring-slate-400" : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-9 h-9 rounded-full cursor-pointer border-2 border-slate-300"
                />
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">{accentColor}</span>
            </div>
            {/* Live preview bar */}
            <div className="h-2 rounded-full transition-all" style={{ backgroundColor: accentColor }} />
          </div>

          {/* Font Family */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <FaFont className="text-indigo-500" /> Form Font Family
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {["Inter", "Roboto", "Poppins", "Outfit", "DM Sans", "Nunito", "Lato", "Montserrat"].map((font) => (
                <button
                  key={font}
                  onClick={() => setFontFamily(font)}
                  className={`px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all ${
                    fontFamily === font
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </div>
          </div>

          {/* Logo URL */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <FaImage className="text-violet-500" /> Brand Logo URL
            </label>
            <div className="flex items-center gap-3">
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://your-domain.com/logo.png"
                className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500"
              />
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo Preview" className="w-12 h-12 object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1" />
              )}
            </div>
          </div>

          {/* Header Banner */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <FaTextHeight className="text-rose-500" /> Header Banner Image URL
            </label>
            <input
              type="url"
              value={headerBanner}
              onChange={(e) => setHeaderBanner(e.target.value)}
              placeholder="https://your-domain.com/banner.jpg (recommended: 1200×300)"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500"
            />
            {headerBanner && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={headerBanner} alt="Banner Preview" className="w-full h-24 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
            )}
          </div>

          {/* Submit Button Text */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <FaLink className="text-emerald-500" /> Submit Button Text
            </label>
            <input
              type="text"
              value={submitButtonText}
              onChange={(e) => setSubmitButtonText(e.target.value)}
              placeholder="e.g. Submit Form, Send Response, Book Now"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 max-w-sm"
            />
            <p className="text-xs text-slate-400">This text appears on the submit button of the public/filled form.</p>
          </div>
        </div>
      ) : activeTab === "preview" ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 w-full">
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
                <FaPlus className="text-emerald-500" /> Add Rich Field Type
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
                <button
                  onClick={() => addField("signature")}
                  className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 font-medium transition-all"
                >
                  <FaSignature className="text-violet-600" /> E-Signature Pad
                </button>
                <button
                  onClick={() => addField("gps")}
                  className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 font-medium transition-all"
                >
                  <FaMapMarkerAlt className="text-rose-600" /> GPS Stamp
                </button>
                <button
                  onClick={() => addField("fileUpload")}
                  className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 font-medium transition-all"
                >
                  <FaCloudUploadAlt className="text-indigo-600" /> File / Photo
                </button>
                <button
                  onClick={() => addField("formula")}
                  className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 font-medium transition-all"
                >
                  <FaCalculator className="text-amber-600" /> Formula Calc
                </button>
                <button
                  onClick={() => addField("repeaterTable")}
                  className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 font-medium transition-all col-span-2"
                >
                  <FaTable className="text-cyan-600" /> Line Items Repeater Table
                </button>
                <button
                  onClick={() => addField("rating")}
                  className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-2 font-medium transition-all col-span-2"
                >
                  <FaStar className="text-amber-400" /> 5-Star Rating / NPS
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
                <div className="space-y-3">
                  {fields.map((field, idx) => {
                    const isExpanded = expandedFields.has(field.id);
                    const meta = FIELD_TYPE_META[field.type] || { label: field.type, color: "bg-slate-100 text-slate-600", icon: "?" };
                    return (
                    <div
                      key={field.id}
                      className={`bg-white dark:bg-slate-900 border rounded-xl shadow-xs transition-all group ${
                        isExpanded ? "border-indigo-300 dark:border-indigo-700 shadow-sm" : "border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800"
                      }`}
                    >
                      {/* ── Collapsed Header (always visible) ── */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Drag handle */}
                        <FaGripVertical className="text-slate-300 dark:text-slate-600 text-xs flex-shrink-0 cursor-grab" />

                        {/* Index badge */}
                        <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                          {idx + 1}
                        </span>

                        {/* Type pill */}
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </span>

                        {/* Label preview */}
                        <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                          {field.label || <span className="text-slate-400 italic">Unlabeled field</span>}
                        </span>

                        {/* Required badge */}
                        {field.required && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full flex-shrink-0">Required</span>
                        )}

                        {/* Mapped table */}
                        {field.mappedTable && (
                          <span className="text-[10px] font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 px-2 py-0.5 rounded-full flex-shrink-0 truncate max-w-[100px]">
                            {field.mappedTable}
                          </span>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => moveField(idx, "up")} disabled={idx === 0} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 transition-all" title="Move Up"><FaArrowUp className="text-[10px]" /></button>
                          <button onClick={() => moveField(idx, "down")} disabled={idx === fields.length - 1} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 transition-all" title="Move Down"><FaArrowDown className="text-[10px]" /></button>
                          <button onClick={() => duplicateField(idx)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all" title="Duplicate Field"><FaCopy className="text-[10px]" /></button>
                          <button onClick={() => removeField(idx)} className="p-1.5 text-rose-400 hover:text-rose-600 transition-all" title="Delete Field"><FaTrash className="text-[10px]" /></button>
                          <button
                            onClick={() => toggleFieldExpand(field.id)}
                            className={`p-1.5 ml-1 rounded-lg transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 ${ isExpanded ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : ""}`}
                            title={isExpanded ? "Collapse" : "Expand & Edit"}
                          >
                            {isExpanded ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                          </button>
                        </div>
                      </div>

                      {/* ── Expanded Editor (conditionally shown) ── */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Field Label *</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateField(idx, { label: e.target.value })}
                                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Field Key (Unique ID)</label>
                              <input
                                type="text"
                                value={field.key}
                                onChange={(e) => updateField(idx, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none font-mono focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Placeholder Text</label>
                              <input
                                type="text"
                                value={field.placeholder || ""}
                                onChange={(e) => updateField(idx, { placeholder: e.target.value })}
                                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Section Group</label>
                              <input
                                type="text"
                                value={field.section || "General Details"}
                                onChange={(e) => updateField(idx, { section: e.target.value })}
                                placeholder="e.g. Personal Info, Visit Details"
                                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Help Text (shows below field)</label>
                              <input
                                type="text"
                                value={field.helpText || ""}
                                onChange={(e) => updateField(idx, { helpText: e.target.value })}
                                placeholder="e.g. Enter the doctor's full registered name"
                                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            {(field.type === "select" || field.type === "radio") && (
                              <div className="md:col-span-2">
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Options (Comma Separated)</label>
                                <input
                                  type="text"
                                  value={(field.options || []).join(", ")}
                                  onChange={(e) => updateField(idx, { options: e.target.value.split(",").map((s) => s.trim()) })}
                                  placeholder="e.g. High, Medium, Low"
                                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            )}

                            {field.type === "formula" && (
                              <div className="md:col-span-2">
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Formula Expression</label>
                                <input
                                  type="text"
                                  value={field.formulaExpression || ""}
                                  onChange={(e) => updateField(idx, { formulaExpression: e.target.value })}
                                  placeholder="e.g. [qty] * [rate]"
                                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none font-mono focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => updateField(idx, { required: e.target.checked })}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Required Field</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
