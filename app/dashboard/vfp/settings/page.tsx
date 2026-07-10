"use client";

import { useEffect, useState } from "react";
import ProtectedPage from "@/components/ProtectedPage";
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
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Check,
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
  const [logsLoading, setLogsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "danger" | ""; text: string }>({ type: "", text: "" });
  const [logs, setLogs] = useState<VfpSettingLogEntry[]>([]);

  // Original saved data to restore on Cancel
  const [savedForm, setSavedForm] = useState({
    userName: "",
    companyName: "",
    license: "",
    vfpExePath: "",
  });

  const [form, setForm] = useState({
    userName: "",
    companyName: "",
    license: "",
    vfpExePath: "",
  });

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vfp/config");
      const data = await res.json();
      if (data.success) {
        const configData = {
          userName: data.userName || "",
          companyName: data.companyName || "",
          license: data.license || "",
          vfpExePath: data.vfpExePath || "",
        };
        setForm(configData);
        setSavedForm(configData);
      }
    } catch (error) {
      console.error("Failed to load VFP config:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await fetch("/api/vfp/setting-logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to load VFP setting logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!form.userName.trim() || !form.companyName.trim() || !form.license.trim()) {
      setMessage({ type: "danger", text: "Operator, Company name, and License Key fields are required to update settings." });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/vfp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: form.userName,
          companyName: form.companyName,
          license: form.license,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "VFP settings saved and logged successfully." });
        setSavedForm(form);
        setIsEditing(false);
        loadLogs();
      } else {
        setMessage({ type: "danger", text: data.error || "Failed to save configuration." });
      }
    } catch {
      setMessage({ type: "danger", text: "An error occurred while saving VFP settings." });
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

    if (!savedForm.userName || !savedForm.companyName || !savedForm.license || !savedForm.vfpExePath) {
      setMessage({ type: "danger", text: "Please enter and save all VFP details before triggering a sync." });
      return;
    }

    try {
      setSyncing(true);
      const res = await fetch("/api/vfp/sync-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedForm),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Immediate VFP sync triggered and logged successfully." });
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

  function actionBadge(action: string) {
    if (action === "save_settings") {
      return (
        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100">
          Save Settings
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-2xl bg-green-50 text-green-700 border border-green-100">
        Sync Triggered
      </span>
    );
  }

  function statusBadge(action: string) {
    let text = "Completed";
    if (action === "save_settings") {
      text = "Saved";
    }
    return (
      <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
        {text}
      </span>
    );
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hour = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${min}`;
  }

  const isFormConfigured = savedForm.userName && savedForm.companyName && savedForm.license;

  return (
    <ProtectedPage permission="vfp.settings">
      <div className="space-y-4 px-1.5 sm:px-4">
        
        {/* Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-3 sm:p-6 space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Database size={22} />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Visual FoxPro Configuration</h1>
                <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-2xl font-medium">
                  VFP Integration Settings
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Manage your Visual FoxPro connection, sync controls, and audit trail from a single streamlined admin workspace.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              onClick={handleSyncNow}
              disabled={syncing || isEditing || !isFormConfigured}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-2xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync Now & Log"}
            </button>
          </div>
        </div>

        {/* Alerts / Feedback Message */}
        {message.text && (
          <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
            message.type === "success" 
              ? "bg-green-50 border-green-200 text-green-800" 
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Stored Configuration Card */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-blue-600 shrink-0">
                  {isEditing ? <Unlock size={18} /> : <Lock size={18} />}
                </div>
                <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                  Stored Configuration
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 break-words">
                Current VFP integration values and access state.
              </p>
            </div>
            
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700 shrink-0"
              >
                <Unlock size={12} /> Unlock & Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Configured Operator
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User size={14} />
                    </span>
                    <input
                      type="text"
                      className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-slate-800"
                      placeholder="Operator's full name"
                      value={form.userName}
                      onChange={(e) => setForm({ ...form, userName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Company Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building size={14} />
                    </span>
                    <input
                      type="text"
                      className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-slate-800"
                      placeholder="Company name"
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Database Sync License Key
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key size={14} />
                  </span>
                  <input
                    type="text"
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 text-slate-800 font-mono"
                    placeholder="VFP database sync license"
                    value={form.license}
                    onChange={(e) => setForm({ ...form, license: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <Save size={15} /> Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2.5">
              <div className="border border-slate-100 rounded-2xl p-2.5 bg-slate-50/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" />
                  Configured Operator
                </span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{savedForm.userName || "Not set"}</p>
              </div>

              <div className="border border-slate-100 rounded-2xl p-2.5 bg-slate-50/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building size={13} className="text-slate-400" />
                  Company Name
                </span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{savedForm.companyName || "Not set"}</p>
              </div>

              <div className="border border-slate-100 rounded-2xl p-2.5 bg-slate-50/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={13} className="text-slate-400" />
                  Database Sync License Key
                </span>
                <p className="text-sm font-semibold text-slate-850 mt-0.5 font-mono break-all">{savedForm.license || "Not set"}</p>
              </div>

            </div>
          )}
        </div>

        {/* Guidance Card */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-3 sm:p-6 space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <HelpCircle size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">VFP Console Guidance</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Helpful reminders for safe sync operations and configuration checks.
              </p>
            </div>
          </div>

          <div className="space-y-2 border border-slate-100 rounded-2xl p-3 bg-slate-50/10">
            <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-600 leading-relaxed">
              <Check size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <span>Verify the executable path before launching the console.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-600 leading-relaxed">
              <Check size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <span>Use sync logging to capture database changes and operator actions.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-600 leading-relaxed">
              <Check size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <span>Keep the license key stored securely and rotate access when needed.</span>
            </div>
          </div>

          {/* System Health Check alert block */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 flex gap-2.5 items-start">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
            <div>
              <span className="text-amber-800 text-xs font-bold block">System Health Check</span>
              <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
                Last validation completed successfully. Console access and sync permissions are ready for use.
              </p>
            </div>
          </div>
        </div>

        {/* Audit Log Card */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-3 sm:p-6">
          <div className="flex items-start gap-4 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">Setting Audit Log Trail</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Recent configuration events, sync actions, and operator changes.
              </p>
            </div>
          </div>

          <button
            onClick={loadLogs}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-2xl bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 disabled:opacity-50 transition-colors"
            disabled={logsLoading}
          >
            <RefreshCw size={13} className={logsLoading ? "animate-spin" : ""} />
            {logsLoading ? "Refreshing Audits..." : "Refresh Audits"}
          </button>

          <div className="overflow-x-auto w-full border border-slate-100 rounded-2xl mt-3">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2 px-2.5">Timestamp</th>
                  <th className="py-2 px-2.5">Action</th>
                  <th className="py-2 px-2.5">Operator</th>
                  <th className="py-2 px-2.5">Target Path</th>
                  <th className="py-2 px-2.5">License Key</th>
                  <th className="py-2 px-2.5">IP Address</th>
                  <th className="py-2 px-2.5">Change Details</th>
                  <th className="py-2 px-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {logsLoading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-slate-400 font-medium">
                      Loading audit entries...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-slate-400 font-medium">
                      No logs tracked. Set details to populate records.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-2.5 px-2.5 font-medium text-slate-500">{formatDate(log.createdAt)}</td>
                      <td className="py-2.5 px-2.5">{actionBadge(log.action)}</td>
                      <td className="py-2.5 px-2.5 text-slate-700 font-semibold">{log.userName}</td>
                      <td className="py-2.5 px-2.5 font-mono text-slate-400 text-xs truncate max-w-[180px]" title={log.vfpExePath}>
                        {log.vfpExePath}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-slate-400 text-xs">{log.license}</td>
                      <td className="py-2.5 px-2.5 font-mono text-slate-500 text-xs">{log.ipAddress || "127.0.0.1"}</td>
                      <td className="py-2.5 px-2.5 text-slate-650 max-w-[250px] truncate" title={log.message}>
                        {log.message || "N/A"}
                      </td>
                      <td className="py-2.5 px-2.5">{statusBadge(log.action)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400">
              Showing {logs.length} of {logs.length} audit entries
            </span>
          </div>
        </div>

      </div>
    </ProtectedPage>
  );
}
