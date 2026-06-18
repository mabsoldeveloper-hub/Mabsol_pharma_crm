import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { FaArrowLeft, FaDatabase, FaLayerGroup, FaTable } from "react-icons/fa";
import DashboardLayout from "@/components/DashboardLayout";
import { getVfpTableRows } from "@/lib/vfp/data";

type PageProps = {
  params: Promise<{ table: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function toSearchParams(value: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      params.set(key, entry);
    }
  }

  return params;
}

export default async function VfpTablePage({ params, searchParams }: PageProps) {
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

  const { table } = await params;
  const query = toSearchParams(await searchParams);
  const data = await getVfpTableRows(table, query);

  if (!data.table) {
    return (
      <DashboardLayout>
        <div className="vfp-page">
          <Link className="btn btn-outline-secondary mb-3" href="/dashboard/vfp">
            <FaArrowLeft className="me-2" />
            Back to VFP Sync
          </Link>
          <div className="vfp-alert vfp-alert-warning">
            This VFP table is not available yet. Start the sync worker and run a
            rescan.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const visibleColumns =
    data.table.columns.length > 0
      ? data.table.columns.slice(0, 16).map((column) => column.name)
      : Object.keys(data.rows[0] || {})
          .filter((key) => !key.startsWith("_"))
          .slice(0, 16);

  const previousPage = Math.max(data.page - 1, 1);
  const nextPage = Math.min(data.page + 1, Math.max(data.totalPages, 1));

  return (
    <DashboardLayout>
      <div className="vfp-page">
        <div className="vfp-data-toolbar">
          <div>
            <Link className="btn btn-outline-secondary btn-sm mb-3" href="/dashboard/vfp">
              <FaArrowLeft className="me-2" />
              Back to VFP Sync
            </Link>
            <div className="vfp-eyebrow">
              <FaTable />
              Synced DBF Data
            </div>
            <h1 className="h3 mb-1">{data.table.tableName}</h1>
            <p className="text-muted mb-0">
              Imported rows fetched from MongoDB collection{" "}
              <span className="fw-semibold">{data.table.targetCollection}</span>.
            </p>
          </div>
          <div className="text-md-end">
            <div className="fs-4 fw-semibold">{data.total}</div>
            <div className="text-muted small">synced row(s)</div>
          </div>
        </div>

        <section className="vfp-data-summary">
          <div>
            <div className="vfp-section-title">
              <FaDatabase />
              Collection
            </div>
            <strong>{data.table.targetCollection}</strong>
          </div>
          <div>
            <div className="vfp-section-title">
              <FaLayerGroup />
              Columns
            </div>
            <strong>{data.table.columns.length}</strong>
          </div>
          <div>
            <div className="vfp-section-title">
              <FaTable />
              Page
            </div>
            <strong>
              {data.page} / {Math.max(data.totalPages, 1)}
            </strong>
          </div>
        </section>

        <section className="vfp-section">
          <div className="vfp-section-header">
            <div>
              <div className="vfp-section-title">
                <FaTable />
                Rows
              </div>
              <p>Showing up to {data.limit} records per page.</p>
            </div>
          </div>
          <div className="vfp-table-wrap">
            <table className="table table-sm table-hover align-middle mb-0 vfp-table">
              <thead>
                <tr>
                  <th>#</th>
                  {visibleColumns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td className="vfp-empty" colSpan={visibleColumns.length + 1}>
                      No rows imported yet.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row, index) => (
                    <tr key={String(row._id || index)}>
                      <td className="text-muted">
                        {(data.page - 1) * data.limit + index + 1}
                      </td>
                      {visibleColumns.map((column) => (
                        <td className="vfp-cell" key={column} title={formatCell(row[column])}>
                          {formatCell(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-3">
          <div className="text-muted small">
            Page {data.page} of {Math.max(data.totalPages, 1)}
          </div>
          <div className="btn-group">
            <Link
              className={`btn btn-outline-primary ${data.page <= 1 ? "disabled" : ""}`}
              href={`/dashboard/vfp/${encodeURIComponent(
                data.table.tableName
              )}?page=${previousPage}`}
            >
              Previous
            </Link>
            <Link
              className={`btn btn-outline-primary ${
                data.page >= data.totalPages ? "disabled" : ""
              }`}
              href={`/dashboard/vfp/${encodeURIComponent(
                data.table.tableName
              )}?page=${nextPage}`}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
