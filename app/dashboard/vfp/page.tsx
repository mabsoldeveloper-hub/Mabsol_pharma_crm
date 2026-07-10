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
  RefreshCw,
  AlertTriangle,
  FileText,
  FolderOpen,
  Server,
  FolderDot,
} from "lucide-react";
import VfpSyncActions from "@/components/VfpSyncActions";
import TableActions from "@/components/TableActions";
import { getVfpStatus } from "@/lib/vfp/status";

type VfpStateRow = {
  _id: unknown;
  tableName?: string;
  status?: string;
  lastRecordCount?: number;
  lastImportedCount?: number;
  lastSyncedAt?: Date | string;
  lastError?: string;
};

type VfpLogRow = {
  _id: unknown;
  action?: string;
  tableName?: string;
  status?: string;
  message?: string;
  error?: string;
  createdAt?: Date | string;
};

type VfpFileRow = {
  _id: unknown;
  relativePath?: string;
  extension?: string;
  size?: number;
  storageStatus?: string;
  lastSyncedAt?: Date | string;
  lastSyncedDate?: string;
  lastError?: string;
};

function formatDate(value?: Date | string) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString();
}

function formatBytes(value?: number) {
  if (!value) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );
  const amount = value / 1024 ** index;

  return `${amount.toFixed(amount >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
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
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-2xl border ${bgClass}`}>
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

// Format the date label displayed inside groups of files in list
function getSyncDateLabel(file: VfpFileRow) {
  if (file.lastSyncedDate) {
    return file.lastSyncedDate;
  }

  if (!file.lastSyncedAt) {
    return "Unknown date";
  }

  const date = new Date(file.lastSyncedAt);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function formatRangeDescription(range: VfpRange, from?: Date) {
  if (range === "all") {
    return "Showing all synced files, tables, and logs.";
  }

  if (!from) {
    return "Showing sync data for the selected date range.";
  }

  return `Showing records since ${formatDate(from)}.`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-4 flex gap-4 hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
        <Icon size={20} />
      </div>
      <div className="space-y-0.5">
        <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{hint}</div>
      </div>
    </div>
  );
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
  const rawShowMore = searchParams.showMore;
  const selectedRange = Array.isArray(rawRange)
    ? rawRange[0]
    : rawRange || "all";
  const startDate = Array.isArray(rawStartDate)
    ? rawStartDate[0]
    : rawStartDate;
  const endDate = Array.isArray(rawEndDate)
    ? rawEndDate[0]
    : rawEndDate;
  const showMore = rawShowMore === "1" || rawShowMore === "true";
  const range = rangeOptions.includes(selectedRange as VfpRange)
    ? (selectedRange as VfpRange)
    : "all";

  const fileLimit = showMore ? 100 : 10;
  const email = decoded?.email;
  const status = await getVfpStatus({ range, startDate, endDate, fileLimit }, email);
  const tableRows = status.states as VfpStateRow[];
  
  // Group tables folder-wise
  const folderGroups: Record<string, VfpStateRow[]> = {};
  for (const state of tableRows) {
    const tablePath = state.tableName || "default";
    const dirName = tablePath.includes("/")
      ? tablePath.substring(0, tablePath.lastIndexOf("/"))
      : "Root Folder";

    if (!folderGroups[dirName]) {
      folderGroups[dirName] = [];
    }
    folderGroups[dirName].push(state);
  }
  const folderNames = Object.keys(folderGroups).sort();

  const recentFiles = status.recentFiles as VfpFileRow[];
  const recentLogs = status.recentLogs as VfpLogRow[];
  const healthLabel = status.workerOnline ? "Live Sync Active" : "Worker Attention Needed";

  const groupedRecentFiles = recentFiles.reduce(
    (groups: Record<string, VfpFileRow[]>, file) => {
      const groupKey = getSyncDateLabel(file);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(file);
      return groups;
    },
    {}
  );

  const groupedDateKeys = Object.keys(groupedRecentFiles);

  return (
    <ProtectedPage permission="vfp.view">
      <div className="space-y-6 px-1.5 sm:px-4">
        
        {/* Page Header / Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm lg:col-span-2 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
              <RefreshCw size={14} /> VFP Integration
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">PNC Data Sync Console</h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Monitor the local VFP folder, DBF imports, file snapshots, and
              queued CRM-to-VFP updates from one place.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Worker Status</span>
              {statusBadge(status.workerOnline ? "online" : "offline")}
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-950">{healthLabel}</h4>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Last sync: {formatDate(status.lastSyncedAt)}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <VfpSyncActions currentPath={status.dataDir} />
            </div>
          </div>
        </div>

        {/* Date Range Section */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date Range</div>
            <div className="text-xs text-slate-500">
              {startDate || endDate
                ? `Viewing sync data from ${startDate || "the beginning"} to ${endDate || "today"}.`
                : `${formatRangeName(range)} · ${formatRangeDescription(range, status.rangeFrom)}`}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden bg-white">
              {rangeOptions.map((option) => (
                <Link
                  key={option}
                  className={`px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 border-r border-slate-200 last:border-r-0 ${
                    range === option && !startDate && !endDate ? "bg-indigo-50 text-indigo-700" : "text-slate-600"
                  }`}
                  href={`/dashboard/vfp?range=${option}`}
                >
                  {formatRangeName(option)}
                </Link>
              ))}
            </div>

            <form className="flex items-center gap-2 flex-wrap" method="get">
              <div className="flex items-center gap-1">
                <input
                  className="border border-slate-200 rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-medium text-slate-600"
                  type="date"
                  name="startDate"
                  defaultValue={startDate || ""}
                  style={{ width: "125px" }}
                />
                <span className="text-slate-400 text-xs font-semibold">to</span>
                <input
                  className="border border-slate-200 rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-medium text-slate-600"
                  type="date"
                  name="endDate"
                  defaultValue={endDate || ""}
                  style={{ width: "125px" }}
                />
              </div>
              <div className="flex gap-1.5">
                <button className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors" type="submit">
                  Apply
                </button>
                <Link href="/dashboard/vfp" className="border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors">
                  Reset
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Warning Alerts */}
        {!status.dataDirExists && (
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <div className="text-xs sm:text-sm font-medium">
              VFP folder is not configured. Set <strong>VFP_DATA_DIR</strong> in <strong>.env</strong>, then restart the sync worker.
            </div>
          </div>
        )}

        {status.dataDirExists && !status.workerOnline && (
          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div className="text-xs sm:text-sm font-medium">
              The sync worker is offline. Run <strong>npm run vfp:sync</strong>. If it exits immediately, confirm <strong>VFP_DATA_DIR</strong> points to the real PNC/VFP folder.
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Server}
            label="Worker"
            value={status.workerOnline ? "Online" : "Offline"}
            hint={`${status.workerStatus}${
              status.workerLastSeenAt
                ? `, seen ${formatDate(status.workerLastSeenAt)}`
                : ""
            }`}
          />
          <StatCard
            icon={FolderOpen}
            label="Tracked Files"
            value={status.fileCount}
            hint={`${formatBytes(status.trackedBytes)} indexed`}
          />
          <StatCard
            icon={Database}
            label="DBF Tables"
            value={status.tableCount}
            hint={`${status.importedRows} row(s) imported`}
          />
          <StatCard
            icon={AlertTriangle}
            label="Conflicts"
            value={status.conflictCount}
            hint={`${status.failedCount} failed/locked table(s)`}
          />
        </div>

        {/* Info Panels (Source Folder / Queue / File Types) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 space-y-3">
            <div className="text-indigo-600 font-semibold text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <FolderOpen size={14} /> Sync Paths & Scope
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[9px] mb-0.5">Source Folder</span>
                <div className="p-2 border border-slate-100 rounded-xl font-mono text-slate-500 break-all bg-slate-50/30">
                  {status.sourceDir || "Not set (using Sync Folder directly)"}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[9px] mb-0.5">Sync Folder (Local)</span>
                <div className="p-2 border border-slate-100 rounded-xl font-mono text-slate-500 break-all bg-slate-50/30">
                  {status.dataDir || "Set VFP_DATA_DIR in .env"}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">VFP Engine</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.useVfpEngine ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {status.useVfpEngine ? "Enabled (vfp9.exe)" : "Disabled (Direct Copy)"}
                </span>
              </div>
              {status.useVfpEngine && (
                <div className="text-slate-400 text-[10px] leading-relaxed break-all">
                  Executable: <span className="font-mono">{status.vfpExePath}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Sync Scope</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
                  {status.enabledFiles && status.enabledFiles.length > 0
                    ? `${status.enabledFiles.length} table(s) selected`
                    : "Syncing all files"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 space-y-3">
            <div className="text-indigo-600 font-semibold text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Clock size={14} /> Queue Status
            </div>
            <div className="space-y-3 text-xs pt-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Pending Commands:</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">{status.pendingCommandCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Outbound Updates:</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">{status.pendingOutboundCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 space-y-3">
            <div className="text-indigo-600 font-semibold text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <FileText size={14} /> File Types Scanned
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(status.fileTypes).length === 0 ? (
                <span className="text-slate-400 text-xs font-medium">No files scanned yet</span>
              ) : (
                Object.entries(status.fileTypes).map(([extension, count]) => (
                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-1 rounded bg-slate-50 text-slate-700 border border-slate-200" key={extension}>
                    {extension || "no ext"} <span className="text-indigo-600 ms-1">({count})</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* DBF Tables Section */}
        <div className="space-y-1 pt-2">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="text-indigo-600" size={18} /> DBF Tables by Folder
          </h2>
          <p className="text-xs text-slate-500">Imported records are grouped by their directories. You can view or delete synced data below.</p>
        </div>

        {folderNames.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-6 text-center text-slate-400 text-xs font-semibold">
            No DBF tables have been scanned yet. Configure the sync folder above.
          </div>
        ) : (
          folderNames.map((folderName) => (
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden" key={folderName}>
              <div className="bg-slate-50/50 py-3.5 px-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderDot className="text-amber-500 shrink-0" size={18} />
                  <span className="font-bold text-slate-800 text-sm">{folderName}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
                    {folderGroups[folderName].length} table(s)
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/30">
                      <th className="py-2.5 px-4">Table Name</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-end">Rows</th>
                      <th className="py-2.5 px-4 text-end">Imported</th>
                      <th className="py-2.5 px-4">Last Sync</th>
                      <th className="py-2.5 px-4 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {folderGroups[folderName].map((state) => (
                      <tr key={String(state._id)} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-700">
                            {state.tableName?.includes("/")
                              ? state.tableName.substring(state.tableName.lastIndexOf("/") + 1)
                              : state.tableName}
                          </div>
                          {state.lastError && (
                            <div className="text-red-600 text-[11px] mt-1 font-medium leading-relaxed">
                              {state.lastError}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">{statusBadge(state.status)}</td>
                        <td className="py-3 px-4 text-end font-semibold text-slate-800">{state.lastRecordCount || 0}</td>
                        <td className="py-3 px-4 text-end font-semibold text-slate-800">{state.lastImportedCount || 0}</td>
                        <td className="py-3 px-4 text-slate-500 font-medium">{formatDate(state.lastSyncedAt)}</td>
                        <td className="py-3 px-4 text-end">
                          {state.tableName && (
                            <TableActions tableName={state.tableName} status={state.status || ""} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        {/* Recent Files & Logs (Two Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-white rounded-2xl border border-slate-200/70 flex flex-col shadow-sm">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <FileText className="text-indigo-600" size={17} />
                Recent File Sync
              </h3>
              <p className="text-xs text-slate-400 mt-1">Every file type is inventoried; eligible files are snapshotted.</p>
            </div>
            
            <div className="overflow-x-auto w-full" style={{ maxHeight: "380px", overflowY: "auto" }}>
              <table className="w-full text-left border-collapse min-w-[450px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/30 sticky top-0 z-10">
                    <th className="py-2.5 px-4">File</th>
                    <th className="py-2.5 px-4">Size</th>
                    <th className="py-2.5 px-4">Storage</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100">
                  {recentFiles.length === 0 ? (
                    <tr>
                      <td className="text-center text-slate-400 py-6 font-medium" colSpan={3}>
                        No files scanned yet.
                      </td>
                    </tr>
                  ) : (
                    groupedDateKeys.map((dateKey) => (
                      <Fragment key={dateKey}>
                        <tr className="bg-slate-50/50">
                          <td colSpan={3} className="font-bold text-slate-700 px-4 py-2 text-xs">
                            {dateKey}
                          </td>
                        </tr>
                        {groupedRecentFiles[dateKey].map((file) => (
                          <tr key={String(file._id)} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-700 break-all max-w-[200px]" title={file.relativePath}>{file.relativePath}</div>
                              <div className="text-slate-400 text-[10px] mt-0.5">
                                {file.extension || "no extension"} | {formatDate(file.lastSyncedAt)}
                              </div>
                              {file.lastError && (
                                <div className="text-red-600 text-[10px] mt-1 font-medium">
                                  {file.lastError}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-medium">{formatBytes(file.size)}</td>
                            <td className="py-3 px-4">{statusBadge(file.storageStatus)}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {status.fileCount > fileLimit && !showMore && (
              <div className="p-4 border-t border-slate-100 text-center">
                <Link
                  href={`/dashboard/vfp?${new URLSearchParams({
                    range,
                    startDate: startDate || "",
                    endDate: endDate || "",
                    showMore: "1",
                  }).toString()}`}
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-2xl border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  Show more files
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 flex flex-col shadow-sm">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Clock className="text-indigo-600" size={17} />
                Worker Logs
              </h3>
              <p className="text-xs text-slate-400 mt-1">Latest sync activity from the local worker.</p>
            </div>
            
            <div className="p-4 flex flex-col gap-2.5 overflow-y-auto" style={{ maxHeight: "380px" }}>
              {recentLogs.length === 0 ? (
                <div className="text-center text-slate-400 py-6 font-medium">No sync logs yet.</div>
              ) : (
                recentLogs.map((log) => (
                  <div 
                    className="flex align-start justify-between p-3 border border-slate-100 rounded-2xl bg-slate-50/20" 
                    key={String(log._id)}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="font-semibold text-slate-700 text-xs mb-1">
                        {log.action} {log.tableName ? `- ${log.tableName}` : ""}
                      </div>
                      <div className="text-slate-500 text-[11px] leading-relaxed break-words">
                        {log.message || log.error || "No message"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1.5">
                      {statusBadge(log.status)}
                      <span className="text-slate-400 text-[10px] font-medium">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>

      </div>
    </ProtectedPage>
  );
}
