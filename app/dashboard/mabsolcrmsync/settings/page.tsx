"use client";

import { useEffect, useState, useRef } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import {
  Database,
  Lock,
  Unlock,
  FolderOpen,
  Save,
  RefreshCw,
  Terminal,
  Check,
  ShieldCheck,
  Info,
  UserCheck,
  Key,
  CheckCircle2
} from "lucide-react";

interface VfpSettingLogEntry {
  _id: string;
  userName: string;
  companyName: string;
  license: string;
  vfpExePath: string;
  action: string;
  status: string;
  message?: string;
  ipAddress?: string;
  createdAt: string;
}

export default function VfpSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [launchingVfp, setLaunchingVfp] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "danger" | ""; text: string }>({ type: "", text: "" });
  const [logs, setLogs] = useState<VfpSettingLogEntry[]>([]);

  // Native file/folder input refs for settings page
  const nativeFileInputRef = useRef<HTMLInputElement>(null);
  const nativeFolderInputRef = useRef<HTMLInputElement>(null);
  const activeFieldRef = useRef<"vfpExePath" | "prgPath" | "sourceDir" | "dataDir" | null>(null);

  const openFileBrowser = (
    fieldKey: "vfpExePath" | "prgPath" | "sourceDir" | "dataDir",
    filterType: "exe" | "prg" | "dir",
    _title: string
  ) => {
    activeFieldRef.current = fieldKey;
    if (filterType === "dir") {
      nativeFolderInputRef.current?.click();
    } else {
      if (nativeFileInputRef.current) {
        nativeFileInputRef.current.accept = filterType === "exe" ? ".exe" : ".prg,.txt,.log";
        nativeFileInputRef.current.click();
      }
    }
  };

  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const fieldKey = activeFieldRef.current;
    if (files && files.length > 0 && fieldKey) {
      const file = files[0];
      const nativePath = (file as any).path;
      if (nativePath) {
        setForm((prev) => ({ ...prev, [fieldKey]: nativePath }));
      } else {
        const relPath = (file as any).webkitRelativePath || "";
        if (relPath && relPath.includes("/")) {
          setForm((prev) => ({ ...prev, [fieldKey]: relPath.replace(/\//g, "\\") }));
        } else {
          setForm((prev) => ({ ...prev, [fieldKey]: file.name }));
        }
      }
    }
    e.target.value = "";
  };

  const handleNativeFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const fieldKey = activeFieldRef.current;
    if (files && files.length > 0 && fieldKey) {
      const firstFile = files[0] as any;
      let nativePath = firstFile.path;
      if (nativePath) {
        const lastSlash = Math.max(nativePath.lastIndexOf("/"), nativePath.lastIndexOf("\\"));
        if (lastSlash !== -1) nativePath = nativePath.substring(0, lastSlash);
        setForm((prev) => ({ ...prev, [fieldKey]: nativePath }));
      } else {
        const relPath = firstFile.webkitRelativePath || "";
        let relFolder = "";
        if (relPath) {
          const firstSlash = relPath.indexOf("/");
          if (firstSlash !== -1) relFolder = relPath.substring(0, firstSlash);
        }
        const folderName = relFolder || firstFile.name || "";
        const currentVal = form[fieldKey] || "";
        let exactPath = folderName;
        if (currentVal && (currentVal.includes(":") || currentVal.startsWith("/"))) {
          const lastSlash = Math.max(currentVal.lastIndexOf("/"), currentVal.lastIndexOf("\\"));
          if (lastSlash !== -1) {
            const parentDir = currentVal.substring(0, lastSlash);
            exactPath = `${parentDir}\\${folderName}`;
          } else {
            exactPath = `${currentVal}\\${folderName}`;
          }
        }
        setForm((prev) => ({ ...prev, [fieldKey]: exactPath }));
      }
    }
    e.target.value = "";
  };

  // Original saved data to restore on Cancel
  const [savedForm, setSavedForm] = useState({
    userName: "",
    companyName: "",
    license: "",
    vfpExePath: "",
    prgPath: "",
    sourceDir: "",
    dataDir: "",
  });

  const [form, setForm] = useState({
    userName: "",
    companyName: "",
    license: "",
    vfpExePath: "",
    prgPath: "",
    sourceDir: "",
    dataDir: "",
  });

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/mabsolcrmsync/config");
      const data = await res.json();
      if (data.success) {
        const configData = {
          userName: data.userName || "",
          companyName: data.companyName || "",
          license: data.license || "",
          vfpExePath: data.vfpExePath || "",
          prgPath: data.prgPath || "",
          sourceDir: data.sourceDir || "",
          dataDir: data.dataDir || "",
        };
        setForm(configData);
        setSavedForm(configData);
      }
    } catch (error) {
      console.error("Failed to load sync config:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await fetch("/api/mabsolcrmsync/setting-logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to load setting logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (
      !form.userName.trim() ||
      !form.companyName.trim() ||
      !form.license.trim() ||
      !form.prgPath.trim()
    ) {
      setMessage({ type: "danger", text: "Operator, Company name, License Key, and PRG Path are required." });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/mabsolcrmsync/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: form.userName,
          companyName: form.companyName,
          license: form.license,
          vfpExePath: form.vfpExePath,
          prgPath: form.prgPath,
          sourceDir: form.sourceDir,
          dataDir: form.dataDir,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Settings saved and logged successfully." });
        setSavedForm(form);
        setIsEditing(false);
        loadLogs();
      } else {
        setMessage({ type: "danger", text: data.error || "Failed to save configuration." });
      }
    } catch {
      setMessage({ type: "danger", text: "An error occurred while saving settings." });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm(savedForm);
    setIsEditing(false);
    setMessage({ type: "", text: "" });
  };

  const handleLaunchVfp = async () => {
    setMessage({ type: "", text: "" });
    try {
      setLaunchingVfp(true);
      const res = await fetch("/api/mabsolcrmsync/launch-vfp", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message || "VFP console launched to extract DBF data." });
        loadLogs();
      } else {
        setMessage({ type: "danger", text: data.error || "Failed to launch VFP console." });
      }
    } catch {
      setMessage({ type: "danger", text: "An error occurred while launching VFP console." });
    } finally {
      setLaunchingVfp(false);
    }
  };

  function formatDate(dateStr: string) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString([], {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  // Filter logs to ONLY show VFP Data extraction logs (launching vfp.exe to extract DBF tables)
  const vfpDataLogs = logs.filter((log) => {
    const act = (log.action || "").toLowerCase();
    const msg = (log.message || "").toLowerCase();
    return (
      act === "vfp_launched" ||
      act === "launch_vfp" ||
      msg.includes("visual foxpro") ||
      (msg.includes("vfp") && !msg.includes("sync"))
    );
  });

  return (
    <ProtectedPage permission="vfp.settings">
      <div className="w-full max-w-full overflow-x-hidden  sm:p-6 lg:p-8 space-y-6 text-slate-900 box-border bg-slate-50/40 min-h-screen">
        
        {/* Eyebrow & Page Header */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-800 uppercase mb-1.5">
            <Database size={14} className="text-slate-700" />
            <span>DATA MIGRATION</span>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full max-w-full">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 m-0 leading-tight">
                Migrate Data Settings
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl m-0 mt-1">
                Configure FoxPro executable paths, operator credentials, and directory targets for DBF data extraction.
              </p>
            </div>
            
            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
              <button
                type="button"
                onClick={handleLaunchVfp}
                disabled={launchingVfp || isEditing || !savedForm.vfpExePath}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2 px-5 text-xs sm:text-sm font-bold bg-black hover:bg-slate-900 active:scale-[0.99] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed btn-pill"
                style={{ borderRadius: "9999px" }}
              >
                {launchingVfp ? <RefreshCw size={14} className="animate-spin text-white" /> : <Terminal size={14} className="text-white" />}
                <span>{launchingVfp ? "Launching VFP..." : "Launch VFP Console"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Ultra-Compact Always-Animated Guidance Banner */}
        <div 
          className="bg-gradient-to-r from-white via-slate-50/80 to-white border border-slate-200/90 shadow-2xs p-2.5 sm:p-3 px-3.5 sm:px-4 rounded-xl w-full box-border animate-in fade-in duration-300"
          style={{ borderRadius: "14px" }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-100/80">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                <ShieldCheck size={13} />
              </div>
              <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                Console Guidance & Audit Check
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0 self-start sm:self-auto">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span>Console healthy</span>
            </span>
          </div>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
            <div className="flex items-center gap-2 bg-white/90 p-2 px-2.5 rounded-lg border border-teal-100/80 shadow-2xs overflow-hidden box-border">
              <div className="w-5 h-5 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <Terminal size={12} className="animate-pulse" />
              </div>
              <span className="font-semibold text-slate-800 truncate">
                Verify executable path before launching console
              </span>
            </div>

            <div className="flex items-center gap-2 bg-white/90 p-2 px-2.5 rounded-lg border border-teal-100/80 shadow-2xs overflow-hidden box-border">
              <div className="w-5 h-5 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <UserCheck size={12} className="animate-pulse" />
              </div>
              <span className="font-semibold text-slate-800 truncate">
                Use operator login to audit database changes
              </span>
            </div>

            <div className="flex items-center gap-2 bg-white/90 p-2 px-2.5 rounded-lg border border-teal-100/80 shadow-2xs overflow-hidden box-border sm:col-span-2 lg:col-span-1">
              <div className="w-5 h-5 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <Key size={12} className="animate-pulse" />
              </div>
              <span className="font-semibold text-slate-800 truncate">
                Keep license key stored securely at all times
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Alert Message */}
        {message.text && (
          <div 
            className={`p-3.5 border text-xs font-semibold leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200 ${
              message.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-red-50 border-red-200 text-red-800"
            }`}
            style={{ borderRadius: "16px" }}
          >
            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-current" />
            <span className="flex-1">{message.text}</span>
          </div>
        )}

        {/* Stored Configuration Main Card */}
        <div 
          className="bg-white border border-slate-200/90 shadow-xs overflow-hidden w-full max-w-full box-border"
          style={{ borderRadius: "24px" }}
        >
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 flex-wrap gap-3 w-full box-border bg-white">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight m-0 flex items-center gap-2">
                <Database size={16} className="text-slate-700" />
                <span>Stored Configuration</span>
              </h2>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Current Mabsol CRM Sync integration parameters, credentials, and folder targets
              </p>
            </div>
            
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs btn-pill"
                style={{ borderRadius: "9999px" }}
              >
                <Unlock size={13} className="text-slate-500" />
                <span>Unlock to edit</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs btn-pill"
                style={{ borderRadius: "9999px" }}
              >
                <Lock size={13} className="text-slate-500" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="p-3.5 sm:p-5 space-y-4 w-full box-border">
            
            {/* Section 1: Operator & Security Credentials */}
            <div className="space-y-2.5">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                OPERATOR AND SECURITY CREDENTIALS
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Operator display name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50/60 border border-slate-200/80 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white disabled:bg-slate-100/60 disabled:text-slate-500 disabled:cursor-not-allowed shadow-2xs transition-all"
                    style={{ borderRadius: "12px" }}
                    placeholder="Enter Operator name"
                    value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    License key
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50/60 border border-slate-200/80 px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white disabled:bg-slate-100/60 disabled:text-slate-500 disabled:cursor-not-allowed shadow-2xs transition-all"
                    style={{ borderRadius: "12px" }}
                    placeholder="Enter License Key"
                    value={form.license}
                    onChange={(e) => setForm({ ...form, license: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 2: Mabsol CRM Integration Paths */}
            <div className="space-y-3">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                MABSOL CRM INTEGRATION PATHS & CONSOLE TARGETS
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Company / organization name (e.g. A01 to Z01)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-50/60 border border-slate-200/80 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white disabled:bg-slate-100/60 disabled:text-slate-500 disabled:cursor-not-allowed shadow-2xs transition-all"
                    style={{ borderRadius: "12px" }}
                    placeholder="e.g. A01"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Sync executable path (VFP Console)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                    <input
                      type="text"
                      className="w-full sm:flex-1 min-w-0 bg-slate-50/60 border border-slate-200/80 px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white disabled:bg-slate-100/60 disabled:text-slate-500 disabled:cursor-not-allowed shadow-2xs transition-all"
                      style={{ borderRadius: "12px" }}
                      placeholder="C:\abc.exe"
                      value={form.vfpExePath}
                      onChange={(e) => setForm({ ...form, vfpExePath: e.target.value })}
                      disabled={!isEditing}
                      required
                    />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => openFileBrowser("vfpExePath", "exe", "Select Executable")}
                        className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-all btn-pill cursor-pointer shrink-0 shadow-2xs"
                        style={{ borderRadius: "9999px" }}
                      >
                        Browse
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Log output / PRG path
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                    <input
                      type="text"
                      className="w-full sm:flex-1 min-w-0 bg-slate-50/60 border border-slate-200/80 px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white disabled:bg-slate-100/60 disabled:text-slate-500 disabled:cursor-not-allowed shadow-2xs transition-all"
                      style={{ borderRadius: "12px" }}
                      placeholder="e.g. D:\01.prg"
                      value={form.prgPath}
                      onChange={(e) => setForm({ ...form, prgPath: e.target.value })}
                      disabled={!isEditing}
                      required
                    />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => openFileBrowser("prgPath", "prg", "Select PRG File")}
                        className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-all btn-pill cursor-pointer shrink-0 shadow-2xs"
                        style={{ borderRadius: "9999px" }}
                      >
                        Browse
                      </button>
                    )}
                  </div>
                </div>

                {/* Source Data Folder (Where to select data) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Source data folder path (Where to select data)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                    <input
                      type="text"
                      className="w-full sm:flex-1 min-w-0 bg-slate-50/60 border border-slate-200/80 px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white disabled:bg-slate-100/60 disabled:text-slate-500 disabled:cursor-not-allowed shadow-2xs transition-all"
                      style={{ borderRadius: "12px" }}
                      placeholder="e.g. C:\Select"
                      value={form.sourceDir}
                      onChange={(e) => setForm({ ...form, sourceDir: e.target.value })}
                      disabled={!isEditing}
                    />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => openFileBrowser("sourceDir", "dir", "Select Source Data Folder")}
                        className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-all btn-pill cursor-pointer shrink-0 shadow-2xs"
                        style={{ borderRadius: "9999px" }}
                      >
                        Browse
                      </button>
                    )}
                  </div>
                </div>

                {/* Destination Data Folder (Where to copy data) */}
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Destination data folder path (Where to copy data)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                    <input
                      type="text"
                      className="w-full sm:flex-1 min-w-0 bg-slate-50/60 border border-slate-200/80 px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white disabled:bg-slate-100/60 disabled:text-slate-500 disabled:cursor-not-allowed shadow-2xs transition-all"
                      style={{ borderRadius: "12px" }}
                      placeholder="e.g. C:\MabsolCRM_Data"
                      value={form.dataDir}
                      onChange={(e) => setForm({ ...form, dataDir: e.target.value })}
                      disabled={!isEditing}
                    />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => openFileBrowser("dataDir", "dir", "Select Destination Data Folder")}
                        className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-all btn-pill cursor-pointer shrink-0 shadow-2xs"
                        style={{ borderRadius: "9999px" }}
                      >
                        Browse
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Save Action Row (Only when editing) */}
            {isEditing && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 w-full">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-black hover:bg-slate-900 transition-all btn-pill shadow-xs cursor-pointer disabled:opacity-50"
                  style={{ borderRadius: "9999px" }}
                >
                  <Save size={13} />
                  <span>{loading ? "Saving..." : "Save changes"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 text-xs sm:text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all btn-pill cursor-pointer"
                  style={{ borderRadius: "9999px" }}
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Audit Log Card (Filtered ONLY for VFP Data Generation & Config Edits) */}
        <div 
          className="bg-white border border-slate-200/90 shadow-xs overflow-hidden w-full max-w-full box-border"
          style={{ borderRadius: "24px" }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight m-0 flex items-center gap-2">
                <Terminal size={16} className="text-slate-700" />
                <span>VFP Data Extraction & Settings Trail</span>
              </h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Audit trail of Visual FoxPro console launches and configuration edits for DBF data generation
              </p>
            </div>
            
            <button
              onClick={loadLogs}
              disabled={logsLoading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-all shadow-2xs btn-pill cursor-pointer shrink-0"
              style={{ borderRadius: "9999px" }}
            >
              <RefreshCw size={13} className={`text-slate-500 ${logsLoading ? "animate-spin" : ""}`} />
              <span>Refresh trail</span>
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3.5 pl-5">TIME AND DATE</th>
                  <th className="p-3.5">ACTION</th>
                  <th className="p-3.5">OPERATOR</th>
                  <th className="p-3.5">TARGET PATH</th>
                  <th className="p-3.5">LICENSE KEY</th>
                  <th className="p-3.5 pr-5">SUMMARY</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {logsLoading && vfpDataLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400 font-medium">
                      Loading audit entries...
                    </td>
                  </tr>
                ) : vfpDataLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400 font-medium">
                      No VFP data extraction entries found. Click &quot;Launch VFP Console&quot; above to record extraction logs.
                    </td>
                  </tr>
                ) : (
                  vfpDataLogs.map((log) => {
                    return (
                      <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-5 text-xs text-slate-600 font-mono whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-teal-50 text-teal-700 border-teal-200">
                            VFP Data Extraction
                          </span>
                        </td>
                        <td className="p-3.5 text-xs text-slate-900 font-bold whitespace-nowrap">
                          {log.userName}
                        </td>
                        <td className="p-3.5 text-xs text-slate-600 font-mono whitespace-nowrap max-w-[200px] truncate" title={log.vfpExePath}>
                          {log.vfpExePath || "N/A"}
                        </td>
                        <td className="p-3.5 text-xs text-slate-600 font-mono whitespace-nowrap">
                          {log.license ? log.license.substring(0, 12) : "N/A"}
                        </td>
                        <td className="p-3.5 pr-5 text-xs text-slate-700 max-w-[280px] break-words" title={log.message}>
                          {log.message || "Visual FoxPro console opened to extract DBF data."}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 px-5 text-[11px] font-mono text-slate-400 border-t border-slate-100">
            Showing {vfpDataLogs.length} VFP data extraction audit entries
          </div>
        </div>

        {/* Native Hidden File and Directory Explorer Inputs */}
        <input
          type="file"
          ref={nativeFileInputRef}
          style={{ display: "none" }}
          onChange={handleNativeFileChange}
        />
        <input
          type="file"
          ref={nativeFolderInputRef}
          //@ts-ignore
          webkitdirectory=""
          directory=""
          style={{ display: "none" }}
          onChange={handleNativeFolderChange}
        />

      </div>
    </ProtectedPage>
  );
}
