"use client";

import React, { useState, useEffect } from "react";
import { 
  Download, 
  Key, 
  RefreshCw, 
  Copy, 
  CheckCircle2, 
  Server, 
  ShieldCheck, 
  HardDrive,
  Activity,
  AlertCircle
} from "lucide-react";

interface AgentStatus {
  online: boolean;
  hostname: string;
  dataDir: string;
  agentVersion: string;
  lastSeenAt: string | null;
}

export default function SyncAgentDashboard() {
  const [licenseKey, setLicenseKey] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    online: false,
    hostname: "Not connected",
    dataDir: "Not configured",
    agentVersion: "1.0.0",
    lastSeenAt: null,
  });

  const fetchLicenseData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sync-agent/keys");
      const data = await res.json();
      if (data.success) {
        setLicenseKey(data.licenseKey);
        setCompanyName(data.companyName);
      }
    } catch (e) {
      console.error("Failed to fetch license key:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeartbeatStatus = async () => {
    try {
      const res = await fetch("/api/vfp/status");
      const data = await res.json();
      if (data.success && data.status) {
        const s = data.status;
        const lastSeen = s.workerLastSeenAt ? new Date(s.workerLastSeenAt) : null;
        const isOnline = Boolean(s.workerOnline);
        setAgentStatus({
          online: isOnline,
          hostname: s.hostname || "Client-PC",
          dataDir: s.dataDir || "D:\\Data",
          agentVersion: "1.0.0",
          lastSeenAt: lastSeen ? lastSeen.toLocaleTimeString() : null,
        });
      }
    } catch (e) {
      console.error("Failed to fetch agent status:", e);
    }
  };

  useEffect(() => {
    fetchLicenseData();
    fetchHeartbeatStatus();
    const interval = setInterval(fetchHeartbeatStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyKey = () => {
    if (!licenseKey) return;
    navigator.clipboard.writeText(licenseKey);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const handleRegenerateKey = async () => {
    if (!confirm("Are you sure you want to generate a new License Key? The existing agent connection will need to be updated.")) return;
    try {
      setRegenerating(true);
      const res = await fetch("/api/sync-agent/keys", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLicenseKey(data.licenseKey);
      }
    } catch (e) {
      console.error("Failed to regenerate license key:", e);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4" /> Secure Desktop Synchronization
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Mabsol Sync Agent</h1>
          <p className="mt-2 text-slate-300 text-sm leading-relaxed">
            Connect your local database directly to your cloud CRM. Lightweight, standalone, and 100% secure with zero database exposure.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href="/downloads/MabsolSyncAgentSetup.exe"
              download
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/30 text-sm"
            >
              <Download className="w-4 h-4" /> Download Windows Installer (MabsolSyncAgentSetup.exe)
            </a>
            <a
              href="/downloads/mabsolsyncagent.exe"
              download
              className="inline-flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2.5 rounded-xl border border-slate-700 text-xs transition"
            >
              Standalone Binary (.exe)
            </a>
            <button
              onClick={fetchHeartbeatStatus}
              className="inline-flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2.5 rounded-xl border border-slate-700 text-sm transition"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Status
            </button>
          </div>
        </div>
      </div>

      {/* Grid Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Agent Connection Status */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Agent Status</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${agentStatus.online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              <span className={`w-2 h-2 rounded-full ${agentStatus.online ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {agentStatus.online ? 'Online' : 'Waiting for Agent'}
            </span>
          </div>
          <div className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            {agentStatus.hostname}
          </div>
          <p className="text-xs text-slate-500">
            {agentStatus.lastSeenAt ? `Last active ping: ${agentStatus.lastSeenAt}` : "No active agent connected"}
          </p>
        </div>

        {/* Sync Folder */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sync Folder Path</span>
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base font-semibold text-slate-800 truncate" title={agentStatus.dataDir}>
            {agentStatus.dataDir}
          </div>
          <p className="text-xs text-slate-500">Configured on host PC</p>
        </div>

        {/* Security & Version */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Security & Version</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-800">
            v{agentStatus.agentVersion} <span className="text-xs font-normal text-slate-500">(256-bit HTTPS)</span>
          </div>
          <p className="text-xs text-emerald-600 font-medium">SSL Encrypted Cloud Bridge</p>
        </div>
      </div>

      {/* License Key Section */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" /> Company License Key
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Use this unique key to activate <code className="text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded">mabsolsyncagent.exe</code> on your Windows PC.
            </p>
          </div>
          <button
            onClick={handleRegenerateKey}
            disabled={regenerating}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            {regenerating ? "Generating..." : "Regenerate Key"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[280px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-slate-800 text-base font-semibold tracking-wider flex items-center justify-between">
            <span>{loading ? "Loading key..." : licenseKey || "No Key Generated"}</span>
          </div>
          <button
            onClick={handleCopyKey}
            disabled={!licenseKey}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-3 rounded-xl transition text-sm shadow-sm"
          >
            {copySuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            {copySuccess ? "Copied!" : "Copy License Key"}
          </button>
        </div>
      </div>

      {/* 3-Step Setup Instructions for Client Companies */}
      <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-indigo-600" /> How to Setup Mabsol Sync Agent (3 Easy Steps)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">1</div>
            <h4 className="font-semibold text-slate-900 text-sm">Download Executable</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Click the download button above to save <code className="text-indigo-600 bg-slate-100 px-1 rounded">mabsolsyncagent.exe</code> to your Windows PC.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">2</div>
            <h4 className="font-semibold text-slate-900 text-sm">Automatic Browser Setup Wizard</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Double-click <code className="text-indigo-600 bg-slate-100 px-1 rounded">mabsolsyncagent.exe</code>. It automatically opens the setup wizard in your web browser.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">3</div>
            <h4 className="font-semibold text-slate-900 text-sm">Enter Key & Connect</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Paste your License Key in the browser wizard and select your database folder. Click Save to start 24/7 background sync!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
