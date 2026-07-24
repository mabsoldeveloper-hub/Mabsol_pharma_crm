"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { 
  FolderOpen, 
  Database, 
  RefreshCw, 
  Play, 
  AlertTriangle,
  Clock
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
  const [syncScope, setSyncScope] = useState<"all" | "single">(
    enabledFiles.length > 0 ? "single" : "all"
  );
  const [selectedFile, setSelectedFile] = useState<string>(
    enabledFiles.length > 0 ? enabledFiles[0] : ""
  );
  const [autoSync, setAutoSync] = useState(initialAutoSync);
  const [autoSyncInterval, setAutoSyncInterval] = useState(initialAutoSyncInterval);
  const [presetInterval, setPresetInterval] = useState<string>(() => {
    if ([10, 30, 60].includes(initialAutoSyncInterval)) {
      return String(initialAutoSyncInterval);
    }
    return "custom";
  });

  const [message, setMessage] = useState<{ type: "success" | "error" | "info" | ""; text: string }>({
    type: "",
    text: ""
  });

  const [busyAction, setBusyAction] = useState<string | null>(null);
  
  // Modals state
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);

  const isMounted = useRef(false);
  const prevProps = useRef({ currentPath, enabledFiles });

  // Sync state values when props change
  useEffect(() => {
    setDataDir(currentPath);
    setAutoSync(initialAutoSync);
    setAutoSyncInterval(initialAutoSyncInterval);
    setPresetInterval([10, 30, 60].includes(initialAutoSyncInterval) ? String(initialAutoSyncInterval) : "custom");
    
    const enabledFilesChanged = JSON.stringify(prevProps.current.enabledFiles) !== JSON.stringify(enabledFiles);

    if (!isMounted.current || enabledFilesChanged) {
      if (enabledFiles.length > 0) {
        setSyncScope("single");
        setSelectedFile(enabledFiles[0]);
      } else {
        setSyncScope("all");
        setSelectedFile("");
      }
      isMounted.current = true;
    }

    prevProps.current = { currentPath, enabledFiles };
  }, [currentPath, enabledFiles, initialAutoSync, initialAutoSyncInterval]);



  // Unified save config function
  async function saveConfiguration(
    updatedDir: string, 
    updatedScope: "all" | "single", 
    updatedFile: string, 
    updatedAutoSync: boolean,
    updatedInterval: number
  ) {
    setMessage({ type: "info", text: "Saving configuration..." });
    
    const filesToSync = updatedScope === "single" && updatedFile ? [updatedFile] : [];
    
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
        router.refresh();
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
    saveConfiguration(selectedFolderPath, syncScope, selectedFile, autoSync, autoSyncInterval);
  }

  // Handle specific file select
  function handleFileSelect(selectedFilePath: string) {
    const lastSlash = Math.max(selectedFilePath.lastIndexOf("/"), selectedFilePath.lastIndexOf("\\"));
    const fileName = lastSlash !== -1 ? selectedFilePath.substring(lastSlash + 1) : selectedFilePath;
    
    let folderPath = dataDir;
    if (lastSlash !== -1) {
      folderPath = selectedFilePath.substring(0, lastSlash);
      setDataDir(folderPath);
    }
    
    setSelectedFile(fileName);
    saveConfiguration(folderPath, "single", fileName, autoSync, autoSyncInterval);
  }

  // Trigger manual sync now
  async function triggerSyncNow() {
    if (!dataDir) return;
    setBusyAction("sync");
    setMessage({ type: "info", text: "Queuing immediate sync..." });

    try {
      const response = await fetch("/api/mabsolcrmsync/sync-now", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Sync queued successfully." });
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
    <div className="card">
      {/* Card Header */}
      <div className="card-head">
        <div className="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
          Sync control panel
        </div>
        <button className="btn" onClick={handleRefreshStatus} disabled={Boolean(busyAction)} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={busyAction === "refresh" ? "animate-spin" : ""}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          Refresh
        </button>
      </div>

      <div className="card-body">
        <div className="grid-2">
          
          {/* Left Column: Form Settings */}
          <div>
            {/* VFP Folder Path */}
            <div className="field-group">
              <span className="field-label">FoxPro source folder path</span>
              <div className="path-row">
                <div className="path-input">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
                  <span className="truncate max-w-[340px]" title={dataDir}>{dataDir || "No folder selected"}</span>
                </div>
                <button className="btn" onClick={() => setIsFolderPickerOpen(true)} type="button">
                  <FolderOpen className="text-amber-500" />
                  Browse
                </button>
              </div>
            </div>

            {/* Sync Range Scope */}
            <div className="field-group">
              <span className="field-label">Sync range scope</span>
              <div className="segmented">
                <button 
                  type="button" 
                  className={syncScope === "all" ? "active" : ""}
                  onClick={() => {
                    setSyncScope("all");
                    saveConfiguration(dataDir, "all", "", autoSync, autoSyncInterval);
                  }}
                >
                  All tables
                </button>
                <button 
                  type="button" 
                  className={syncScope === "single" ? "active" : ""}
                  onClick={() => {
                    setSyncScope("single");
                    if (selectedFile) {
                      saveConfiguration(dataDir, "single", selectedFile, autoSync, autoSyncInterval);
                    }
                  }}
                >
                  Single table
                </button>
              </div>
            </div>

            {/* Target DBF File */}
            {syncScope === "single" && (
              <div className="field-group animate-in slide-in-from-top-2 duration-150">
                <span className="field-label">Target DBF file to sync</span>
                <div className="path-row">
                  <div className="path-input">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                    <span>{selectedFile || "No table selected"}</span>
                  </div>
                  <button className="btn" onClick={() => setIsFilePickerOpen(true)} type="button">
                    <Database className="text-teal-500" />
                    Select file
                  </button>
                </div>
              </div>
            )}

            {/* Auto-Sync Toggle Row */}
            <div className="toggle-row">
              <div>
                <div className="t-title">Enable auto-sync</div>
                <div className="t-sub">Run background synchronization on a schedule</div>
              </div>
              <div 
                className={`switch ${autoSync ? "on" : ""}`}
                onClick={() => {
                  const newAutoSync = !autoSync;
                  setAutoSync(newAutoSync);
                  saveConfiguration(dataDir, syncScope, selectedFile, newAutoSync, autoSyncInterval);
                }}
              />
            </div>

            {/* Auto Sync Interval timing options */}
            {autoSync && (
              <div className="mt-3 p-3 bg-slate-50/50 border border-slate-200 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-150">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Sync Interval (Frequency)
                  </label>
                  <select
                    value={presetInterval}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPresetInterval(val);
                      if (val !== "custom") {
                        const mins = Number(val);
                        setAutoSyncInterval(mins);
                        saveConfiguration(dataDir, syncScope, selectedFile, autoSync, mins);
                      }
                    }}
                    className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value="10">Every 10 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="60">Every 1 hour</option>
                    <option value="custom">Custom interval</option>
                  </select>
                </div>

                {presetInterval === "custom" && (
                  <div className="space-y-1.5 animate-in fade-in duration-100">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Custom Minutes
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        className="w-24 bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                        value={autoSyncInterval}
                        onChange={(e) => {
                          const mins = Math.max(1, Number(e.target.value) || 1);
                          setAutoSyncInterval(mins);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => saveConfiguration(dataDir, syncScope, selectedFile, autoSync, autoSyncInterval)}
                        className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-all"
                      >
                        Save Interval
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Worker status, Last sync, & Sync CTA */}
          <div className="right-col">
            <div className="field-group" style={{ marginBottom: 0 }}>
              <span className="field-label">Worker status</span>
              <span className={`badge ${workerOnline ? "badge-success" : "badge-error"}`}>
                <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="12"/></svg>
                {workerOnline ? "Active" : "Offline"}
              </span>
            </div>
            
            <div className="meta-line">
              <Clock size={13} />
              Last sync <span className="vfp-mono font-bold text-slate-700" id="last-sync">{formatDate(lastSyncedAt)}</span>
            </div>

            <div className="sync-cta" style={{ marginTop: "8px" }}>
              <button 
                className="btn btn-primary w-full justify-center py-3 text-[13.5px]" 
                id="sync-btn" 
                onClick={triggerSyncNow}
                disabled={!dataDir || Boolean(busyAction)}
                type="button"
              >
                <Play size={14} fill="currentColor" className={busyAction === "sync" ? "animate-spin" : ""} />
                {busyAction === "sync" ? "Syncing..." : "Sync now"}
              </button>
              <div className="cta-note">
                Pushes local DBF changes to the CRM table immediately, outside the regular schedule.
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Dynamic Feedback Message banner */}
      {message.text && (
        <div className={`mx-6 mb-6 p-3.5 rounded-xl border text-xs font-semibold leading-relaxed flex items-start gap-2 animate-in fade-in duration-200 ${
          message.type === "success" 
            ? "bg-green-50 border-green-200 text-green-800" 
            : message.type === "error"
            ? "bg-red-50 border-red-200 text-red-800"
            : "bg-blue-50 border-blue-105 text-blue-800"
        }`}>
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-current" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Modals for Directory and File choosing */}
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
        title="Select Target DBF Table"
        filterType="dbf"
        initialPath={dataDir}
      />
    </div>
  );
}
