import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import ProtectedPage from "@/components/ProtectedPage";
import { Fragment } from "react";

export const dynamic = "force-dynamic";
import {
  Clock,
  Database,
  FolderOpen,
  Settings,
} from "lucide-react";
import VfpSyncActions from "@/components/VfpSyncActions";
import { getVfpStatus } from "@/lib/vfp/status";

type VfpLogRow = {
  _id: unknown;
  action?: string;
  tableName?: string;
  status?: string;
  message?: string;
  error?: string;
  createdAt?: Date | string;
};

function formatDate(value?: Date | string) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString();
}

function formatTimeOnly(value?: Date | string) {
  if (!value) return "Never";
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function statusBadge(status?: string) {
  const normalizedStatus = (status || "unknown").toLowerCase();
  
  let bgClass = "bg-slate-100 text-slate-700 border-slate-200";
  
  if (["success", "stored", "online", "live sync active"].includes(normalizedStatus)) {
    bgClass = "bg-green-50 text-green-700 border-green-200";
  } else if (["running", "processing", "syncing"].includes(normalizedStatus)) {
    bgClass = "bg-sky-50 text-sky-700 border-sky-200";
  } else if (["locked", "too_large", "offline", "worker attention needed"].includes(normalizedStatus)) {
    bgClass = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (["failed", "error"].includes(normalizedStatus)) {
    bgClass = "bg-red-50 text-red-700 border-red-200";
  }

  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${bgClass}`}>
      {status || "unknown"}
    </span>
  );
}

const rangeOptions = ["all", "day", "week", "month"] as const;

type VfpRange = (typeof rangeOptions)[number];

const rangeLabels: Record<VfpRange, string> = {
  all: "All time",
  day: "Today",
  week: "This week",
  month: "This month",
};

function formatRangeName(range: VfpRange) {
  return rangeLabels[range] || "All time";
}

export default async function VfpDashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  let decoded: any = null;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string);
  } catch {
    redirect("/login");
  }

  const rawRange = searchParams.range;
  const rawStartDate = searchParams.startDate;
  const rawEndDate = searchParams.endDate;
  const selectedRange = Array.isArray(rawRange)
    ? rawRange[0]
    : rawRange || "all";
  const startDate = Array.isArray(rawStartDate)
    ? rawStartDate[0]
    : rawStartDate;
  const endDate = Array.isArray(rawEndDate)
    ? rawEndDate[0]
    : rawEndDate;
  const range = rangeOptions.includes(selectedRange as VfpRange)
    ? (selectedRange as VfpRange)
    : "all";

  const fileLimit = 10;
  const email = decoded?.email;
  const status = await getVfpStatus({ range, startDate, endDate, fileLimit }, email);
  const recentLogs = status.recentLogs as VfpLogRow[];

  return (
    <ProtectedPage permission="vfp.view">
      {/* Load custom typography and define the UI CSS structure from mockup */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --bg: #F1F3F6;
          --surface: #FFFFFF;
          --surface-alt: #F7F8FA;
          --border: #E1E4EA;
          --border-strong: #CBD0DA;
          --ink: #12141C;
          --ink-soft: #5A6072;
          --ink-faint: #8A8F9E;
          --indigo: #4338CA;
          --indigo-soft: #EEECFB;
          --teal: #0D9488;
          --teal-soft: #E2F6F3;
          --amber: #B45309;
          --amber-soft: #FDF1DE;
          --red: #C0332A;
          --red-soft: #FCEBEA;
          --shadow-sm: 0 1px 2px rgba(18,20,28,0.04);
          --shadow-md: 0 4px 16px rgba(18,20,28,0.06);
          --radius: 12px;
        }

        .vfp-page-body {
          color: var(--ink);
          font-family: 'Inter', sans-serif;
        }

        .mono { font-family: 'JetBrains Mono', monospace; }
        .display { font-family: 'Space Grotesk', sans-serif; }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: .08em;
          color: var(--indigo);
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .eyebrow svg { width: 14px; height: 14px; }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }
        .vfp-h1 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 0 0 8px;
        }
        .subtitle {
          color: var(--ink-soft);
          font-size: 14.5px;
          line-height: 1.55;
          max-width: 560px;
          margin: 0;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--teal-soft);
          color: var(--teal);
          font-size: 12.5px;
          font-weight: 600;
          padding: 7px 13px 7px 10px;
          border-radius: 100px;
          white-space: nowrap;
          margin-top: 2px;
        }
        .dot-pulse {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--teal);
          position: relative;
        }
        .dot-pulse::after {
          content: '';
          position: absolute; inset: -5px;
          border-radius: 50%;
          background: var(--teal);
          opacity: .35;
          animation: pulse 1.8s ease-out infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.4); opacity: .5; }
          70% { transform: scale(1.8); opacity: 0; }
          100% { opacity: 0; }
        }

        /* signature pipeline visual */
        .pipeline {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          padding: 26px 32px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 0;
        }
        .p-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          min-width: 140px;
          text-align: center;
        }
        .p-icon {
          width: 52px; height: 52px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: var(--surface-alt);
          border: 1px solid var(--border);
          color: var(--ink-soft);
        }
        .p-node.active .p-icon {
          background: var(--indigo-soft);
          border-color: #D8D3F5;
          color: var(--indigo);
        }
        .p-label { font-size: 13px; font-weight: 600; }
        .p-sub { font-size: 11px; color: var(--ink-faint); font-family: 'JetBrains Mono', monospace; }

        .p-track {
          flex: 1;
          height: 2px;
          background: var(--border);
          position: relative;
          margin: 0 6px;
          top: -22px;
          overflow: hidden;
          border-radius: 2px;
        }
        .p-track .packet {
          position: absolute;
          top: -2.5px;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--teal);
          animation: flow 2.6s linear infinite;
        }
        .p-track .packet:nth-child(2) { animation-delay: .9s; }
        .p-track .packet:nth-child(3) { animation-delay: 1.7s; }
        @keyframes flow {
          0% { left: -2%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 98%; opacity: 0; }
        }

        /* panel card */
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          margin-bottom: 24px;
          overflow: hidden;
        }
        .card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid var(--border);
        }
        .card-title {
          display: flex; align-items: center; gap: 9px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 15.5px;
          font-weight: 600;
        }
        .card-title svg { width: 16px; height: 16px; color: var(--indigo); }

        .btn {
          display: inline-flex; align-items: center; gap: 7px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 14px;
          cursor: pointer;
          border: 1px solid var(--border-strong);
          background: var(--surface);
          color: var(--ink);
          transition: background .15s, box-shadow .15s, transform .05s;
        }
        .btn:hover { background: var(--surface-alt); }
        .btn:active { transform: translateY(1px); }
        .btn svg { width: 14px; height: 14px; }
        .btn-primary {
          background: var(--indigo);
          border-color: var(--indigo);
          color: #fff;
        }
        .btn-primary:hover { background: #372FB0; }

        .card-body { padding: 24px; }
        .grid-2 {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 24px;
        }
        @media (max-width: 760px) { .grid-2 { grid-template-columns: 1fr; } }

        .field-group { margin-bottom: 20px; }
        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-soft);
          text-transform: uppercase;
          letter-spacing: .04em;
          margin-bottom: 8px;
        }
        .path-row {
          display: flex; gap: 8px;
        }
        .path-input {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: var(--surface-alt);
          border: 1px solid var(--border);
          border-radius: 7px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: var(--ink);
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .path-input svg { width: 14px; height: 14px; flex-shrink: 0; color: var(--ink-faint); }

        .segmented {
          display: inline-flex;
          background: var(--surface-alt);
          border: 1px solid var(--border);
          border-radius: 7px;
          padding: 3px;
        }
        .segmented button {
          border: none; background: transparent;
          padding: 7px 16px;
          font-size: 12.5px; font-weight: 600;
          color: var(--ink-soft);
          border-radius: 5px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
        }
        .segmented button.active {
          background: var(--surface);
          color: var(--indigo);
          box-shadow: var(--shadow-sm);
        }

        .toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px;
          background: var(--surface-alt);
          border: 1px solid var(--border);
          border-radius: 8px;
        }
        .toggle-row .t-title { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
        .toggle-row .t-sub { font-size: 12px; color: var(--ink-faint); }
        .switch {
          width: 38px; height: 22px;
          background: var(--border-strong);
          border-radius: 100px;
          position: relative;
          cursor: pointer;
          flex-shrink: 0;
          transition: background .18s;
        }
        .switch::after {
          content: '';
          position: absolute;
          width: 16px; height: 16px;
          background: #fff;
          border-radius: 50%;
          top: 2px; left: 3px;
          transition: left .18s;
          box-shadow: 0 1px 2px rgba(0,0,0,.25);
        }
        .switch.on { background: var(--teal); }
        .switch.on::after { left: 19px; }

        .badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11.5px; font-weight: 600;
          padding: 3px 9px;
          border-radius: 100px;
        }
        .badge-success { background: var(--teal-soft); color: var(--teal); }
        .badge-running { background: var(--indigo-soft); color: var(--indigo); }
        .badge-error { background: var(--red-soft); color: var(--red); }
        .badge-warn { background: var(--amber-soft); color: var(--amber); }
        .badge svg { width: 9px; height: 9px; }

        .meta-line {
          display: flex; align-items: center; gap: 8px;
          font-size: 12.5px;
          color: var(--ink-soft);
          margin-top: 16px;
        }
        .meta-line svg { width: 13px; height: 13px; color: var(--ink-faint); }
        .meta-line .mono { color: var(--ink); }

        .alert {
          display: flex; gap: 11px;
          align-items: flex-start;
          background: var(--red-soft);
          border-left: 3px solid var(--red);
          border-radius: 6px;
          padding: 12px 14px;
          margin-top: 18px;
          font-size: 13px;
          color: #7A231D;
          line-height: 1.5;
        }
        .alert svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; color: var(--red); }
        .alert strong { display: block; margin-bottom: 2px; font-weight: 600; color: var(--red); }

        .right-col {
          display: flex; flex-direction: column; gap: 14px;
        }
        .sync-cta {
          background: var(--surface-alt);
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 20px;
          text-align: center;
        }
        .sync-cta .btn-primary {
          width: 100%;
          justify-content: center;
          padding: 12px;
          font-size: 13.5px;
        }
        .sync-cta .cta-note {
          font-size: 11.5px;
          color: var(--ink-faint);
          margin-top: 10px;
          line-height: 1.5;
        }

        /* logs */
        .filter-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border);
          flex-wrap: wrap;
        }
        .chip {
          font-size: 12.5px;
          font-weight: 600;
          padding: 7px 13px;
          border-radius: 100px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink-soft);
          cursor: pointer;
        }
        .chip.active {
          background: var(--indigo);
          border-color: var(--indigo);
          color: #fff;
        }
        .date-input {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          padding: 7px 10px;
          border: 1px solid var(--border);
          border-radius: 7px;
          color: var(--ink-soft);
          background: var(--surface);
          width: 120px;
        }
        .filter-spacer { flex: 1; }
        .icon-btn {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 7px;
          border: 1px solid var(--border);
          background: var(--surface);
          cursor: pointer;
          color: var(--ink-soft);
        }
        .icon-btn svg { width: 15px; height: 15px; }

        .log-list {
          max-height: 480px;
          overflow-y: auto;
        }
        .log-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border);
          border-left: 3px solid transparent;
          transition: background .15s;
        }
        .log-item:last-child { border-bottom: none; }
        .log-item:hover { background: var(--surface-alt); }
        .log-item.success { border-left-color: var(--teal); }
        .log-item.running { border-left-color: var(--indigo); }
        .log-item.error { border-left-color: var(--red); }

        .log-main { display: flex; flex-direction: column; gap: 6px; }
        .log-top { display: flex; align-items: center; gap: 9px; }
        .log-name { font-size: 13px; font-weight: 600; }
        .log-desc { font-size: 12.5px; color: var(--ink-soft); font-family: 'JetBrains Mono', monospace; }
        .log-time {
          font-size: 11.5px;
          color: var(--ink-faint);
          font-family: 'JetBrains Mono', monospace;
          white-space: nowrap;
          padding-top: 2px;
        }

        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 100px; }
        ::-webkit-scrollbar-track { background: transparent; }

        @media (prefers-reduced-motion: reduce) {
          .dot-pulse::after, .p-track .packet { animation: none; }
        }
      ` }} />

      <div className="page vfp-page-body">
        
        {/* Eyebrow & Page Header */}
        <div className="eyebrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4v6h6M20 20v-6h-6"/><path d="M20 9a8 8 0 00-14.9-3M4 15a8 8 0 0014.9 3"/></svg>
          Data migration
        </div>
        
        <div className="header-row">
          <div>
            <h1 className="vfp-h1">Migrate Data Control</h1>
            <p className="subtitle">Monitor local Visual FoxPro folder changes, DBF imports, file snapshots, and queued updates from one dashboard.</p>
          </div>
          <span className="status-pill">
            <span className="dot-pulse"></span>
            Sync active
          </span>
        </div>

        {/* Signature Pipeline Visual */}
        <div className="pipeline">
          {/* Node 1: FoxPro Folder */}
          <div className="p-node active">
            <div className="p-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
            </div>
            <div className="p-label">FoxPro Folder</div>
            <div className="p-sub truncate max-w-[130px]" title={status.dataDir}>{status.dataDir ? status.dataDir.substring(status.dataDir.lastIndexOf("\\") + 1) || status.dataDir : "Not set"}</div>
          </div>
          
          {/* Flow track 1 */}
          <div className="p-track">
            <span className="packet"></span>
            <span className="packet"></span>
            <span className="packet"></span>
          </div>

          {/* Node 2: Sync Engine */}
          <div className="p-node active">
            <div className="p-icon">
              <Settings size={20} className="animate-spin" style={{ animationDuration: "12s" }} />
            </div>
            <div className="p-label">Sync Engine</div>
            <div className="p-sub" id="engine-sub">Worker: {status.workerOnline ? "active" : "offline"}</div>
          </div>

          {/* Flow track 2 */}
          <div className="p-track">
            <span className="packet" style={{ animationDelay: ".5s" }}></span>
            <span className="packet" style={{ animationDelay: "1.3s" }}></span>
            <span className="packet" style={{ animationDelay: "2.1s" }}></span>
          </div>

          {/* Node 3: CRM DBF Table */}
          <div className="p-node">
            <div className="p-icon">
              <Database size={20} />
            </div>
            <div className="p-label">CRM DBF Table</div>
            <div className="p-sub truncate max-w-[130px]">
              {status.enabledFiles && status.enabledFiles.length > 0 
                ? status.enabledFiles[0] 
                : "All tables"}
            </div>
          </div>
        </div>

        {/* Control Panel - Full Width */}
        <VfpSyncActions 
          currentPath={status.dataDir} 
          enabledFiles={status.enabledFiles}
          initialAutoSync={status.autoSync}
          initialAutoSyncInterval={status.autoSyncInterval}
          workerOnline={status.workerOnline}
          workerStatus={status.workerStatus}
          lastSyncedAt={status.lastSyncedAt}
        />

        {/* Sync Activity Logs Card */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6M9 9h1"/></svg>
              Sync activity logs
            </div>
            <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>
              Filter and review VFP to CRM data transfer logs
            </span>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            {rangeOptions.map((option) => (
              <Link
                key={option}
                className={`chip ${range === option && !startDate && !endDate ? "active" : ""}`}
                href={`/dashboard/vfp?range=${option}`}
              >
                {formatRangeName(option)}
              </Link>
            ))}
            
            <form className="flex items-center gap-1.5 flex-wrap ml-2" method="get">
              <input
                className="date-input"
                type="date"
                name="startDate"
                defaultValue={startDate || ""}
              />
              <span style={{ fontSize: "11px", color: "var(--ink-faint)" }}>to</span>
              <input
                className="date-input"
                type="date"
                name="endDate"
                defaultValue={endDate || ""}
              />
              <button className="btn btn-primary ml-1" type="submit">
                Apply
              </button>
              <Link href="/dashboard/vfp" className="btn">
                Reset
              </Link>
            </form>
            
            <div className="filter-spacer"></div>
            
            <div className="icon-btn" title="Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </div>
          </div>

          {/* Logs List */}
          <div className="log-list" id="log-list">
            {recentLogs.length === 0 ? (
              <div className="text-center text-slate-450 py-16 font-semibold text-xs bg-slate-50/20">
                No sync activity logs found.
              </div>
            ) : (
              recentLogs.map((log) => {
                const logStatus = (log.status || "unknown").toLowerCase();
                const logClass = logStatus === "success" 
                  ? "success" 
                  : logStatus === "running" 
                  ? "running" 
                  : "error";

                return (
                  <div className={`log-item ${logClass}`} key={String(log._id)}>
                    <div className="log-main">
                      <div className="log-top">
                        <span className="log-name">
                          {log.action} {log.tableName ? `· ${log.tableName}` : ""}
                        </span>
                        <span className={`badge ${
                          logClass === "success" 
                            ? "badge-success" 
                            : logClass === "running" 
                            ? "badge-running" 
                            : "badge-error"
                        }`}>
                          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="12"/></svg>
                          {log.status || "Unknown"}
                        </span>
                      </div>
                      <div className="log-desc">{log.message || log.error || "No description logged."}</div>
                    </div>
                    <div className="log-time">{formatDate(log.createdAt)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </ProtectedPage>
  );
}
