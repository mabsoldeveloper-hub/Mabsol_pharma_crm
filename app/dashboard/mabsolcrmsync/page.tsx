import Link from "next/link";
import { redirect } from "next/navigation";
import ProtectedPage from "@/components/ProtectedPage";
import { Fragment } from "react";
import { getCurrentUser } from "@/lib/auth";
import RefreshButton from "@/components/RefreshButton";
import "./vfp.css";

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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedParams = await searchParams;
  const rawRange = resolvedParams.range;
  const rawStartDate = resolvedParams.startDate;
  const rawEndDate = resolvedParams.endDate;
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
  const email = user.email;
  const status = await getVfpStatus({ range, startDate, endDate, fileLimit }, email);
  const recentLogs = status.recentLogs as VfpLogRow[];

  return (
    <ProtectedPage permission="vfp.view">
      <div className="vfp-page-body">
        
        {/* Eyebrow & Page Header */}
        <div className="eyebrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4v6h6M20 20v-6h-6"/><path d="M20 9a8 8 0 00-14.9-3M4 15a8 8 0 0014.9 3"/></svg>
          Data migration
        </div>
        
        <div className="header-row">
          <div>
            <h1 className="vfp-h1">Migrate Data Control</h1>
            <p className="subtitle">Monitor local folder changes, DBF imports, file snapshots, and queued updates from one dashboard.</p>
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
            <div className="p-sub" id="engine-sub">Sync Engine: Ready</div>
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
          pendingCommandCount={status.pendingCommandCount || 0}
        />

        {/* Sync Activity Logs Card */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6M9 9h1"/></svg>
                Sync activity logs
              </div>
              <span style={{ fontSize: "12px", color: "var(--ink-faint)" }}>
                Filter and review CRM data transfer logs
              </span>
            </div>
            <RefreshButton />
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="flex items-center gap-2 flex-wrap">
              {rangeOptions.map((option) => (
                <Link
                  key={option}
                  className={`chip ${range === option && !startDate && !endDate ? "active" : ""}`}
                  href={`/dashboard/mabsolcrmsync?range=${option}`}
                >
                  {formatRangeName(option)}
                </Link>
              ))}
            </div>
            
            <form className="flex items-center gap-2 flex-wrap" method="get">
              <input
                className="date-input"
                type="date"
                name="startDate"
                defaultValue={startDate || ""}
              />
              <span style={{ fontSize: "11px", color: "var(--ink-faint)", whiteSpace: "nowrap" }}>to</span>
              <input
                className="date-input"
                type="date"
                name="endDate"
                defaultValue={endDate || ""}
              />
              <button className="btn btn-primary" type="submit">
                Apply
              </button>
              <Link href="/dashboard/mabsolcrmsync" className="btn">
                Reset
              </Link>
            </form>
            
            <div className="filter-spacer"></div>
            
            <div className="icon-btn" title="Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </div>
          </div>

          {/* Logs List */}
          <div className="log-list" id="log-list">
            {recentLogs.length === 0 ? (
              <div className="log-empty">
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
