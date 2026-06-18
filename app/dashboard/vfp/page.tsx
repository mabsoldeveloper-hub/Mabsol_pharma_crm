import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import {
  FaClock,
  FaDatabase,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaFileAlt,
  FaFolderOpen,
  FaServer,
} from "react-icons/fa";
import DashboardLayout from "@/components/DashboardLayout";
import VfpSyncActions from "@/components/VfpSyncActions";
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

export default async function VfpDashboardPage() {
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

  const status = await getVfpStatus();
  const tableRows = status.states as VfpStateRow[];
  const recentFiles = status.recentFiles as VfpFileRow[];
  const recentLogs = status.recentLogs as VfpLogRow[];
  const healthLabel = status.workerOnline ? "Live Sync Active" : "Worker Attention Needed";

  return (
    <DashboardLayout>
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
            <VfpSyncActions />
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

        <section className="vfp-section">
          <div className="vfp-section-header">
            <div>
              <div className="vfp-section-title">
                <FaDatabase />
                DBF Tables
              </div>
              <p>Imported records are stored in MongoDB and can be opened from each table.</p>
            </div>
          </div>
          <div className="vfp-table-wrap">
            <table className="table table-hover align-middle mb-0 vfp-table">
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Status</th>
                  <th className="text-end">Rows</th>
                  <th className="text-end">Imported</th>
                  <th>Last Sync</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td className="vfp-empty" colSpan={6}>
                      No DBF tables have been scanned yet.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((state) => (
                    <tr key={String(state._id)}>
                      <td>
                        <div className="fw-semibold">{state.tableName}</div>
                        {state.lastError && (
                          <div className="vfp-row-error">{state.lastError}</div>
                        )}
                      </td>
                      <td>{statusBadge(state.status)}</td>
                      <td className="text-end">{state.lastRecordCount || 0}</td>
                      <td className="text-end">{state.lastImportedCount || 0}</td>
                      <td>{formatDate(state.lastSyncedAt)}</td>
                      <td className="text-end">
                        {state.status === "success" && state.tableName ? (
                          <Link
                            className="btn btn-sm btn-outline-primary"
                            href={`/dashboard/vfp/${encodeURIComponent(state.tableName)}`}
                          >
                            View Data
                          </Link>
                        ) : (
                          <span className="text-muted small">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                    recentFiles.map((file) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
    </DashboardLayout>
  );
}
