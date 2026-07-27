"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { 
  FolderOpen, 
  Database, 
  RefreshCw, 
  Play, 
  Clock,
  Plus,
  X,
  Check,
  Edit2
} from "lucide-react";
import FileSelectorModal from "./FileSelectorModal";

interface VfpSyncActionsProps {
  currentPath?: string;
  enabledFiles?: string[];
  initialAutoSync?: boolean;
  initialAutoSyncInterval?: number;
  workerOnline?: boolean;
  workerStatus?: string;
  lastSyncedAt?: Date | string;
  pendingCommandCount?: number;
}

function formatIntervalSummary(mins: number): string {
  if (!mins || mins <= 0) return "Every 10 minutes";
  if (mins < 60) return `Every ${mins} minute${mins === 1 ? "" : "s"}`;
  if (mins % 1440 === 0) {
    const d = mins / 1440;
    return `Every ${d} day${d === 1 ? "" : "s"}`;
  }
  if (mins % 60 === 0) {
    const h = mins / 60;
    return `Every ${h} hour${h === 1 ? "" : "s"}`;
  }
  return `Every ${mins} minutes`;
}

export default function VfpSyncActions({ 
  currentPath = "", 
  enabledFiles = [], 
  initialAutoSync = false,
  initialAutoSyncInterval = 10,
  workerOnline = false,
  workerStatus = "offline",
  lastSyncedAt,
  pendingCommandCount = 0
}: VfpSyncActionsProps) {
  const router = useRouter();

  const [dataDir, setDataDir] = useState(currentPath);
  const [syncScope, setSyncScope] = useState<"all" | "selected">(
    enabledFiles.length > 0 ? "selected" : "all"
  );
  const [selectedFiles, setSelectedFiles] = useState<string[]>(enabledFiles);
  const [autoSync, setAutoSync] = useState(initialAutoSync);
  const [autoSyncInterval, setAutoSyncInterval] = useState(initialAutoSyncInterval);
  const [isEditingInterval, setIsEditingInterval] = useState(false);
  
  // Custom unit state & preset calculation
  const [customValueStr, setCustomValueStr] = useState<string>(() => {
    if (initialAutoSyncInterval >= 1440 && initialAutoSyncInterval % 1440 === 0) {
      return String(initialAutoSyncInterval / 1440);
    }
    if (initialAutoSyncInterval >= 60 && initialAutoSyncInterval % 60 === 0) {
      return String(initialAutoSyncInterval / 60);
    }
    return String(Math.min(1440, Math.max(1, initialAutoSyncInterval)));
  });

  const [customUnit, setCustomUnit] = useState<"minutes" | "hours" | "days">( animateUnit(initialAutoSyncInterval) );

  function animateUnit(mins: number): "minutes" | "hours" | "days" {
    if (mins >= 1440 && mins % 1440 === 0) return "days";
    if (mins >= 60 && mins % 60 === 0) return "hours";
    return "minutes";
  }

  const [presetInterval, setPresetInterval] = useState<string>(() => {
    if ([10, 30, 60, 360, 720, 1440, 10080].includes(initialAutoSyncInterval)) {
      return String(initialAutoSyncInterval);
    }
    return "custom";
  });

  const [message, setMessage] = useState<{ type: "success" | "error" | "info" | ""; text: string }>({
    type: "",
    text: ""
  });

  const [busyAction, setBusyAction] = useState<string | null>(null);
  
  // Scanned folder DBF files
  const [folderDbfFiles, setFolderDbfFiles] = useState<string[]>([]);
  const [scanningFolder, setScanningFolder] = useState(false);

  // Modals state
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);

  const isMounted = useRef(false);
  const prevProps = useRef({ currentPath, enabledFiles });
  const lastUserEditTimeRef = useRef<number>(0);

  // Auto-scan DBF files in current folder
  useEffect(() => {
    if (!dataDir) {
      setFolderDbfFiles([]);
      return;
    }
    let isCancelled = false;
    async function scanDbf() {
      setScanningFolder(true);
      try {
        const res = await fetch(`/api/mabsolcrmsync/browse?dir=${encodeURIComponent(dataDir)}&type=dbf`);
        const data = await res.json();
        if (!isCancelled && data.success && Array.isArray(data.files)) {
          setFolderDbfFiles(data.files);
        }
      } catch {
        // Ignore scan error
      } finally {
        if (!isCancelled) setScanningFolder(false);
      }
    }
    scanDbf();
    return () => { isCancelled = true; };
  }, [dataDir]);

  // Sync state values when props change
  useEffect(() => {
    setDataDir(currentPath);
    setAutoSync(initialAutoSync);
    setAutoSyncInterval(initialAutoSyncInterval);
    setPresetInterval([10, 30, 60].includes(initialAutoSyncInterval) ? String(initialAutoSyncInterval) : "custom");
    
    const enabledFilesChanged = JSON.stringify(prevProps.current.enabledFiles) !== JSON.stringify(enabledFiles);
    const userRecentlyEdited = Date.now() - lastUserEditTimeRef.current < 4000;

    if (!isMounted.current || (enabledFilesChanged && !userRecentlyEdited)) {
      setSelectedFiles(enabledFiles);
      if (enabledFiles.length > 0) {
        setSyncScope("selected");
      } else {
        setSyncScope("all");
      }
      isMounted.current = true;
    }

    prevProps.current = { currentPath, enabledFiles };
  }, [currentPath, enabledFiles, initialAutoSync, initialAutoSyncInterval]);

  // Unified save config function
  async function saveConfiguration(
    updatedDir: string, 
    updatedScope: "all" | "selected", 
    updatedFiles: string[], 
    updatedAutoSync: boolean,
    updatedInterval: number,
    skipRefresh: boolean = false
  ) {
    lastUserEditTimeRef.current = Date.now();
    setMessage({ type: "info", text: "Saving configuration..." });
    
    const filesToSync = updatedScope === "selected" ? updatedFiles : [];
    
    try {
      const response = await fetch("/api/mabsolcrmsync/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataDir: updatedDir,
          enabledFiles: filesToSync,
          autoSync: updatedAutoSync,
          autoSyncInterval: updatedInterval,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Settings saved successfully." });
        if (!skipRefresh) {
          router.refresh();
        }
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save configuration." });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred while saving configuration." });
    }
  }

  // Handle folder path select
  function handleFolderSelect(selectedFolderPath: string) {
    setDataDir(selectedFolderPath);
    saveConfiguration(selectedFolderPath, syncScope, selectedFiles, autoSync, autoSyncInterval);
  }

  // Handle multiple DBF files selection
  function handleMultipleFilesSelect(selectedPaths: string[]) {
    if (!selectedPaths || selectedPaths.length === 0) return;
    
    let folderPath = dataDir;
    const newFileNames: string[] = [];

    selectedPaths.forEach((path) => {
      const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
      const fileName = lastSlash !== -1 ? path.substring(lastSlash + 1) : path;
      if (lastSlash !== -1) {
        folderPath = path.substring(0, lastSlash);
      }
      if (!newFileNames.includes(fileName)) {
        newFileNames.push(fileName);
      }
    });

    setDataDir(folderPath);

    // Merge new file names with existing selected files
    const updated = Array.from(new Set([...selectedFiles, ...newFileNames]));
    setSelectedFiles(updated);
    setSyncScope("selected");
    saveConfiguration(folderPath, "selected", updated, autoSync, autoSyncInterval, true);
  }

  // Handle specific DBF file select (adds file to array if not present)
  function handleFileSelect(selectedFilePath: string) {
    const lastSlash = Math.max(selectedFilePath.lastIndexOf("/"), selectedFilePath.lastIndexOf("\\"));
    const fileName = lastSlash !== -1 ? selectedFilePath.substring(lastSlash + 1) : selectedFilePath;
    
    let folderPath = dataDir;
    if (lastSlash !== -1) {
      folderPath = selectedFilePath.substring(0, lastSlash);
      setDataDir(folderPath);
    }
    
    let updatedFiles = selectedFiles;
    if (!selectedFiles.includes(fileName)) {
      updatedFiles = [...selectedFiles, fileName];
    }
    
    setSelectedFiles(updatedFiles);
    setSyncScope("selected");
    saveConfiguration(folderPath, "selected", updatedFiles, autoSync, autoSyncInterval, true);
  }

  // Remove a specific file from selection
  function handleRemoveFile(fileToRemove: string) {
    const updated = selectedFiles.filter(f => f !== fileToRemove);
    setSelectedFiles(updated);
    const newScope = updated.length > 0 ? "selected" : "selected";
    saveConfiguration(dataDir, newScope, updated, autoSync, autoSyncInterval, true);
  }

  // Clear all selected DBF files
  function handleClearAllFiles() {
    setSelectedFiles([]);
    saveConfiguration(dataDir, "selected", [], autoSync, autoSyncInterval, true);
  }

  // Client-side Auto Sync Scheduler Effect
  useEffect(() => {
    if (!autoSync || !dataDir) return;

    const intervalMins = Math.max(1, autoSyncInterval);
    const intervalMs = intervalMins * 60 * 1000;

    const timer = setInterval(() => {
      triggerSyncNow(true);
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [autoSync, autoSyncInterval, dataDir, syncScope, selectedFiles]);

  // Trigger manual or auto sync now
  async function triggerSyncNow(isAuto: boolean = false) {
    if (!dataDir) return;
    setBusyAction("sync");
    setMessage({ 
      type: "info", 
      text: isAuto ? "Running scheduled background auto-sync..." : "Queuing immediate data sync..." 
    });

    try {
      const response = await fetch("/api/mabsolcrmsync/sync-now", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ 
          type: "success", 
          text: isAuto 
            ? `Auto-sync completed! Synced ${data.result?.importedTables || 0} table(s), ${data.result?.importedRows || 0} row(s).` 
            : `Sync completed! Synced ${data.result?.importedTables || 0} table(s), ${data.result?.importedRows || 0} row(s).`
        });
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to trigger sync." });
      }
    } catch {
      setMessage({ type: "error", text: "Error occurred while queueing sync." });
    } finally {
      setBusyAction(null);
    }
  }

  // Trigger cancel sync
  async function triggerCancelSync() {
    setBusyAction("cancel");
    setMessage({ type: "info", text: "Cancelling sync and disabling Auto-sync..." });

    if (autoSync) {
      setAutoSync(false);
      saveConfiguration(dataDir, syncScope, selectedFiles, false, autoSyncInterval, true);
    }

    try {
      const response = await fetch("/api/mabsolcrmsync/cancel", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message || "Sync cancelled and Auto-sync disabled." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to cancel sync." });
      }
    } catch {
      setMessage({ type: "error", text: "Error occurred while cancelling sync." });
    } finally {
      setBusyAction(null);
    }
  }

  // Manual page refresh
  function handleRefreshStatus() {
    setBusyAction("refresh");
    setMessage({ type: "info", text: "Refreshing sync page status..." });
    setTimeout(() => {
      router.refresh();
      setMessage({ type: "success", text: "Sync status updated." });
      setBusyAction(null);
    }, 600);
  }

  function formatDate(value?: Date | string) {
    if (!value) {
      return "Never";
    }
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  return (
    <div 
      className="bg-white border border-slate-200/90 shadow-xs overflow-hidden w-full max-w-full box-border"
      style={{ borderRadius: "24px" }}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between  sm:p-5 border-b border-slate-100 flex-wrap gap-3 w-full box-border bg-white">
        <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900 tracking-tight">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-700"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
          <span>Sync control panel</span>
        </div>
        <button 
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-2xs disabled:opacity-50 btn-pill" 
          style={{ borderRadius: "9999px" }}
          onClick={handleRefreshStatus} 
          disabled={Boolean(busyAction)} 
          type="button"
        >
          <RefreshCw size={13} className={`text-slate-500 ${busyAction === "refresh" ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="p-3.5 sm:p-6 w-full max-w-full overflow-hidden box-border">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 sm:gap-6 items-start w-full box-border">
          
          {/* Left Column: Scope & Path Settings */}
          <div className="space-y-5 min-w-0">
            
            {/* TOP ITEM: SYNC RANGE SCOPE */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                SYNC RANGE SCOPE
              </span>
              <div 
                className="flex items-center bg-slate-100/90 p-1 border-0 w-full box-border shadow-2xs overflow-hidden"
                style={{ borderRadius: "9999px" }}
              >
                <button 
                  type="button" 
                  disabled={autoSync}
                  className={`flex-1 min-w-0 py-2 px-2 sm:px-4 text-[11px] sm:text-xs font-bold transition-all duration-200 ease-in-out text-center truncate btn-pill ${
                    autoSync ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  } ${
                    syncScope === "all" ? "bg-black text-white shadow-xs" : "text-slate-600 hover:text-slate-900 bg-transparent"
                  }`}
                  style={{ borderRadius: "9999px" }}
                  onClick={() => {
                    if (autoSync) {
                      setMessage({ type: "info", text: "Please turn off Auto-sync below to change sync scope." });
                      return;
                    }
                    setSyncScope("all");
                    saveConfiguration(dataDir, "all", selectedFiles, autoSync, autoSyncInterval);
                  }}
                  title={autoSync ? "Turn off Auto-sync to change sync scope" : "Switch to All tables"}
                >
                  All tables
                </button>
                <button 
                  type="button" 
                  disabled={autoSync}
                  className={`flex-1 min-w-0 py-2 px-2 sm:px-4 text-[11px] sm:text-xs font-bold transition-all duration-200 ease-in-out text-center truncate btn-pill ${
                    autoSync ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  } ${
                    syncScope === "selected" ? "bg-black text-white shadow-xs" : "text-slate-600 hover:text-slate-900 bg-transparent"
                  }`}
                  style={{ borderRadius: "9999px" }}
                  onClick={() => {
                    if (autoSync) {
                      setMessage({ type: "info", text: "Please turn off Auto-sync below to change sync scope." });
                      return;
                    }
                    setSyncScope("selected");
                    saveConfiguration(dataDir, "selected", selectedFiles, autoSync, autoSyncInterval);
                  }}
                  title={autoSync ? "Turn off Auto-sync to change sync scope" : "Switch to Selected tables"}
                >
                  Selected tables {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}
                </button>
              </div>

              {/* SHOW DBF TABLES CONTAINER ONLY WHEN 'Selected tables' IS ACTIVE */}
              {syncScope === "selected" && (() => {
                const allClipsList = Array.from(new Set([...folderDbfFiles, ...selectedFiles]));
                return (
                  <div className="mt-3 p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3 shadow-2xs animate-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Database size={13} className="text-teal-600" />
                        <span>SELECT DBF TABLES TO SYNC</span>
                        {selectedFiles.length > 0 && (
                          <span className="text-teal-600 font-bold font-mono">({selectedFiles.length} active)</span>
                        )}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          disabled={autoSync}
                          onClick={() => {
                            if (autoSync) {
                              setMessage({ type: "info", text: "Please turn off Auto-sync below to add DBF tables." });
                              return;
                            }
                            setIsFilePickerOpen(true);
                          }}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 bg-white border border-slate-200 text-slate-800 transition-all shadow-2xs btn-pill ${
                            autoSync ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100 cursor-pointer"
                          }`}
                          style={{ borderRadius: "9999px" }}
                          title={autoSync ? "Turn off Auto-sync to add DBF tables" : "Add DBF table(s)"}
                        >
                          <Plus size={12} className="text-slate-600" />
                          <span>Add DBF table(s)</span>
                        </button>

                        {selectedFiles.length > 0 && (
                          <button 
                            type="button"
                            disabled={autoSync}
                            onClick={() => {
                              if (autoSync) {
                                setMessage({ type: "info", text: "Please turn off Auto-sync below to clear tables." });
                                return;
                              }
                              handleClearAllFiles();
                            }}
                            className={`text-[11px] font-bold px-2 py-0.5 ${
                              autoSync ? "text-slate-400 cursor-not-allowed" : "text-red-500 hover:text-red-700 cursor-pointer"
                            }`}
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Auto-sync Locked Warning Banner */}
                    {autoSync && (
                      <div className="text-[11px] font-bold text-amber-800 bg-amber-50/90 border border-amber-200/80 px-3 py-1.5 rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>🔒 Table selection is locked while Auto-sync is enabled. Turn off Auto-sync below to select or deselect tables.</span>
                      </div>
                    )}

                    {/* DBF Clips in place toggle active/deselect with tick mark */}
                    {allClipsList.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {allClipsList.map((file) => {
                          const isSelected = selectedFiles.includes(file);
                          return (
                            <button
                              key={file}
                              type="button"
                              disabled={autoSync}
                              onClick={() => {
                                if (autoSync) {
                                  setMessage({ type: "info", text: "Please turn off Auto-sync below to select or deselect tables." });
                                  return;
                                }
                                lastUserEditTimeRef.current = Date.now();
                                let updated: string[];
                                if (isSelected) {
                                  updated = selectedFiles.filter((f) => f !== file);
                                } else {
                                  updated = [...selectedFiles, file];
                                }
                                setSelectedFiles(updated);
                                saveConfiguration(dataDir, "selected", updated, autoSync, autoSyncInterval, true);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-full border transition-all shadow-2xs btn-pill ${
                                autoSync ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                              } ${
                                isSelected
                                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                              style={{ borderRadius: "9999px" }}
                              title={autoSync ? "Turn off Auto-sync to modify table selection" : `Click to toggle ${file}`}
                            >
                              {isSelected ? (
                                <Check size={13} className="text-emerald-400 shrink-0 stroke-[3]" />
                              ) : (
                                <span className="text-teal-600 font-bold text-xs shrink-0">+</span>
                              )}
                              <span>{file}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 font-mono italic">
                        No DBF tables detected. Click "Add DBF table(s)" to select files.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* SHOW SELECT SOURCE FOLDER ONLY WHEN 'All tables' IS ACTIVE */}
            {syncScope === "all" && (
              <div className="animate-in slide-in-from-top-2 duration-150">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  SELECT SOURCE FOLDER
                </span>
                <div className="space-y-2">
                  <div 
                    className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50/60 border border-slate-200/80 text-xs font-mono text-slate-700 w-full overflow-hidden box-border shadow-2xs"
                    style={{ borderRadius: "12px" }}
                  >
                    <FolderOpen size={15} className="text-slate-400 shrink-0" />
                    <span className="truncate block w-full min-w-0 font-mono text-xs text-slate-800" title={dataDir}>
                      {dataDir || "No folder selected"}
                    </span>
                  </div>

                  {dataDir && (
                    <div className="px-1 text-[11px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                      {scanningFolder ? (
                        <span className="text-slate-400 italic">Scanning folder for .DBF files...</span>
                      ) : folderDbfFiles.length > 0 ? (
                        <>
                          <span className="font-bold text-slate-700">✓ Detected {folderDbfFiles.length} DBF table(s):</span>
                          <span className="text-slate-500 font-mono truncate max-w-full">
                            {folderDbfFiles.slice(0, 4).join(", ")}{folderDbfFiles.length > 4 ? ` +${folderDbfFiles.length - 4} more` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-600 font-sans">⚠️ No .DBF files found in this directory.</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 w-full">
                    <button 
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-bold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 active:scale-[0.99] transition-all cursor-pointer shadow-2xs btn-pill" 
                      style={{ borderRadius: "9999px" }}
                      onClick={() => setIsFolderPickerOpen(true)} 
                      type="button"
                    >
                      <FolderOpen size={13} className="text-slate-500" />
                      <span>Browse</span>
                    </button>
                    
                    <button 
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-bold border border-slate-200 bg-white text-red-600 hover:bg-red-50/50 hover:border-red-200 active:scale-[0.99] transition-all cursor-pointer shadow-2xs btn-pill" 
                      style={{ borderRadius: "9999px" }}
                      onClick={() => {
                        setDataDir("");
                        saveConfiguration("", syncScope, selectedFiles, autoSync, autoSyncInterval);
                      }} 
                      type="button"
                      title="Remove selected path"
                    >
                      <span className="text-red-500 font-bold text-xs leading-none">✕</span>
                      <span>Clear</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(() => {
              const isNoFilesSelected = syncScope === "selected" && selectedFiles.length === 0;
              return (
                <div 
                  className="flex items-center justify-between gap-4 p-3.5 bg-slate-50/50 border border-slate-200/80 w-full box-border"
                  style={{ borderRadius: "16px" }}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">Enable auto-sync</div>
                    <div className="text-[11px] text-slate-400 leading-tight mt-0.5">Run background synchronization on a schedule</div>
                    {isNoFilesSelected && (
                      <span className="text-[11px] font-bold text-amber-600 block mt-1">
                        ⚠️ Select at least 1 DBF table to enable auto-sync
                      </span>
                    )}
                  </div>
                  <div 
                    className={`w-10 h-5.5 rounded-full relative transition-colors shrink-0 p-0.5 ${
                      isNoFilesSelected
                        ? "bg-slate-200 cursor-not-allowed opacity-50"
                        : autoSync 
                        ? "bg-slate-900 cursor-pointer" 
                        : "bg-slate-200 cursor-pointer"
                    }`}
                    style={{ borderRadius: "9999px" }}
                    title={isNoFilesSelected ? "Select at least 1 DBF table to enable auto-sync" : "Toggle auto-sync"}
                    onClick={() => {
                      if (isNoFilesSelected) {
                        setMessage({ type: "error", text: "Please select at least 1 DBF table before enabling Auto-sync." });
                        return;
                      }
                      const newAutoSync = !autoSync;
                      setAutoSync(newAutoSync);
                      if (newAutoSync) {
                        triggerSyncNow(true);
                      } else if (busyAction === "sync") {
                        triggerCancelSync();
                      }
                      saveConfiguration(dataDir, syncScope, selectedFiles, newAutoSync, autoSyncInterval);
                    }}
                  >
                    <div 
                      className={`w-4.5 h-4.5 rounded-full bg-white transition-all shadow-xs ${
                        autoSync && !isNoFilesSelected ? "translate-x-4.5" : "translate-x-0"
                      }`} 
                      style={{ borderRadius: "9999px" }}
                    />
                  </div>
                </div>
              );
            })()}

            {autoSync && (
              !isEditingInterval ? (
                /* Collapsed Summary view showing schedule + Edit button */
                <div 
                  className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 w-full box-border animate-in fade-in duration-150"
                  style={{ borderRadius: "16px" }}
                >
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-700 min-w-0">
                    <Clock size={14} className="text-teal-600 shrink-0" />
                    <span className="truncate font-semibold">
                      Schedule: <strong className="text-slate-900 font-bold">{formatIntervalSummary(autoSyncInterval)}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingInterval(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 transition-all shadow-2xs btn-pill shrink-0 cursor-pointer"
                    style={{ borderRadius: "9999px" }}
                  >
                    <Edit2 size={12} className="text-slate-500" />
                    <span>Edit schedule</span>
                  </button>
                </div>
              ) : (
                /* Expanded Edit Container */
                <div 
                  className="p-3.5 bg-slate-50 border border-slate-200/90 space-y-3 animate-in slide-in-from-top-2 duration-150"
                  style={{ borderRadius: "16px" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Sync Interval (Frequency)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingInterval(false)}
                      className="text-xs text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <select
                    value={presetInterval}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPresetInterval(val);
                      if (val !== "custom") {
                        const mins = Number(val);
                        setAutoSyncInterval(mins);
                        saveConfiguration(dataDir, syncScope, selectedFiles, autoSync, mins);
                        setIsEditingInterval(false);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none shadow-2xs cursor-pointer"
                    style={{ borderRadius: "10px" }}
                  >
                    <option value="10">Every 10 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="60">Every 1 hour</option>
                    <option value="360">Every 6 hours</option>
                    <option value="720">Every 12 hours</option>
                    <option value="1440">Every 1 day (24 hours)</option>
                    <option value="10080">Every 7 days (1 week)</option>
                    <option value="custom">Custom interval (specify unit)...</option>
                  </select>

                  {presetInterval === "custom" && (
                    <div className="space-y-2.5 pt-1 animate-in fade-in duration-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Custom Frequency & Unit
                      </span>
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        {/* Number input allows empty text while typing */}
                        <input
                          type="number"
                          min={1}
                          max={customUnit === "minutes" ? 1440 : customUnit === "hours" ? 168 : 30}
                          placeholder="e.g. 20"
                          className="w-20 bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-400 shadow-2xs"
                          style={{ borderRadius: "8px" }}
                          value={customValueStr}
                          onChange={(e) => {
                            setCustomValueStr(e.target.value);
                          }}
                        />

                        {/* Unit Selector Dropdown */}
                        <select
                          value={customUnit}
                          onChange={(e) => {
                            const unit = e.target.value as "minutes" | "hours" | "days";
                            setCustomUnit(unit);
                          }}
                          className="bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none shadow-2xs cursor-pointer"
                          style={{ borderRadius: "8px" }}
                        >
                          <option value="minutes">Minute(s)</option>
                          <option value="hours">Hour(s)</option>
                          <option value="days">Day(s)</option>
                        </select>

                        {/* Save Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const rawNum = Number(customValueStr);
                            const maxLimit = customUnit === "minutes" ? 1440 : customUnit === "hours" ? 168 : 30;
                            const clampedVal = Math.max(1, Math.min(maxLimit, rawNum || 1));
                            setCustomValueStr(String(clampedVal));

                            const multiplier = customUnit === "days" ? 1440 : customUnit === "hours" ? 60 : 1;
                            const totalMins = clampedVal * multiplier;
                            
                            setAutoSyncInterval(totalMins);
                            saveConfiguration(dataDir, syncScope, selectedFiles, autoSync, totalMins);
                            setIsEditingInterval(false);
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-black hover:bg-slate-900 transition-all btn-pill shadow-xs cursor-pointer shrink-0"
                          style={{ borderRadius: "9999px" }}
                        >
                          Save Interval
                        </button>
                      </div>

                      {/* Calculation helper note */}
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 pt-0.5">
                        <Clock size={12} className="text-teal-600 shrink-0" />
                        <span>
                          Frequency: <strong className="text-slate-800">
                            {Number(customValueStr) || 1} {customUnit}
                          </strong> ({(Number(customValueStr) || 1) * (customUnit === "days" ? 1440 : customUnit === "hours" ? 60 : 1)} total mins)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          <div className="space-y-4 min-w-0">
            <div 
              className="border border-slate-200/80 p-4 sm:p-5 bg-white space-y-4 shadow-2xs"
              style={{ borderRadius: "20px" }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">WORKER STATUS</span>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                    <Clock size={12} className="text-slate-400" />
                    <span>Last sync:</span>
                    <span className="font-bold text-slate-800">{formatDate(lastSyncedAt)}</span>
                  </div>
                  <span 
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 border btn-pill ${
                      workerOnline 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                    style={{ borderRadius: "9999px" }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${workerOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                    {workerOnline ? "Active" : "Offline"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-1 w-full">
                <button 
                  className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-bold transition-all btn-pill ${
                    autoSync 
                      ? "bg-slate-900 text-white opacity-90 cursor-not-allowed" 
                      : "bg-black hover:bg-slate-900 text-white shadow-xs cursor-pointer active:scale-[0.99]"
                  } disabled:cursor-not-allowed`} 
                  style={{ borderRadius: "9999px" }}
                  id="sync-btn" 
                  onClick={() => triggerSyncNow(false)}
                  disabled={!dataDir || Boolean(busyAction) || autoSync}
                  type="button"
                  title={autoSync ? "Auto-sync is running on a schedule. Click 'Cancel sync' below to stop." : "Click to trigger immediate manual sync"}
                >
                  {busyAction === "sync" ? (
                    <RefreshCw size={14} className="animate-spin text-white" />
                  ) : autoSync ? (
                    <span className="flex items-center gap-1.5 shrink-0">
                      <RefreshCw size={13} className="animate-spin text-emerald-400" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    </span>
                  ) : (
                    <Play size={13} fill="currentColor" className="text-white" />
                  )}
                  <span>
                    {busyAction === "sync" 
                      ? "Syncing data..." 
                      : autoSync 
                      ? "Auto-sync active" 
                      : "Sync now"}
                  </span>
                </button>

                <button 
                  className={`w-full inline-flex items-center justify-center gap-2 py-2 px-4 text-xs sm:text-sm font-bold border transition-all btn-pill ${
                    busyAction === "sync" || autoSync
                      ? "border-red-500 bg-red-50 text-red-700 hover:bg-red-100 shadow-2xs cursor-pointer"
                      : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
                  }`} 
                  style={{ borderRadius: "9999px", marginTop: "12px" }}
                  onClick={triggerCancelSync}
                  disabled={!autoSync && busyAction !== "sync"}
                  type="button"
                  title={
                    autoSync 
                      ? "Click to cancel and disable Auto-sync" 
                      : busyAction === "sync" 
                      ? "Click to cancel active sync" 
                      : "Cancel sync is available when Auto-sync or manual sync is active"
                  }
                >
                  <X size={14} className={busyAction === "cancel" ? "animate-spin text-red-600" : busyAction === "sync" || autoSync ? "text-red-600" : "text-slate-400"} />
                  <span>{busyAction === "cancel" ? "Cancelling..." : "Cancel sync"}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed text-center max-w-xs mx-auto m-0 pt-0.5">
                Pushes local DBF changes to the CRM table immediately and manages worker background tasks.
              </p>
            </div>
          </div>

        </div>
      </div>

      {message.text && (
        <div 
          className={`mx-4 mb-4 sm:mx-6 sm:mb-6 p-3.5 border text-xs font-semibold leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200 ${
            message.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : message.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-slate-50 border-slate-200 text-slate-800"
          }`}
          style={{ borderRadius: "16px" }}
        >
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-current" />
          <span>{message.text}</span>
        </div>
      )}

      <FileSelectorModal
        isOpen={isFolderPickerOpen}
        onClose={() => setIsFolderPickerOpen(false)}
        onSelect={handleFolderSelect}
        title="Select VFP Database Folder"
        filterType="dir"
        initialPath={dataDir}
      />

      <FileSelectorModal
        isOpen={isFilePickerOpen}
        onClose={() => setIsFilePickerOpen(false)}
        onSelect={handleFileSelect}
        onSelectMultiple={handleMultipleFilesSelect}
        title="Select Target DBF Table(s)"
        filterType="dbf"
        initialPath={dataDir}
      />
    </div>
  );
}
