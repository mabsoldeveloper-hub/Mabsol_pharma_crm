import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import ProtectedPage from "@/components/ProtectedPage";
import { Fragment } from "react";

export const dynamic = "force-dynamic";
import {
  FaClock,
  FaDatabase,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaFileAlt,
  FaFolderOpen,
  FaServer,
} from "react-icons/fa";
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
  
  let bgClass = "bg-secondary-subtle text-secondary border border-secondary-subtle";
  
  if (["success", "stored", "online", "live sync active"].includes(normalizedStatus)) {
    bgClass = "bg-success-subtle text-success border border-success-subtle";
  } else if (["running", "processing", "syncing"].includes(normalizedStatus)) {
    bgClass = "bg-info-subtle text-info border border-info-subtle";
  } else if (["locked", "too_large", "offline", "worker attention needed"].includes(normalizedStatus)) {
    bgClass = "bg-warning-subtle text-warning border border-warning-subtle";
  } else if (["failed", "error"].includes(normalizedStatus)) {
    bgClass = "bg-danger-subtle text-danger border border-danger-subtle";
  }

  return (
    <span className={`badge rounded-pill px-2.5 py-1.5 fw-semibold ${bgClass}`}>
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
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="vfp-stat">
      <div className="vfp-stat-icon">{icon}</div>
      <div>
        <div className="vfp-stat-label">{label}</div>
        <div className="vfp-stat-value">{value}</div>
        <div className="vfp-stat-hint">{hint}</div>
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

  try {
    jwt.verify(token, process.env.JWT_SECRET as string);
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
  const status = await getVfpStatus({ range, startDate, endDate, fileLimit });
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
      <div className="container-fluid p-0">
        
        {/* Page Header / Hero Section */}
        <div className="row g-3 mb-4">
          <div className="col-lg-8">
            <div className="card h-100 border-0 shadow-sm p-4 bg-white">
              <div className="d-flex align-items-center text-primary fw-bold mb-2 text-uppercase tracking-wider" style={{ fontSize: "0.8rem" }}>
                <FaExchangeAlt className="me-2" /> VFP Integration
              </div>
              <h1 className="h3 fw-bold mb-2 text-dark">PNC Data Sync Console</h1>
              <p className="text-secondary mb-0">
                Monitor the local VFP folder, DBF imports, file snapshots, and
                queued CRM-to-VFP updates from one place.
              </p>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card h-100 border-0 shadow-sm p-4 bg-white d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-semibold text-secondary">Worker Status</span>
                  {statusBadge(status.workerOnline ? "online" : "offline")}
                </div>
                <h4 className="fw-bold mb-1 text-dark">{healthLabel}</h4>
                <div className="text-muted small mb-3">
                  Last sync: {formatDate(status.lastSyncedAt)}
                </div>
              </div>
              <VfpSyncActions currentPath={status.dataDir} />
            </div>
          </div>
        </div>

        {/* Date Range Section */}
        <div className="card border-0 shadow-sm p-4 mb-4 bg-white">
          <div className="row align-items-center g-3">
            <div className="col-md-5">
              <div className="text-uppercase text-secondary fw-bold small mb-1" style={{ letterSpacing: "0.08em" }}>Date Range</div>
              <div className="text-muted small">
                {startDate || endDate
                  ? `Viewing sync data from ${startDate || "the beginning"} to ${endDate || "today"}.`
                  : `${formatRangeName(range)} · ${formatRangeDescription(range, status.rangeFrom)}`}
              </div>
            </div>
            <div className="col-md-7">
              <div className="d-flex flex-wrap align-items-center justify-content-md-end gap-3">
                <div className="btn-group btn-group-sm">
                  {rangeOptions.map((option) => (
                    <Link
                      key={option}
                      className={`btn ${
                        range === option && !startDate && !endDate ? "btn-primary" : "btn-outline-secondary"
                      }`}
                      href={`/dashboard/vfp?range=${option}`}
                    >
                      {formatRangeName(option)}
                    </Link>
                  ))}
                </div>

                <form className="d-flex align-items-center gap-2 flex-wrap" method="get">
                  <div className="d-flex align-items-center gap-1">
                    <input
                      className="form-control form-control-sm"
                      type="date"
                      name="startDate"
                      defaultValue={startDate || ""}
                      style={{ width: "130px" }}
                    />
                    <span className="text-muted small">to</span>
                    <input
                      className="form-control form-control-sm"
                      type="date"
                      name="endDate"
                      defaultValue={endDate || ""}
                      style={{ width: "130px" }}
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary btn-sm" type="submit">
                      Apply
                    </button>
                    <Link href="/dashboard/vfp" className="btn btn-outline-secondary btn-sm">
                      Reset
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Alerts */}
        {!status.dataDirExists && (
          <div className="alert alert-danger d-flex align-items-center gap-3 mb-4 shadow-sm border-0">
            <FaExclamationTriangle className="fs-4 flex-shrink-0" />
            <div>
              VFP folder is not configured. Set <strong>VFP_DATA_DIR</strong> in <strong>.env</strong>, then restart the sync worker.
            </div>
          </div>
        )}

        {status.dataDirExists && !status.workerOnline && (
          <div className="alert alert-warning d-flex align-items-center gap-3 mb-4 shadow-sm border-0">
            <FaExclamationTriangle className="fs-4 flex-shrink-0" />
            <div>
              The sync worker is offline. Run <strong>npm run vfp:sync</strong>. If it exits immediately, confirm <strong>VFP_DATA_DIR</strong> points to the real PNC/VFP folder.
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-lg-3">
            <StatCard
              icon={<FaServer />}
              label="Worker"
              value={status.workerOnline ? "Online" : "Offline"}
              hint={`${status.workerStatus}${
                status.workerLastSeenAt
                  ? `, seen ${formatDate(status.workerLastSeenAt)}`
                  : ""
              }`}
            />
          </div>
          <div className="col-sm-6 col-lg-3">
            <StatCard
              icon={<FaFolderOpen />}
              label="Tracked Files"
              value={status.fileCount}
              hint={`${formatBytes(status.trackedBytes)} indexed`}
            />
          </div>
          <div className="col-sm-6 col-lg-3">
            <StatCard
              icon={<FaDatabase />}
              label="DBF Tables"
              value={status.tableCount}
              hint={`${status.importedRows} row(s) imported`}
            />
          </div>
          <div className="col-sm-6 col-lg-3">
            <StatCard
              icon={<FaExclamationTriangle />}
              label="Conflicts"
              value={status.conflictCount}
              hint={`${status.failedCount} failed or locked table(s)`}
            />
          </div>
        </div>

        {/* Info Panels (Source Folder / Queue / File Types) */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100 bg-white p-3">
              <div className="text-primary fw-bold small mb-2 d-flex align-items-center gap-2">
                <FaFolderOpen /> Sync Paths & Selection
              </div>
              <div className="d-flex flex-column gap-2 small text-dark mt-1">
                <div>
                  <span className="text-secondary small fw-semibold">Source Folder:</span>
                  <div 
                    className="p-1.5 border rounded font-monospace small bg-light text-secondary text-break mt-0.5"
                    style={{ wordBreak: "break-all", minHeight: "28px" }}
                  >
                    {status.sourceDir || "Not set (using Sync Folder directly)"}
                  </div>
                </div>
                <div>
                  <span className="text-secondary small fw-semibold">Sync Folder (Local):</span>
                  <div 
                    className="p-1.5 border rounded font-monospace small bg-light text-secondary text-break mt-0.5"
                    style={{ wordBreak: "break-all", minHeight: "28px" }}
                  >
                    {status.dataDir || "Set VFP_DATA_DIR in .env"}
                  </div>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-1 border-top pt-2">
                  <span className="text-secondary small fw-semibold">VFP Engine:</span>
                  <span className={`badge border ${status.useVfpEngine ? "bg-success-subtle text-success" : "bg-light text-secondary"}`}>
                    {status.useVfpEngine ? "Enabled (vfp9.exe)" : "Disabled (Direct Copy)"}
                  </span>
                </div>
                {status.useVfpEngine && (
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                    Executable: <span className="font-monospace text-break">{status.vfpExePath}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between align-items-center mt-0.5">
                  <span className="text-secondary small fw-semibold">Sync Scope:</span>
                  <span className="badge bg-secondary-subtle text-secondary border">
                    {status.enabledFiles && status.enabledFiles.length > 0
                      ? `${status.enabledFiles.length} table(s) selected`
                      : "Syncing all files"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100 bg-white p-3">
              <div className="text-primary fw-bold small mb-2 d-flex align-items-center gap-2">
                <FaClock /> Queue Status
              </div>
              <div className="d-flex flex-column gap-1 mt-1 text-dark">
                <div className="d-flex justify-content-between">
                  <span className="text-secondary small">Pending Commands:</span>
                  <span className="badge bg-secondary-subtle text-secondary border">{status.pendingCommandCount}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-secondary small">Outbound Updates:</span>
                  <span className="badge bg-secondary-subtle text-secondary border">{status.pendingOutboundCount}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100 bg-white p-3">
              <div className="text-primary fw-bold small mb-2 d-flex align-items-center gap-2">
                <FaFileAlt /> File Types
              </div>
              <div className="d-flex flex-wrap gap-1.5 mt-1">
                {Object.entries(status.fileTypes).length === 0 ? (
                  <span className="text-muted small">No files scanned yet</span>
                ) : (
                  Object.entries(status.fileTypes).map(([extension, count]) => (
                    <span className="badge bg-light text-dark border px-2 py-1.5" key={extension}>
                      {extension || "no ext"} <span className="text-primary fw-bold">({count})</span>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* DBF Tables Section */}
        <div className="mb-4">
          <div className="d-flex align-items-center gap-2 mb-1">
            <h4 className="fw-bold mb-0 text-dark">
              <FaDatabase className="text-primary me-2" />
              DBF Tables by Folder
            </h4>
          </div>
          <p className="text-secondary small">Imported records are grouped by their directories. You can view or delete synced data below.</p>
        </div>

        {folderNames.length === 0 ? (
          <div className="card border-0 shadow-sm p-5 text-center text-secondary bg-white mb-4">
            No DBF tables have been scanned yet. Configure the sync folder above.
          </div>
        ) : (
          folderNames.map((folderName) => (
            <div className="card border-0 shadow-sm mb-4 bg-white overflow-hidden" key={folderName}>
              <div className="bg-light py-3 px-4 border-bottom d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <FaFolderOpen className="text-warning me-2 fs-5" />
                  <span className="fw-bold text-dark fs-6">{folderName}</span>
                  <span className="badge bg-success-subtle text-success ms-2 rounded-pill">
                    {folderGroups[folderName].length} table(s)
                  </span>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-uppercase font-monospace" style={{ fontSize: "0.75rem" }}>
                    <tr>
                      <th className="ps-4">Table Name</th>
                      <th>Status</th>
                      <th className="text-end">Rows</th>
                      <th className="text-end">Imported</th>
                      <th>Last Sync</th>
                      <th className="text-end pe-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {folderGroups[folderName].map((state) => (
                      <tr key={String(state._id)}>
                        <td className="ps-4">
                          <div className="fw-semibold text-dark">
                            {state.tableName?.includes("/")
                              ? state.tableName.substring(state.tableName.lastIndexOf("/") + 1)
                              : state.tableName}
                          </div>
                          {state.lastError && (
                            <div className="text-danger small mt-1" style={{ fontSize: "0.75rem" }}>
                              {state.lastError}
                            </div>
                          )}
                        </td>
                        <td>{statusBadge(state.status)}</td>
                        <td className="text-end fw-semibold text-dark">{state.lastRecordCount || 0}</td>
                        <td className="text-end fw-semibold text-dark">{state.lastImportedCount || 0}</td>
                        <td className="text-secondary">{formatDate(state.lastSyncedAt)}</td>
                        <td className="text-end pe-4">
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
        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm bg-white h-100">
              <div className="card-header bg-white border-0 pt-4 px-4">
                <h5 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                  <FaFileAlt className="text-primary" />
                  Recent File Sync
                </h5>
                <p className="text-secondary small mb-0">Every file type is inventoried; eligible files are snapshotted.</p>
              </div>
              <div className="card-body px-0 py-2">
                <div className="table-responsive animate-fade-in" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light font-monospace text-uppercase" style={{ fontSize: "0.7rem", position: "sticky", top: 0, zIndex: 1 }}>
                      <tr>
                        <th className="ps-4">File</th>
                        <th>Size</th>
                        <th className="pe-4">Storage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentFiles.length === 0 ? (
                        <tr>
                          <td className="text-center text-muted p-4" colSpan={3}>
                            No files have been scanned yet.
                          </td>
                        </tr>
                      ) : (
                        groupedDateKeys.map((dateKey) => (
                          <Fragment key={dateKey}>
                            <tr className="table-light">
                              <td colSpan={3} className="fw-bold text-dark ps-4 py-2" style={{ fontSize: "0.8rem" }}>
                                {dateKey}
                              </td>
                            </tr>
                            {groupedRecentFiles[dateKey].map((file) => (
                              <tr key={String(file._id)}>
                                <td className="ps-4">
                                  <div className="fw-semibold text-dark text-break" style={{ maxWidth: "250px" }}>{file.relativePath}</div>
                                  <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                                    {file.extension || "no extension"} | {formatDate(file.lastSyncedAt)}
                                  </div>
                                  {file.lastError && (
                                    <div className="text-danger small mt-1" style={{ fontSize: "0.75rem" }}>
                                      {file.lastError}
                                    </div>
                                  )}
                                </td>
                                <td className="text-secondary small">{formatBytes(file.size)}</td>
                                <td className="pe-4">{statusBadge(file.storageStatus)}</td>
                              </tr>
                            ))}
                          </Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {status.fileCount > fileLimit && !showMore && (
                <div className="card-footer bg-white border-0 text-center pb-4 pt-2">
                  <Link
                    href={`/dashboard/vfp?${new URLSearchParams({
                      range,
                      startDate: startDate || "",
                      endDate: endDate || "",
                      showMore: "1",
                    }).toString()}`}
                    className="btn btn-outline-primary btn-sm px-4"
                  >
                    Show more files
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card border-0 shadow-sm bg-white h-100">
              <div className="card-header bg-white border-0 pt-4 px-4">
                <h5 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                  <FaClock className="text-primary" />
                  Worker Logs
                </h5>
                <p className="text-secondary small mb-0">Latest sync activity from the local worker.</p>
              </div>
              <div className="card-body px-4 py-2" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {recentLogs.length === 0 ? (
                  <div className="text-center text-muted p-4">No sync logs yet.</div>
                ) : (
                  <div className="d-flex flex-column gap-2.5 pb-3">
                    {recentLogs.map((log) => (
                      <div 
                        className="d-flex align-items-start justify-content-between p-3 border rounded-3 bg-light" 
                        key={String(log._id)}
                      >
                        <div className="min-w-0 me-3">
                          <div className="fw-semibold text-dark mb-1">
                            {log.action} {log.tableName ? `- ${log.tableName}` : ""}
                          </div>
                          <div className="text-secondary small text-break" style={{ fontSize: "0.8rem" }}>
                            {log.message || log.error || "No message"}
                          </div>
                        </div>
                        <div className="d-flex flex-column align-items-end flex-shrink-0 gap-1.5">
                          {statusBadge(log.status)}
                          <span className="text-muted small" style={{ fontSize: "0.7rem" }}>
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
