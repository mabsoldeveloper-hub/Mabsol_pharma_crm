"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import { useToast } from "@/context/ToastContext";
import "./vfp-settings.css";
import {
  Database,
  Save,
  RefreshCw,
  Terminal,
  Key,
  CheckCircle2,
  AlertCircle,
  FolderUp,
  FileUp,
  Clock,
  Play,
  Zap,
  FolderCheck,
  Power,
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

function formatIntervalSummary(mins: number): string {
  if (!mins || mins <= 0) return "Every 10 mins";
  if (mins < 60) return `Every ${mins} min${mins === 1 ? "" : "s"}`;
  if (mins % 1440 === 0) {
    const d = mins / 1440;
    return `Every ${d} day${d === 1 ? "" : "s"}`;
  }
  if (mins % 60 === 0) {
    const h = mins / 60;
    return `Every ${h} hr${h === 1 ? "" : "s"}`;
  }
  return `Every ${mins} mins`;
}

function formatCountdown(totalSec: number): string {
  if (totalSec <= 0) return "Starting...";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s < 10 ? "0" : ""}${s}s`;
  return `${m}m ${s < 10 ? "0" : ""}${s}s`;
}

export default function VfpSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [launchingVfp, setLaunchingVfp] = useState(false);
  const [uploadingSource, setUploadingSource] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<VfpSettingLogEntry[]>([]);

  // Source Data Server Status
  const [hasSourceData, setHasSourceData] = useState(false);
  const [uploadedSourceFilesCount, setUploadedSourceFilesCount] = useState(0);
  const [lastSourceUploadedAt, setLastSourceUploadedAt] = useState<string | null>(null);
  const [lastUploadedByUserId, setLastUploadedByUserId] = useState<string | null>(null);
  const [lastUploadedByUserName, setLastUploadedByUserName] = useState<string | null>(null);
  const [lastUploadedByUserEmail, setLastUploadedByUserEmail] = useState<string | null>(null);
  const [lastVfpExtractedAt, setLastVfpExtractedAt] = useState<string | null>(null);

  // Auto-Extraction Scheduler State
  const [autoExtract, setAutoExtract] = useState(false);
  const [autoExtractInterval, setAutoExtractInterval] = useState(10);
  const [customValueStr, setCustomValueStr] = useState("10");
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [presetInterval, setPresetInterval] = useState("10");
  const [countdownSec, setCountdownSec] = useState<number>(600);
  const [isEditingInterval, setIsEditingInterval] = useState(false);

  const sourceFolderInputRef = useRef<HTMLInputElement>(null);
  const sourceFilesInputRef = useRef<HTMLInputElement>(null);
  const nextRunTimeRef = useRef<number>(Date.now() + 600000);

  // Form State
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

  const hasChanges =
    form.userName.trim() !== savedForm.userName.trim() ||
    form.companyName.trim() !== savedForm.companyName.trim() ||
    form.license.trim() !== savedForm.license.trim();

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
          vfpExePath: data.vfpExePath || "/home/vfpuser/MabsolEXE/MabsolCRM.exe",
          prgPath: data.prgPath || "/home/vfpuser/MabsolPRG/7.PRG",
          sourceDir: data.sourceDir || "/home/vfpuser/MabsolData",
          dataDir: data.dataDir || "/home/vfpuser/MabsolSyncData",
        };
        setForm(configData);
        setSavedForm(configData);

        setHasSourceData(Boolean(data.hasSourceData));
        setUploadedSourceFilesCount(Number(data.uploadedSourceFilesCount) || 0);
        setLastSourceUploadedAt(data.lastSourceUploadedAt || null);
        setLastUploadedByUserId(data.lastUploadedByUserId || null);
        setLastUploadedByUserName(data.lastUploadedByUserName || null);
        setLastUploadedByUserEmail(data.lastUploadedByUserEmail || null);
        setLastVfpExtractedAt(data.lastVfpExtractedAt || null);

        const isAuto = Boolean(data.autoVfpExtract);
        const intervalMins = Number(data.autoVfpExtractInterval) || 10;
        setAutoExtract(isAuto);
        setAutoExtractInterval(intervalMins);

        if ([10, 30, 60, 360, 720, 1440].includes(intervalMins)) {
          setPresetInterval(String(intervalMins));
        } else {
          setPresetInterval("custom");
          if (intervalMins >= 1440 && intervalMins % 1440 === 0) {
            setCustomValueStr(String(intervalMins / 1440));
            setCustomUnit("days");
          } else if (intervalMins >= 60 && intervalMins % 60 === 0) {
            setCustomValueStr(String(intervalMins / 60));
            setCustomUnit("hours");
          } else {
            setCustomValueStr(String(intervalMins));
            setCustomUnit("minutes");
          }
        }

        if (isAuto) {
          nextRunTimeRef.current = Date.now() + intervalMins * 60 * 1000;
          setCountdownSec(intervalMins * 60);
        }
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

  // Upload handler for Source Data files / folders
  const handleUploadSourceData = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setUploadingSource(true);
    toast.info(`Uploading ${files.length} data file(s) to server...`);

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await fetch("/api/mabsolcrmsync/upload-source-data", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Successfully uploaded ${files.length} data files to server!`);
        setHasSourceData(true);
        setUploadedSourceFilesCount(data.totalFilesCount || files.length);
        setLastSourceUploadedAt(new Date().toISOString());
        loadConfig();
        loadLogs();
      } else {
        toast.error(data.error || "Failed to upload data files to server.");
      }
    } catch {
      toast.error("Network error occurred while uploading data files.");
    } finally {
      setUploadingSource(false);
    }
  };

  // Launch VFP extraction (manual or auto)
  const handleLaunchVfp = useCallback(async (isAuto = false) => {
    try {
      setLaunchingVfp(true);
      const res = await fetch("/api/mabsolcrmsync/launch-vfp", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setLastVfpExtractedAt(new Date().toISOString());
        toast.success(
          isAuto
            ? `⚡ Auto-run executed: VFP extracted DBF data to server`
            : data.message || "VFP console launched successfully to extract DBF data."
        );
        loadLogs();
      } else {
        toast.error(data.error || "Failed to launch VFP console.");
      }
    } catch {
      toast.error("An error occurred while launching VFP console.");
    } finally {
      setLaunchingVfp(false);
    }
  }, []);

  // Live 1-second countdown timer for auto-extraction
  useEffect(() => {
    if (!autoExtract) return;

    const timer = setInterval(() => {
      const remainingMs = nextRunTimeRef.current - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setCountdownSec(remainingSec);

      if (remainingSec <= 0) {
        nextRunTimeRef.current = Date.now() + Math.max(1, autoExtractInterval) * 60 * 1000;
        setCountdownSec(Math.max(1, autoExtractInterval) * 60);
        handleLaunchVfp(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [autoExtract, autoExtractInterval, handleLaunchVfp]);

  // Toggle or Update Auto-Extraction Schedule
  const handleToggleAutoExtract = async (enabled: boolean, newInterval = autoExtractInterval) => {
    setAutoExtract(enabled);
    setAutoExtractInterval(newInterval);
    if (enabled) {
      nextRunTimeRef.current = Date.now() + Math.max(1, newInterval) * 60 * 1000;
      setCountdownSec(Math.max(1, newInterval) * 60);
    }

    try {
      await fetch("/api/mabsolcrmsync/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoVfpExtract: enabled,
          autoVfpExtractInterval: newInterval,
        }),
      });
      if (enabled) {
        toast.success(`⚡ Auto-Extract active (${formatIntervalSummary(newInterval).toLowerCase()})`);
      } else {
        toast.info("⏸️ Auto-Extract paused (Manual launch only)");
      }
    } catch {
      // Ignore background save error
    }
  };

  const handleApplyInterval = (newIntervalMins: number) => {
    setAutoExtractInterval(newIntervalMins);
    setIsEditingInterval(false);
    handleToggleAutoExtract(autoExtract, newIntervalMins);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.userName.trim() || !form.companyName.trim() || !form.license.trim()) {
      toast.error("Operator, Company name, and License Key are required.");
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
          autoVfpExtract: autoExtract,
          autoVfpExtractInterval: autoExtractInterval,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Configuration saved successfully.");
        setSavedForm(form);
        loadLogs();
      } else {
        toast.error(data.error || "Failed to save configuration.");
      }
    } catch {
      toast.error("An error occurred while saving settings.");
    } finally {
      setLoading(false);
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
      second: "2-digit",
    });
  }

  // Filter logs for VFP console extraction logs
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
      <div className="w-full max-w-full p-2 sm:p-3 space-y-3 text-slate-800 box-border bg-slate-50/40 min-h-screen font-sans">
        
        {/* Header Banner */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-teal-200/80 shadow-xs">
          <div className="space-y-0.5">
            <div 
              className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-teal-500 text-teal-700 text-[10px] font-bold uppercase tracking-wider bg-teal-50/40"
              style={{ borderRadius: "9999px" }}
            >
              <Database size={11} className="text-teal-600" />
              <span>Data Migration Engine</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight m-0">
              Migrate Data Settings
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 m-0">
              Automated FoxPro decryption console, cloud data upload, and scheduled extraction targets.
            </p>
          </div>
        </div>

        {/* 2-Column Responsive Dashboard Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">

          {/* CARD 1: Automated VFP Console Extraction */}
          <div className="bg-white border border-teal-200/80 shadow-xs p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between space-y-3 hover:shadow-sm transition-shadow">
            <div className="space-y-2.5">
              
              {/* Card Header with Title & Animated Toggle */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 border border-teal-400 flex items-center justify-center text-teal-600 shrink-0 bg-teal-50/40"
                    style={{ borderRadius: "9999px" }}
                  >
                    <Clock size={16} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                      Auto Extraction Schedule
                    </h2>
                    <span className="text-[10px] text-slate-500">
                      {autoExtract ? "Automatic background runs enabled" : "Automatic background runs paused"}
                    </span>
                  </div>
                </div>

                {/* Animated Custom Switch */}
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold ${autoExtract ? "text-teal-700" : "text-slate-400"}`}>
                    {autoExtract ? "ON" : "OFF"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoExtract}
                    onClick={() => handleToggleAutoExtract(!autoExtract)}
                    style={{
                      borderRadius: "9999px",
                      backgroundColor: autoExtract ? "#0d9488" : "#cbd5e1",
                      boxShadow: autoExtract ? "0 0 10px rgba(13, 148, 136, 0.4)" : "none",
                      transition: "background-color 0.25s ease, box-shadow 0.25s ease",
                      width: "46px",
                      height: "26px",
                      position: "relative",
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px",
                      border: "none",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        borderRadius: "9999px",
                        width: "20px",
                        height: "20px",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.25)",
                        transform: autoExtract ? "translateX(20px)" : "translateX(1px)",
                        transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        display: "inline-block",
                        pointerEvents: "none",
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Status pill */}
              <div 
                className={`flex items-center justify-between p-2 px-3 border text-[11px] transition-all duration-200 ${
                  autoExtract 
                    ? "border-teal-400 bg-teal-50/40 text-teal-800" 
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
                style={{ borderRadius: "9999px" }}
              >
                <span className="font-semibold ml-1">Status</span>
                {autoExtract ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-teal-700 mr-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-80" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600" />
                    </span>
                    <span>Active: {formatIntervalSummary(autoExtractInterval)}</span>
                  </span>
                ) : (
                  <span className="font-medium text-slate-500 mr-1">Paused (Manual Launch Only)</span>
                )}
              </div>

              {/* Conditional Frequency Pills: ONLY SHOW WHEN AUTO-EXTRACT IS ON */}
              {autoExtract ? (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="block text-[11px] font-bold text-slate-700">
                      Select Frequency
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingInterval(!isEditingInterval)}
                      className="text-teal-700 hover:text-teal-900 font-bold text-[11px] outline-none border-none bg-transparent cursor-pointer p-0 m-0"
                    >
                      {isEditingInterval ? "Close Custom" : "Set Custom..."}
                    </button>
                  </div>

                  {/* Borderless Smooth Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: "10m", value: 10 },
                      { label: "30m", value: 30 },
                      { label: "1h", value: 60 },
                      { label: "6h", value: 360 },
                      { label: "12h", value: 720 },
                      { label: "24h", value: 1440 },
                    ].map((preset) => {
                      const isSelected = autoExtractInterval === preset.value && presetInterval !== "custom";
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            setPresetInterval(String(preset.value));
                            handleApplyInterval(preset.value);
                          }}
                          className={`py-1 px-3 text-[11px] font-bold cursor-pointer text-center outline-none ${
                            isSelected ? "btn-chip-active font-extrabold" : "btn-chip-inactive"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Scheduled Run */}
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">Next Scheduled Run:</span>
                    <span className="font-mono font-bold text-teal-800 text-[11px]">
                      In: {formatCountdown(countdownSec)}
                    </span>
                  </div>

                  {/* Custom Interval Expandable */}
                  {isEditingInterval && (
                    <div className="p-2 bg-slate-50/80 rounded-xl border border-teal-200 flex items-center gap-2 mt-1 shadow-2xs">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={customValueStr}
                        onChange={(e) => setCustomValueStr(e.target.value)}
                        style={{ borderRadius: "9999px" }}
                        className="w-14 px-2.5 py-0.5 text-xs font-bold bg-white border border-teal-300 text-slate-900 outline-none focus:border-teal-600"
                      />
                      <select
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value as any)}
                        style={{ borderRadius: "9999px" }}
                        className="px-2.5 py-0.5 text-xs font-bold bg-white border border-teal-300 text-slate-900 outline-none focus:border-teal-600"
                      >
                        <option value="minutes">Mins</option>
                        <option value="hours">Hrs</option>
                        <option value="days">Days</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const num = Math.max(1, Number(customValueStr) || 1);
                          let multiplier = 1;
                          if (customUnit === "hours") multiplier = 60;
                          if (customUnit === "days") multiplier = 1440;
                          const finalMins = num * multiplier;
                          setPresetInterval("custom");
                          handleApplyInterval(finalMins);
                        }}
                        className="btn-pill-primary px-3.5 py-0.5 text-xs font-bold cursor-pointer outline-none"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-[11px] text-slate-500 leading-normal">
                  💡 Turn on the switch above to enable automated VFP runs on a schedule (10m, 30m, 1h, etc.), or use the launch button below for on-demand extraction.
                </div>
              )}
            </div>

            {/* Auto Extraction Actions at Bottom of Card 1 */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              {autoExtract ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleToggleAutoExtract(false)}
                    className="flex-1 btn-pill-cancel inline-flex items-center justify-center gap-2 py-2 px-4 text-xs sm:text-sm font-bold active:scale-[0.98] cursor-pointer transition-all"
                  >
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" />
                    <span>Stop Auto Extraction</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLaunchVfp(false)}
                    disabled={launchingVfp || !savedForm.vfpExePath}
                    className={`inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs sm:text-sm font-bold active:scale-[0.98] transition-all shrink-0 ${
                      launchingVfp 
                        ? "btn-extracting opacity-90 cursor-not-allowed" 
                        : "btn-pill-primary cursor-pointer"
                    }`}
                  >
                    {launchingVfp ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-white" />
                        <span>Extracting...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} className="text-current" />
                        <span>Extract Now</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleToggleAutoExtract(true);
                    handleLaunchVfp(false);
                  }}
                  disabled={launchingVfp || !savedForm.vfpExePath}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 text-xs sm:text-sm font-bold active:scale-[0.98] transition-all ${
                    launchingVfp 
                      ? "btn-extracting opacity-90 cursor-not-allowed" 
                      : "btn-pill-primary cursor-pointer"
                  }`}
                >
                  {launchingVfp ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-white" />
                      <span>Extracting DBF Data...</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} className="text-current fill-current" />
                      <span>Start Auto Extraction</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* CARD 2: Source Data Server Status & Upload */}
          <div className="bg-white border border-teal-200/80 shadow-xs p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between space-y-3 hover:shadow-sm transition-shadow">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 border border-teal-400 flex items-center justify-center text-teal-600 shrink-0 bg-teal-50/40"
                  style={{ borderRadius: "9999px" }}
                >
                  <FolderCheck size={16} />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                    Source Data Server Target
                  </h2>
                  <span className="text-[10px] text-slate-500">
                    Target folder: <code className="font-mono text-teal-800 font-bold text-[10px]">/home/vfpuser/MabsolData</code>
                  </span>
                </div>
              </div>

              {/* Status info box */}
              <div className="p-2.5 rounded-xl border border-teal-200 space-y-1 bg-teal-50/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 text-[11px]">Storage Status</span>
                  {hasSourceData ? (
                    <span 
                      className="inline-flex items-center gap-1 font-bold text-teal-700 text-[10px] border border-teal-400 px-2.5 py-0.5 bg-white shadow-2xs"
                      style={{ borderRadius: "9999px" }}
                    >
                      <CheckCircle2 size={11} className="text-teal-600" />
                      <span>Ready ({uploadedSourceFilesCount} files)</span>
                    </span>
                  ) : (
                    <span 
                      className="inline-flex items-center gap-1 font-bold text-amber-700 text-[10px] border border-amber-400 px-2.5 py-0.5 bg-white shadow-2xs"
                      style={{ borderRadius: "9999px" }}
                    >
                      <AlertCircle size={11} className="text-amber-600" />
                      <span>Waiting for files</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 m-0 leading-tight">
                  {hasSourceData
                    ? "✨ Data stored on server. No need to re-upload unless your Marg files change."
                    : "Upload your raw accounting data folder once to decrypt on server."}
                </p>

                {lastSourceUploadedAt && (
                  <div className="text-[10px] text-teal-800/80 font-mono pt-1 border-t border-teal-100 flex flex-wrap items-center justify-between gap-1">
                    <span>Uploaded: {formatDate(lastSourceUploadedAt)}</span>
                    {lastUploadedByUserName && (
                      <span className="text-teal-900 font-sans font-semibold">
                        by: <strong className="font-bold text-slate-800">{lastUploadedByUserName}</strong>
                        {lastUploadedByUserId ? ` (ID: ${lastUploadedByUserId.slice(-6)})` : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => sourceFolderInputRef.current?.click()}
                disabled={uploadingSource}
                className="btn-pill-primary flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold active:scale-[0.98] cursor-pointer"
              >
                {uploadingSource ? <RefreshCw size={13} className="animate-spin text-current" /> : <FolderUp size={13} className="text-current" />}
                <span>{hasSourceData ? "Update Folder" : "Upload Folder"}</span>
              </button>

              <button
                type="button"
                onClick={() => sourceFilesInputRef.current?.click()}
                disabled={uploadingSource}
                className="btn-pill-secondary inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold active:scale-[0.98] cursor-pointer"
              >
                <FileUp size={13} className="text-current" />
                <span>Upload Files</span>
              </button>
            </div>

            {/* Hidden native inputs */}
            <input
              type="file"
              ref={sourceFolderInputRef}
              // @ts-ignore
              webkitdirectory="true"
              directory=""
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUploadSourceData(e.target.files);
                }
                e.target.value = "";
              }}
            />
            <input
              type="file"
              ref={sourceFilesInputRef}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUploadSourceData(e.target.files);
                }
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* CARD 3: Credentials & Server Path Targets */}
        <div className="bg-white border border-teal-200/80 shadow-xs rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 border border-teal-400 flex items-center justify-center text-teal-600 shrink-0 bg-teal-50/40"
                style={{ borderRadius: "9999px" }}
              >
                <Key size={16} />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                  Integration Credentials & Targets
                </h2>
                <p className="text-[11px] text-slate-500 m-0">
                  Operator authentication, company code, and auto-managed server paths
                </p>
              </div>
            </div>

            <span 
              className="text-[10px] font-bold text-teal-700 border border-teal-300 px-2.5 py-0.5 bg-teal-50/30"
              style={{ borderRadius: "9999px" }}
            >
              ⚡ Server Managed
            </span>
          </div>

          <form onSubmit={handleSave} className="p-3.5 sm:p-4 space-y-3.5">
            
            {/* Operator Credentials */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Operator Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-0.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Operator Display Name <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type="text"
                    style={{ borderRadius: "9999px" }}
                    className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500 transition-all shadow-2xs"
                    placeholder="Enter Operator name"
                    value={form.userName}
                    onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Company Code (e.g. E10) <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type="text"
                    style={{ borderRadius: "9999px" }}
                    className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500 transition-all shadow-2xs"
                    placeholder="e.g. E10"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="block text-xs font-bold text-slate-700">
                    License Key <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type="text"
                    style={{ borderRadius: "9999px" }}
                    className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-teal-500 transition-all shadow-2xs"
                    placeholder="Enter License Key"
                    value={form.license}
                    onChange={(e) => setForm({ ...form, license: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Server Path Targets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pre-Configured Server Target Paths (Read-Only)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-500 text-[11px]">Sync Executable</label>
                    <span className="font-mono text-teal-700 text-[10px]">Binary</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    style={{ borderRadius: "9999px" }}
                    value={form.vfpExePath || "/home/vfpuser/MabsolEXE/MabsolCRM.exe"}
                    className="w-full bg-slate-100/80 border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-600 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-500 text-[11px]">PRG Decrypt Script</label>
                    <span className="font-mono text-teal-700 text-[10px]">Script</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    style={{ borderRadius: "9999px" }}
                    value={form.prgPath || "/home/vfpuser/MabsolPRG/7.PRG"}
                    className="w-full bg-slate-100/80 border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-600 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-500 text-[11px]">Source Folder (Raw Marg Data)</label>
                    <span className="font-mono text-teal-700 text-[10px]">Input</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    style={{ borderRadius: "9999px" }}
                    value={form.sourceDir || "/home/vfpuser/MabsolData"}
                    className="w-full bg-slate-100/80 border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-600 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-500 text-[11px]">Destination Folder (Decrypted DBF)</label>
                    <span className="font-mono text-teal-700 text-[10px]">Output</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    style={{ borderRadius: "9999px" }}
                    value={form.dataDir || "/home/vfpuser/MabsolSyncData"}
                    className="w-full bg-slate-100/80 border border-slate-200 px-3 py-1.5 text-xs font-mono text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-1 flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || !hasChanges}
                className="btn-pill-primary inline-flex items-center justify-center gap-2 py-1.5 px-6 text-xs sm:text-sm font-bold active:scale-[0.98]"
              >
                <Save size={14} className="text-current" />
                <span>{loading ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}</span>
              </button>

              {hasChanges && (
                <span className="text-[11px] font-semibold text-teal-700 animate-pulse">
                  ● Unsaved changes detected
                </span>
              )}
            </div>
          </form>
        </div>

        {/* CARD 4: Audit Trail Log */}
        <div className="bg-white border border-teal-200/80 shadow-xs rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 border border-teal-400 flex items-center justify-center text-teal-600 shrink-0 bg-teal-50/40"
                style={{ borderRadius: "9999px" }}
              >
                <Terminal size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                  Extraction Audit Trail
                </h3>
                <p className="text-[11px] text-slate-500 m-0">
                  Execution log of manual and scheduled VFP decryption events
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadLogs}
              disabled={logsLoading}
              className="btn-pill-secondary inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold cursor-pointer"
            >
              <RefreshCw size={11} className={logsLoading ? "animate-spin text-current" : "text-current"} />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-2.5 pl-4">Timestamp</th>
                  <th className="p-2.5">Action</th>
                  <th className="p-2.5">Operator</th>
                  <th className="p-2.5">License</th>
                  <th className="p-2.5 pr-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logsLoading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={13} className="animate-spin text-teal-600" />
                        <span>Loading audit entries...</span>
                      </div>
                    </td>
                  </tr>
                ) : vfpDataLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 font-medium text-xs">
                      No VFP data extraction events recorded yet.
                    </td>
                  </tr>
                ) : (
                  vfpDataLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2.5 pl-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span 
                          className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 border border-teal-400 text-teal-700 bg-white"
                          style={{ borderRadius: "9999px" }}
                        >
                          VFP Extraction
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap text-xs">
                        {log.userName}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap text-xs">
                        {log.license ? log.license.substring(0, 12) : "N/A"}
                      </td>
                      <td className="p-2.5 pr-4 text-slate-700 max-w-[280px] break-words text-xs">
                        {log.message || "Visual FoxPro console opened to extract DBF data."}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </ProtectedPage>
  );
}
