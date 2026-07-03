import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";

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
  const className =
    status === "success" || status === "stored" || status === "online"
      ? "vfp-pill-success"
      : status === "running" || status === "processing" || status === "syncing"
      ? "vfp-pill-info"
      : status === "locked" || status === "too_large" || status === "offline"
      ? "vfp-pill-warning"
      : status === "failed" || status === "error"
      ? "vfp-pill-danger"
      : "vfp-pill-muted";

  return <span className={`vfp-pill ${className}`}>{status || "unknown"}</span>;
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
    <div className="vfp-page">
      <section className="vfp-hero">
          <div className="vfp-hero-main">
            <div className="vfp-eyebrow">
              <FaExchangeAlt />
              VFP Integration
            </div>
            <h1>PNC Data Sync Console</h1>
            <p>
              Monitor the local VFP folder, DBF imports, file snapshots, and
              queued CRM-to-VFP updates from one place.
            </p>
          </div>
          <div className="vfp-hero-side">
            {statusBadge(status.workerOnline ? "online" : "offline")}
            <div className="vfp-hero-status">{healthLabel}</div>
            <div className="vfp-hero-meta">
              Last sync: {formatDate(status.lastSyncedAt)}
            </div>
            <VfpSyncActions currentPath={status.dataDir} />
          </div>
        </section>

        <section className="vfp-range-section">
          <div>
            <div className="vfp-range-label">Date range</div>
            <div className="vfp-range-description">
              {startDate || endDate
                ? `Viewing sync data from ${startDate || "the beginning"} to ${endDate || "today"}.`
                : `${formatRangeName(range)} · ${formatRangeDescription(range, status.rangeFrom)}`}
            </div>
          </div>

          <div className="vfp-range-controls">
            <div className="vfp-range-buttons">
              {rangeOptions.map((option) => (
                <Link
                  key={option}
                  className={`vfp-range-button btn btn-sm ${
                    range === option && !startDate && !endDate ? "btn-primary" : "btn-outline-secondary"
                  }`}
                  href={`/dashboard/vfp?range=${option}`}
                >
                  {formatRangeName(option)}
                </Link>
              ))}
            </div>

            <form className="vfp-range-form" method="get">
              <div className="vfp-range-fields">
                <label className="vfp-range-field">
                  From
                  <input
                    className="vfp-range-input form-control form-control-sm"
                    type="date"
                    name="startDate"
                    defaultValue={startDate || ""}
                  />
                </label>
                <label className="vfp-range-field">
                  To
                  <input
                    className="vfp-range-input form-control form-control-sm"
                    type="date"
                    name="endDate"
                    defaultValue={endDate || ""}
                  />
                </label>
              </div>
              <div className="vfp-range-actions">
                <button className="btn btn-primary btn-sm" type="submit">
                  Apply
                </button>
                <Link href="/dashboard/vfp" className="btn btn-outline-secondary btn-sm">
                  Reset
                </Link>
              </div>
            </form>
          </div>
        </section>

        {!status.dataDirExists && (
          <div className="vfp-alert vfp-alert-danger">
            <FaExclamationTriangle />
            <span>
              VFP folder is not configured. Set <strong>VFP_DATA_DIR</strong> in
              <strong> .env</strong>, then restart the sync worker.
            </span>
          </div>
        )}

        {status.dataDirExists && !status.workerOnline && (
          <div className="vfp-alert vfp-alert-warning">
            <FaExclamationTriangle />
            <span>
              The sync worker is offline. Run <strong>npm run vfp:sync</strong>.
              If it exits immediately, confirm <strong>VFP_DATA_DIR</strong>{" "}
              points to the real PNC/VFP folder.
            </span>
          </div>
        )}

        <section className="vfp-stats-grid">
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
          <StatCard
            icon={<FaFolderOpen />}
            label="Tracked Files"
            value={status.fileCount}
            hint={`${formatBytes(status.trackedBytes)} indexed`}
          />
          <StatCard
            icon={<FaDatabase />}
            label="DBF Tables"
            value={status.tableCount}
            hint={`${status.importedRows} row(s) imported`}
          />
          <StatCard
            icon={<FaExclamationTriangle />}
            label="Conflicts"
            value={status.conflictCount}
            hint={`${status.failedCount} failed or locked table(s)`}
          />
        </section>

        <section className="vfp-system-grid">
          <div className="vfp-info-panel">
            <div className="vfp-section-title">
              <FaFolderOpen />
              Source Folder
            </div>
            <div className="vfp-path">{status.dataDir || "Set VFP_DATA_DIR in .env"}</div>
          </div>
          <div className="vfp-info-panel">
            <div className="vfp-section-title">
              <FaClock />
              Queue
            </div>
            <div className="vfp-queue-line">
              <span>{status.pendingCommandCount} command(s)</span>
              <span>{status.pendingOutboundCount} outbound update(s)</span>
            </div>
          </div>
          <div className="vfp-info-panel vfp-file-types">
            <div className="vfp-section-title">
              <FaFileAlt />
              File Types
            </div>
            <div className="vfp-type-list">
              {Object.entries(status.fileTypes).length === 0 ? (
                <span className="text-muted">No files scanned yet</span>
              ) : (
                Object.entries(status.fileTypes).map(([extension, count]) => (
                  <span className="vfp-type-chip" key={extension}>
                    {extension || "no extension"} <strong>{count}</strong>
                  </span>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="vfp-section border-0 bg-transparent">
          <div className="vfp-section-header px-0">
            <div>
              <div className="vfp-section-title">
                <FaDatabase />
                DBF Tables by Folder
              </div>
              <p>Imported records are grouped by their directories. You can view or delete synced data below.</p>
            </div>
          </div>
          
          {folderNames.length === 0 ? (
            <div className="vfp-section p-4 text-center text-muted">
              No DBF tables have been scanned yet. Configure the sync folder above.
            </div>
          ) : (
            folderNames.map((folderName) => (
              <div className="vfp-section mb-4 shadow-sm" key={folderName}>
                <div 
                  className="bg-light py-3 px-4 border-bottom d-flex align-items-center justify-content-between rounded-top-2"
                  style={{ borderBottom: "1px solid #e3e8ef" }}
                >
                  <div className="d-flex align-items-center">
                    <FaFolderOpen className="text-warning me-2 fs-5" style={{ color: "#eab308" }} />
                    <span className="fw-bold text-dark fs-6">{folderName}</span>
                    <span 
                      className="badge ms-2 text-xs py-1 px-2 rounded-pill"
                      style={{ backgroundColor: "#e7f7f2", color: "#0f766e" }}
                    >
                      {folderGroups[folderName].length} table(s)
                    </span>
                  </div>
                </div>
                <div className="vfp-table-wrap">
                  <table className="table table-hover align-middle mb-0 vfp-table">
                    <thead>
                      <tr>
                        <th>Table Name</th>
                        <th>Status</th>
                        <th className="text-end">Rows</th>
                        <th className="text-end">Imported</th>
                        <th>Last Sync</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {folderGroups[folderName].map((state) => (
                        <tr key={String(state._id)}>
                          <td>
                            <div className="fw-semibold">
                              {state.tableName?.includes("/")
                                ? state.tableName.substring(state.tableName.lastIndexOf("/") + 1)
                                : state.tableName}
                            </div>
                            {state.lastError && (
                              <div className="vfp-row-error text-danger small mt-1">{state.lastError}</div>
                            )}
                          </td>
                          <td>{statusBadge(state.status)}</td>
                          <td className="text-end">{state.lastRecordCount || 0}</td>
                          <td className="text-end">{state.lastImportedCount || 0}</td>
                          <td>{formatDate(state.lastSyncedAt)}</td>
                          <td className="text-end">
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
        </section>

        <section className="vfp-two-column">
          <div className="vfp-section">
            <div className="vfp-section-header">
              <div>
                <div className="vfp-section-title">
                  <FaFileAlt />
                  Recent File Sync
                </div>
                <p>Every file type is inventoried; eligible files are snapshotted.</p>
              </div>
            </div>
            <div className="vfp-table-wrap">
              <table className="table table-hover align-middle mb-0 vfp-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Size</th>
                    <th>Storage</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFiles.length === 0 ? (
                    <tr>
                      <td className="vfp-empty" colSpan={3}>
                        No files have been scanned yet.
                      </td>
                    </tr>
                  ) : (
                    groupedDateKeys.map((dateKey) => (
                      <>
                        <tr className="vfp-file-group-row" key={`${dateKey}-heading`}>
                          <td colSpan={3} className="vfp-file-group-heading">
                            {dateKey}
                          </td>
                        </tr>
                        {groupedRecentFiles[dateKey].map((file) => (
                          <tr key={String(file._id)}>
                            <td>
                              <div className="vfp-file-name">{file.relativePath}</div>
                              <div className="vfp-file-meta">
                                {file.extension || "no extension"} |{" "}
                                {formatDate(file.lastSyncedAt)}
                              </div>
                              {file.lastError && (
                                <div className="vfp-row-error">{file.lastError}</div>
                              )}
                            </td>
                            <td>{formatBytes(file.size)}</td>
                            <td>{statusBadge(file.storageStatus)}</td>
                          </tr>
                        ))}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {status.fileCount > fileLimit && !showMore && (
              <div className="mt-3 d-flex justify-content-center">
                <Link
                  href={`/dashboard/vfp?${new URLSearchParams({
                    range,
                    startDate: startDate || "",
                    endDate: endDate || "",
                    showMore: "1",
                  }).toString()}`}
                  className="btn btn-outline-primary btn-sm"
                >
                  Show more files
                </Link>
              </div>
            )}
          </div>

          <div className="vfp-section">
            <div className="vfp-section-header">
              <div>
                <div className="vfp-section-title">
                  <FaClock />
                  Worker Logs
                </div>
                <p>Latest sync activity from the local worker.</p>
              </div>
            </div>
            <div className="vfp-log-list">
              {recentLogs.length === 0 ? (
                <div className="vfp-empty">No sync logs yet.</div>
              ) : (
                recentLogs.map((log) => (
                  <div className="vfp-log-item" key={String(log._id)}>
                    <div>
                      <div className="vfp-log-title">
                        {log.action} {log.tableName ? `- ${log.tableName}` : ""}
                      </div>
                      <div className="vfp-log-message">
                        {log.message || log.error || "No message"}
                      </div>
                    </div>
                    <div className="vfp-log-side">
                      {statusBadge(log.status)}
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
  );
}
