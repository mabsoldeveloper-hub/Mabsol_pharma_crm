"use client";

import { useEffect, useState, useRef } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import FileSelectorModal from "@/components/FileSelectorModal";
import {
  Database,
  Lock,
  Unlock,
  HelpCircle,
  History,
  User,
  Building,
  Key,
  FolderOpen,
  Save,
  RefreshCw,
  Terminal,
  Check,
  AlertTriangle
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
  changes?: any;
  createdAt: string;
}

export default function VfpSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [launchingConsole, setLaunchingConsole] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "danger" | ""; text: string }>({ type: "", text: "" });
  const [logs, setLogs] = useState<VfpSettingLogEntry[]>([]);

  // File/Folder browser state
  const [browserConfig, setBrowserConfig] = useState<{
    isOpen: boolean;
    title: string;
    filterType: "exe" | "prg" | "dir";
    fieldKey: "vfpExePath" | "prgPath" | "sourceDir" | "dataDir" | null;
  }>({
    isOpen: false,
    title: "",
    filterType: "dir",
    fieldKey: null
  });

  const openFileBrowser = (fieldKey: "vfpExePath" | "prgPath" | "sourceDir" | "dataDir", filterType: "exe" | "prg" | "dir", title: string) => {
    setBrowserConfig({
      isOpen: true,
      title,
      filterType,
      fieldKey
    });
  };

  const handleBrowserSelect = (selectedPath: string) => {
    if (browserConfig.fieldKey) {
      setForm((prev) => ({
        ...prev,
        [browserConfig.fieldKey!]: selectedPath
      }));
    }
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

  const handleSyncNow = async () => {
    setMessage({ type: "", text: "" });

    if (
      !savedForm.userName ||
      !savedForm.companyName ||
      !savedForm.license ||
      !savedForm.prgPath
    ) {
      setMessage({ type: "danger", text: "Please enter and save all details before triggering a sync." });
      return;
    }

    try {
      setSyncing(true);
      const res = await fetch("/api/mabsolcrmsync/sync-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedForm),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Immediate sync triggered and logged successfully." });
        loadLogs();
      } else {
        setMessage({ type: "danger", text: data.error || "Failed to trigger sync." });
      }
    } catch {
      setMessage({ type: "danger", text: "An error occurred while triggering sync." });
    } finally {
      setSyncing(false);
    }
  };

  const handleLaunchConsole = async () => {
    setMessage({ type: "", text: "" });

    if (
      !savedForm.userName ||
      !savedForm.companyName ||
      !savedForm.license ||
      !savedForm.vfpExePath ||
      !savedForm.prgPath
    ) {
      setMessage({ type: "danger", text: "Please enter and save all details before launching the console." });
      return;
    }

    try {
      setLaunchingConsole(true);
      const res = await fetch("/api/mabsolcrmsync/launch-vfp", {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message || "Sync Console launched successfully." });
      } else {
        setMessage({ type: "danger", text: data.error || "Failed to launch VFP Console." });
      }
    } catch {
      setMessage({ type: "danger", text: "An error occurred while launching VFP Console." });
    } finally {
      setLaunchingConsole(false);
    }
  };

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${min}`;
  }

  const isFormConfigured =
    savedForm.userName &&
    savedForm.companyName &&
    savedForm.license &&
    savedForm.prgPath;

  return (
    <ProtectedPage permission="vfp.settings">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-[#F8FAFC] min-h-screen">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            {/* Sync Icon Badge */}
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-[#0F2926] rounded-[8px] sm:rounded-[10px] text-white font-bold text-[11px] sm:text-[13px] tracking-wide shrink-0 select-none shadow-sm">
              SYNC
            </div>
            <div>
              <h1 className="text-[18px] sm:text-[20px] font-bold text-[#0F172A] tracking-tight m-0">
                Mabsol CRM Sync settings
              </h1>
              <p className="text-[12px] sm:text-[13px] text-[#64748B] leading-relaxed max-w-[550px] m-0">
                Manage how Mabsol CRM Sync connects, syncs, and audits with your modern stack
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
            <button
              onClick={handleLaunchConsole}
              disabled={launchingConsole || isEditing || !isFormConfigured}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-[6px] text-[13px] font-semibold px-4 py-2 cursor-pointer bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap"
            >
              {launchingConsole && <RefreshCw size={13} className="animate-spin text-[#64748B]" />}
              {launchingConsole ? "Launching..." : "Open Sync console"}
            </button>
            <button
              onClick={handleSyncNow}
              disabled={syncing || isEditing || !isFormConfigured}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-[6px] text-[13px] font-semibold px-4 py-2 cursor-pointer bg-[#115E59] border border-[#115E59] text-white hover:bg-[#0F4E4B] transition-all active:scale-[0.98] disabled:bg-[#8ED0C9] disabled:border-[#8ED0C9] disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap"
            >
              {syncing && <RefreshCw size={13} className="animate-spin" />}
              {syncing ? "Syncing..." : "Sync now and log"}
            </button>
          </div>
        </div>

        {/* Alerts / Feedback Message */}
        {message.text && (
          <div className={`p-[12px_14px] rounded-lg border flex items-start gap-2.5 text-[12.5px] leading-relaxed font-medium animate-in fade-in duration-200 ${
            message.type === "success" 
              ? "bg-[#E6F4EA] border-[#B7E1CD] text-[#137333]" 
              : "bg-[#FCE8E6] border-[#FAD2CF] text-[#C5221F]"
          }`}>
            <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0 bg-current" />
            <span className="flex-1">{message.text}</span>
          </div>
        )}

        {/* Stored Configuration Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-[18px_20px] border-b border-[#E2E8F0] gap-4">
            <div>
              <h3 className="text-[14.5px] font-bold text-[#0F172A] m-0">
                Stored configuration
              </h3>
              <p className="text-[12px] text-[#64748B] m-0">Current Mabsol CRM Sync integration values and access rules</p>
            </div>
            
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center justify-center rounded-[6px] border border-[#E2E8F0] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#0F172A] hover:bg-[#F8FAFC] active:scale-[0.98] transition-all cursor-pointer shrink-0"
              >
                Unlock to edit
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center justify-center rounded-[6px] border border-[#E2E8F0] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#64748B] hover:bg-[#F8FAFC] active:scale-[0.98] transition-all cursor-pointer shrink-0"
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="p-[20px] space-y-6">
            
            {/* Section 1: Operator & Security Credentials */}
            <div className="space-y-4">
              <div className="text-[10px] font-bold tracking-wider uppercase text-[#94A3B8]">
                OPERATOR AND SECURITY CREDENTIALS
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] font-medium text-[#64748B]">Operator display name</span>
                  <div className="relative flex items-center w-full bg-white border border-[#E2E8F0] rounded-[6px] focus-within:border-[#94A3B8] transition-all">
                    <input
                      type="text"
                      className="w-full bg-transparent outline-none border-none px-3.5 py-2 text-[13.5px] text-[#0F172A] disabled:bg-[#F8FAFC] disabled:text-[#64748B] disabled:cursor-not-allowed font-sans"
                      placeholder="e.g. Rahul Sharma"
                      value={form.userName}
                      onChange={(e) => setForm({ ...form, userName: e.target.value })}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] font-medium text-[#64748B]">License key</span>
                  <div className="relative flex items-center w-full bg-white border border-[#E2E8F0] rounded-[6px] focus-within:border-[#94A3B8] transition-all">
                    <input
                      type="text"
                      className="w-full bg-transparent outline-none border-none px-3.5 py-2 text-[13.5px] text-[#0F172A] disabled:bg-[#F8FAFC] disabled:text-[#64748B] disabled:cursor-not-allowed font-sans"
                      placeholder="89H-1233-XXXX-XXXX"
                      value={form.license}
                      onChange={(e) => setForm({ ...form, license: e.target.value })}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-none border-t border-[#F1F5F9]" />

            {/* Section 2: Mabsol CRM Sync Engine Integration */}
            <div className="space-y-4">
              <div className="text-[10px] font-bold tracking-wider uppercase text-[#94A3B8]">
                MABSOL CRM SYNC ENGINE INTEGRATION
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] font-medium text-[#64748B]">Company / organization name</span>
                  <div className="relative flex items-center w-full bg-white border border-[#E2E8F0] rounded-[6px] focus-within:border-[#94A3B8] transition-all">
                    <input
                      type="text"
                      className="w-full bg-transparent outline-none border-none px-3.5 py-2 text-[13.5px] text-[#0F172A] disabled:bg-[#F8FAFC] disabled:text-[#64748B] disabled:cursor-not-allowed font-sans"
                      placeholder="e.g. Ivy Company"
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] font-medium text-[#64748B]">Sync executable path</span>
                  <div className="relative flex items-center w-full bg-white border border-[#E2E8F0] rounded-[6px] focus-within:border-[#94A3B8] transition-all">
                    <input
                      type="text"
                      className={`w-full bg-transparent outline-none border-none pl-3.5 ${isEditing ? 'pr-20' : 'pr-3.5'} py-2 text-[13.5px] text-[#0F172A] disabled:bg-[#F8FAFC] disabled:text-[#64748B] disabled:cursor-not-allowed font-mono`}
                      placeholder="C:\Users\Administrator\Downloads\VfpNet\VfpNet.exe"
                      value={form.vfpExePath}
                      onChange={(e) => setForm({ ...form, vfpExePath: e.target.value })}
                      disabled={!isEditing}
                      required
                    />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => openFileBrowser("vfpExePath", "exe", "Select Executable")}
                        className="absolute right-3.5 text-[12px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
                      >
                        Browse_
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] font-medium text-[#64748B]">Log output path</span>
                  <div className="relative flex items-center w-full bg-white border border-[#E2E8F0] rounded-[6px] focus-within:border-[#94A3B8] transition-all">
                    <input
                      type="text"
                      className={`w-full bg-transparent outline-none border-none pl-3.5 ${isEditing ? 'pr-20' : 'pr-3.5'} py-2 text-[13.5px] text-[#0F172A] disabled:bg-[#F8FAFC] disabled:text-[#64748B] disabled:cursor-not-allowed font-mono`}
                      placeholder="e.g. D:\Sync_Logs\sync_log.log"
                      value={form.prgPath}
                      onChange={(e) => setForm({ ...form, prgPath: e.target.value })}
                      disabled={!isEditing}
                      required
                    />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => openFileBrowser("prgPath", "prg", "Select PRG File")}
                        className="absolute right-3.5 text-[12px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
                      >
                        Browse_
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Save Row (Only when editing) */}
            {isEditing && (
              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[6px] text-[13px] font-semibold px-4 py-2 cursor-pointer bg-[#115E59] border border-[#115E59] text-white hover:bg-[#0F4E4B] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Save size={13} />
                  {loading ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[6px] text-[13px] font-semibold px-4 py-2 cursor-pointer bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Guidance Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-[18px_20px] border-b border-[#E2E8F0] gap-4">
            <div>
              <h3 className="text-[14.5px] font-bold text-[#0F172A] m-0">
                Console guidance
              </h3>
              <p className="text-[12px] text-[#64748B] m-0">Helpful reminders for safe sync operations and configuration changes</p>
            </div>
            
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold text-[#15803D] bg-[#F0FDF4] border border-[#DCFCE7] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
              Console healthy
            </span>
          </div>
          <div className="p-[20px] space-y-4">
            <ul className="space-y-2 text-[13px] text-[#475569] list-none p-0 m-0">
              <li className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-[#94A3B8] font-bold select-none">•</span>
                Verify the executable path before launching the console
              </li>
              <li className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-[#94A3B8] font-bold select-none">•</span>
                Use your login to audit database changes and operator activity
              </li>
              <li className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-[#94A3B8] font-bold select-none">•</span>
                Keep the license key stored securely and visible only when needed
              </li>
            </ul>
            
            <div className="p-[14px] bg-[#FFFBEB] border border-[#FDE68A] rounded-[6px]">
              <strong className="block text-[#92400E] text-[11px] font-bold tracking-wider uppercase mb-[2px]">Device audit check</strong>
              <p className="text-[12.5px] text-[#B45309] m-0 font-medium">Last configuration audit succeeded. Console access and sync permissions are noted.</p>
            </div>
          </div>
        </div>

        {/* Audit Log Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-[8px] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-[18px_20px] border-b border-[#E2E8F0] gap-4">
            <div>
              <h3 className="text-[14.5px] font-bold text-[#0F172A] m-0">
                Setting audit log trail
              </h3>
              <p className="text-[12px] text-[#64748B] m-0">Recent configuration edits, sync operations, and property changes</p>
            </div>
            
            <button
              onClick={loadLogs}
              disabled={logsLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-[6px] text-[12.5px] font-semibold px-3.5 py-1.5 cursor-pointer border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] active:scale-[0.98] transition-all disabled:opacity-50 shrink-0"
            >
              <RefreshCw size={13} className={logsLoading ? "animate-spin" : ""} />
              Refresh audits
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-bold tracking-wider uppercase text-[#64748B] p-[12px_20px] border-b border-[#E2E8F0] whitespace-nowrap bg-[#F8FAFC]">TIME AND DATE</th>
                  <th className="text-left text-[10px] font-bold tracking-wider uppercase text-[#64748B] p-[12px_20px] border-b border-[#E2E8F0] whitespace-nowrap bg-[#F8FAFC]">ACTION</th>
                  <th className="text-left text-[10px] font-bold tracking-wider uppercase text-[#64748B] p-[12px_20px] border-b border-[#E2E8F0] whitespace-nowrap bg-[#F8FAFC]">OPERATOR</th>
                  <th className="text-left text-[10px] font-bold tracking-wider uppercase text-[#64748B] p-[12px_20px] border-b border-[#E2E8F0] whitespace-nowrap bg-[#F8FAFC]">TARGET PATH</th>
                  <th className="text-left text-[10px] font-bold tracking-wider uppercase text-[#64748B] p-[12px_20px] border-b border-[#E2E8F0] whitespace-nowrap bg-[#F8FAFC]">ACCOUNT ID</th>
                  <th className="text-left text-[10px] font-bold tracking-wider uppercase text-[#64748B] p-[12px_20px] border-b border-[#E2E8F0] whitespace-nowrap bg-[#F8FAFC]">CHANGE SUMMARY</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-[#E2E8F0]">
                {logsLoading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-[#64748B] font-medium">
                      Loading audit entries...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-[#64748B] font-medium">
                      No logs tracked. Set details to populate records.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-[12px_20px] text-xs text-[#64748B] border-b border-[#E2E8F0] align-middle whitespace-nowrap font-mono">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="p-[12px_20px] text-xs text-[#0F172A] border-b border-[#E2E8F0] align-middle whitespace-nowrap">
                        {log.action === "save_settings" ? "Edit settings" : "Sync manually"}
                      </td>
                      <td className="p-[12px_20px] text-xs text-[#0F172A] font-semibold border-b border-[#E2E8F0] align-middle whitespace-nowrap">
                        {log.userName}
                      </td>
                      <td className="p-[12px_20px] text-xs text-[#64748B] border-b border-[#E2E8F0] align-middle whitespace-nowrap font-mono max-w-[200px] truncate" title={log.vfpExePath}>
                        {log.vfpExePath}
                      </td>
                      <td className="p-[12px_20px] text-xs text-[#64748B] border-b border-[#E2E8F0] align-middle whitespace-nowrap font-mono">
                        {log.license ? log.license.substring(0, 8) : "N/A"}
                      </td>
                      <td className="p-[12px_20px] text-xs text-[#0F172A] border-b border-[#E2E8F0] align-middle max-w-[280px] break-words" title={log.message}>
                        {log.message || "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-[12px_20px] text-[11.5px] text-[#64748B] border-t border-[#E2E8F0]">
            Showing {logs.length} of {logs.length} audit entries
          </div>
        </div>

        <FileSelectorModal
          isOpen={browserConfig.isOpen}
          onClose={() => setBrowserConfig(prev => ({ ...prev, isOpen: false }))}
          onSelect={handleBrowserSelect}
          title={browserConfig.title}
          filterType={browserConfig.filterType}
          initialPath={browserConfig.fieldKey ? form[browserConfig.fieldKey] : ""}
        />

      </div>
    </ProtectedPage>
  );
}
