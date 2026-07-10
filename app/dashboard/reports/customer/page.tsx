"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

interface CustomerRow {
    ORDNO: string;
    SCODE?: string;
    CODEP?: string;
    PARNAM: string;
    CITY?: string;
    AREA?: string;
    ROUT?: string;
    DSM?: string;
    STATUS?: string;
    BALANCE?: number;
    DUEDAYS?: number;
    PHONE1?: string;
    PHONE2?: string;
    GSTNO?: string;
    DLNO?: string;

    // Pend
    outstandingAmount?: number;
    pendingVouchers?: number;
    lastDueDate?: string | null;

    // GlLedger
    totalDebit?: number;
    totalCredit?: number;
    ledgerBalance?: number;
    lastTransactionDate?: string | null;

    // MaOrder
    maOrderBalance?: number;
    maOrderCount?: number;
    lastMaOrderDate?: string | null;
    maOrderForm?: string | null;
}

interface MasterReportData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    rows: CustomerRow[];
}

interface ApiResponse {
    success: boolean;
    data?: MasterReportData;
    message?: string;
}

const DEFAULT_FILTERS = {
    search: "",
    area: "",
    route: "",
    dsm: "",
    status: "",
    fromDate: "",
    toDate: "",
};

const LIMIT = 20;

const formatCurrency = (value?: number) =>
    (value ?? 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN");
};

export default function CustomerReportPage() {
    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
    const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS });

    const [page, setPage] = useState(1);

    const [rows, setRows] = useState<CustomerRow[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFilters((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const fetchReport = useCallback(
        async (targetPage: number, activeFilters: typeof DEFAULT_FILTERS) => {
            setLoading(true);
            setError("");

            try {
                const params = new URLSearchParams({
                    report: "master",
                    page: String(targetPage),
                    limit: String(LIMIT),
                });

                Object.entries(activeFilters).forEach(([key, value]) => {
                    if (value) params.set(key, value);
                });

                const res = await fetch(`/api/reports/customer?${params.toString()}`);
                const json: ApiResponse = await res.json();

                if (!res.ok || !json.success || !json.data) {
                    throw new Error(json.message || "Failed to load report");
                }

                setRows(json.data.rows || []);
                setTotal(json.data.total || 0);
                setTotalPages(json.data.totalPages || 1);
                setExpanded(new Set());
            } catch (err: any) {
                setError(err?.message || "Something went wrong");
                setRows([]);
                setTotal(0);
                setTotalPages(1);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchReport(page, appliedFilters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, appliedFilters]);

    const searchReport = () => {
        setPage(1);
        setAppliedFilters({ ...filters });
    };

    const resetFilters = () => {
        setFilters({ ...DEFAULT_FILTERS });
        setAppliedFilters({ ...DEFAULT_FILTERS });
        setPage(1);
    };

    const toggleExpand = (ordno: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(ordno)) {
                next.delete(ordno);
            } else {
                next.add(ordno);
            }
            return next;
        });
    };

    return (
        <div className="container-fluid py-3">
            <div className="card shadow-sm">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">Customer Report (Order + Pend + GlLedger + MaOrder)</h4>
                    <span className="badge bg-light text-dark">
                        {total} customer{total === 1 ? "" : "s"}
                    </span>
                </div>

                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">Search</label>
                            <input
                                type="text"
                                className="form-control"
                                name="search"
                                value={filters.search}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                placeholder="Customer Name / Code"
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Area</label>
                            <input
                                type="text"
                                className="form-control"
                                name="area"
                                value={filters.area}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Route</label>
                            <input
                                type="text"
                                className="form-control"
                                name="route"
                                value={filters.route}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">DSM</label>
                            <input
                                type="text"
                                className="form-control"
                                name="dsm"
                                value={filters.dsm}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                name="status"
                                value={filters.status}
                                onChange={handleChange}
                            >
                                <option value="">All</option>
                                <option value="Y">Active</option>
                                <option value="N">Inactive</option>
                            </select>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">From Date</label>
                            <input
                                type="date"
                                className="form-control"
                                name="fromDate"
                                value={filters.fromDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">To Date</label>
                            <input
                                type="date"
                                className="form-control"
                                name="toDate"
                                value={filters.toDate}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="col-md-3 d-flex align-items-end gap-2">
                            <button
                                className="btn btn-primary"
                                onClick={searchReport}
                                disabled={loading}
                            >
                                {loading ? "Loading..." : "Search"}
                            </button>

                            <button
                                className="btn btn-secondary"
                                onClick={resetFilters}
                                disabled={loading}
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <hr />

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    <div className="table-responsive">
                        <table className="table table-bordered table-hover align-middle">
                            <thead className="table-dark">
                                <tr>
                                    <th style={{ width: 40 }}></th>
                                    <th style={{ width: 40 }}>#</th>
                                    <th>Customer Code</th>
                                    <th>Customer Name</th>
                                    <th>City / Area / Route</th>
                                    <th>DSM</th>
                                    <th>Status</th>
                                    <th className="text-end">Master Balance</th>
                                    <th className="text-end">Outstanding (Pend)</th>
                                    <th className="text-end">Ledger Balance</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-4">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-4">
                                            No Data Found
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => {
                                        const isOpen = expanded.has(row.ORDNO);

                                        return (
                                            <Fragment key={row.ORDNO || idx}>
                                                <tr>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-outline-secondary"
                                                            onClick={() => toggleExpand(row.ORDNO)}
                                                            title="Show full details"
                                                        >
                                                            {isOpen ? "-" : "+"}
                                                        </button>
                                                    </td>
                                                    <td>{(page - 1) * LIMIT + idx + 1}</td>
                                                    <td>{row.ORDNO}</td>
                                                    <td>{row.PARNAM?.trim()}</td>
                                                    <td>
                                                        <div>{row.CITY || "-"}</div>
                                                        <small className="text-muted">
                                                            {row.AREA || "-"} / {row.ROUT || "-"}
                                                        </small>
                                                    </td>
                                                    <td>{row.DSM || "-"}</td>
                                                    <td>
                                                        <span
                                                            className={`badge ${row.STATUS === "Y"
                                                                    ? "bg-success"
                                                                    : "bg-secondary"
                                                                }`}
                                                        >
                                                            {row.STATUS === "Y" ? "Active" : "Inactive"}
                                                        </span>
                                                    </td>
                                                    <td className="text-end">
                                                        {formatCurrency(row.BALANCE)}
                                                    </td>
                                                    <td className="text-end">
                                                        <span
                                                            className={
                                                                (row.outstandingAmount ?? 0) > 0
                                                                    ? "text-danger fw-semibold"
                                                                    : ""
                                                            }
                                                        >
                                                            {formatCurrency(row.outstandingAmount)}
                                                        </span>
                                                    </td>
                                                    <td className="text-end">
                                                        {formatCurrency(row.ledgerBalance)}
                                                    </td>
                                                </tr>

                                                {isOpen && (
                                                    <tr key={`${row.ORDNO}-details`}>
                                                        <td></td>
                                                        <td colSpan={9} className="bg-light">
                                                            <div className="row g-3 py-2">
                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Order (Master)
                                                                    </h6>
                                                                    <div>Code: {row.CODEP || "-"}</div>
                                                                    <div>SCODE: {row.SCODE || "-"}</div>
                                                                    <div>GST No: {row.GSTNO || "-"}</div>
                                                                    <div>DL No: {row.DLNO || "-"}</div>
                                                                    <div>
                                                                        Phone: {row.PHONE1 || "-"}
                                                                        {row.PHONE2 ? `, ${row.PHONE2}` : ""}
                                                                    </div>
                                                                    <div>Due Days: {row.DUEDAYS ?? 0}</div>
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Pend (Outstanding)
                                                                    </h6>
                                                                    <div>
                                                                        Outstanding:{" "}
                                                                        {formatCurrency(row.outstandingAmount)}
                                                                    </div>
                                                                    <div>
                                                                        Pending Vouchers:{" "}
                                                                        {row.pendingVouchers ?? 0}
                                                                    </div>
                                                                    <div>
                                                                        Last Due Date:{" "}
                                                                        {formatDate(row.lastDueDate)}
                                                                    </div>
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        GlLedger (Transactions)
                                                                    </h6>
                                                                    <div>
                                                                        Total Debit:{" "}
                                                                        {formatCurrency(row.totalDebit)}
                                                                    </div>
                                                                    <div>
                                                                        Total Credit:{" "}
                                                                        {formatCurrency(row.totalCredit)}
                                                                    </div>
                                                                    <div>
                                                                        Ledger Balance:{" "}
                                                                        {formatCurrency(row.ledgerBalance)}
                                                                    </div>
                                                                    <div>
                                                                        Last Transaction:{" "}
                                                                        {formatDate(row.lastTransactionDate)}
                                                                    </div>
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        MaOrder (Allocation)
                                                                    </h6>
                                                                    <div>
                                                                        MaOrder Balance:{" "}
                                                                        {formatCurrency(row.maOrderBalance)}
                                                                    </div>
                                                                    <div>
                                                                        Records: {row.maOrderCount ?? 0}
                                                                    </div>
                                                                    <div>
                                                                        Form: {row.maOrderForm || "-"}
                                                                    </div>
                                                                    <div>
                                                                        Last Date:{" "}
                                                                        {formatDate(row.lastMaOrderDate)}
                                                                    </div>
                                                                    {(row.maOrderCount ?? 0) === 0 && (
                                                                        <small className="text-muted">
                                                                            No matching MaOrder record
                                                                            for this customer code.
                                                                        </small>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <span className="text-muted">
                                Page {page} of {totalPages}
                            </span>

                            <div className="btn-group">
                                <button
                                    className="btn btn-outline-primary"
                                    disabled={page <= 1 || loading}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    Previous
                                </button>
                                <button
                                    className="btn btn-outline-primary"
                                    disabled={page >= totalPages || loading}
                                    onClick={() =>
                                        setPage((p) => Math.min(totalPages, p + 1))
                                    }
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}