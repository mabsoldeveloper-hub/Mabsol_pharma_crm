"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

interface RegisterRow {
    VOUCHER: number;
    VCN: string;
    DATE: string;
    TYPE?: string;
    CODEP: string;
    PARNAM: string;
    CITY?: string | null;
    GSTNO?: string | null;
    DLNO?: string | null;
    itemCount: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
    invoiceValue: number;
    saleType?: string | null;
    transport?: string | null;
    lrNo?: string | null;
}

interface HsnRow {
    productCode: string | number;
    productName: string;
    hsnCode: string;
    unit: string;
    cgstRate: number | null;
    igstRate: number | null;
    qty: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
}

interface LedgerRow {
    _id: string;
    VOUCHER: number;
    DATE: string;
    CODE1: string;
    PARNAM: string;
    GSTNO?: string | null;
    DEBIT: number;
    CREDIT: number;
    TYPE?: string;
    invoiceValue: number | null;
    invoiceTax: number | null;
}

interface Summary {
    invoiceCount: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
    invoiceValue: number;
}

type ReportType = "register" | "hsn" | "ledger";

const DEFAULT_FILTERS = {
    search: "",
    gstNo: "",
    voucher: "",
    hsn: "",
    city: "",
    type: "",
    dateFrom: "",
    dateTo: "",
};

const LIMIT = 20;

const formatCurrency = (value?: number | null) =>
    (value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN");
};

export default function GstReportPage() {
    const [reportType, setReportType] = useState<ReportType>("register");

    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
    const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS });
    const [page, setPage] = useState(1);

    const [rows, setRows] = useState<any[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const fetchReport = useCallback(
        async (targetPage: number, activeFilters: typeof DEFAULT_FILTERS, type: ReportType) => {
            setLoading(true);
            setError("");

            try {
                const params = new URLSearchParams({
                    report: type,
                    page: String(targetPage),
                    limit: String(LIMIT),
                });

                Object.entries(activeFilters).forEach(([key, value]) => {
                    if (value) params.set(key, value);
                });

                const res = await fetch(`/api/reports/gst?${params.toString()}`);
                const json = await res.json();

                if (!res.ok || !json.success || !json.data) {
                    throw new Error(json.message || "Failed to load report");
                }

                setRows(json.data.rows || []);
                setTotal(json.data.total || 0);
                setTotalPages(json.data.totalPages || 1);
                setSummary(json.data.summary || null);
                setExpanded(new Set());
            } catch (err: any) {
                setError(err?.message || "Something went wrong");
                setRows([]);
                setTotal(0);
                setTotalPages(1);
                setSummary(null);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        fetchReport(page, appliedFilters, reportType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, appliedFilters, reportType]);

    const searchReport = () => {
        setPage(1);
        setAppliedFilters({ ...filters });
    };

    const resetFilters = () => {
        setFilters({ ...DEFAULT_FILTERS });
        setAppliedFilters({ ...DEFAULT_FILTERS });
        setPage(1);
    };

    const switchReport = (type: ReportType) => {
        setReportType(type);
        setPage(1);
        setFilters({ ...DEFAULT_FILTERS });
        setAppliedFilters({ ...DEFAULT_FILTERS });
    };

    const toggleExpand = (key: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    return (
        <div className="container-fluid py-3">
            <div className="card shadow-sm">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">GST Report</h4>
                    <span className="badge bg-light text-dark">
                        {total} record{total === 1 ? "" : "s"}
                    </span>
                </div>

                <div className="card-body">
                    <ul className="nav nav-tabs mb-3">
                        {(["register", "hsn", "ledger"] as ReportType[]).map((t) => (
                            <li className="nav-item" key={t}>
                                <button
                                    type="button"
                                    className={`nav-link ${reportType === t ? "active" : ""}`}
                                    onClick={() => switchReport(t)}
                                >
                                    {t === "register" && "GST Register"}
                                    {t === "hsn" && "HSN Summary"}
                                    {t === "ledger" && "GST Ledger"}
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className="row g-3">
                        <div className="col-md-2">
                            <label className="form-label">From Date</label>
                            <input type="date" className="form-control" name="dateFrom" value={filters.dateFrom} onChange={handleChange} />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">To Date</label>
                            <input type="date" className="form-control" name="dateTo" value={filters.dateTo} onChange={handleChange} />
                        </div>

                        {reportType !== "hsn" && (
                            <div className="col-md-3">
                                <label className="form-label">Party / GSTIN / Voucher</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="search"
                                    value={filters.search}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                    placeholder="Search party name / code"
                                />
                            </div>
                        )}

                        {reportType === "hsn" && (
                            <div className="col-md-3">
                                <label className="form-label">HSN / Product Code</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="hsn"
                                    value={filters.hsn}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                />
                            </div>
                        )}

                        {reportType === "register" && (
                            <div className="col-md-2">
                                <label className="form-label">Type</label>
                                <select className="form-select" name="type" value={filters.type} onChange={handleChange}>
                                    <option value="">All</option>
                                    <option value="S">Sale</option>
                                    <option value="P">Purchase</option>
                                </select>
                            </div>
                        )}

                        <div className="col-md-3 d-flex align-items-end gap-2">
                            <button type="button" className="btn btn-primary" onClick={searchReport} disabled={loading}>
                                {loading ? "Loading..." : "Search"}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={resetFilters} disabled={loading}>
                                Reset
                            </button>
                        </div>
                    </div>

                    <hr />

                    {error && <div className="alert alert-danger">{error}</div>}

                    {reportType === "register" && (
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover align-middle">
                                <thead className="table-dark">
                                    <tr>
                                        <th style={{ width: 40 }}></th>
                                        <th>Voucher</th>
                                        <th>Date</th>
                                        <th>Party</th>
                                        <th>GSTIN</th>
                                        <th className="text-end">Taxable Amt</th>
                                        <th className="text-end">CGST</th>
                                        <th className="text-end">SGST</th>
                                        <th className="text-end">IGST</th>
                                        <th className="text-end">Invoice Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={10} className="text-center py-4">Loading...</td></tr>
                                    ) : rows.length === 0 ? (
                                        <tr><td colSpan={10} className="text-center py-4">No Data Found</td></tr>
                                    ) : (
                                        (rows as RegisterRow[]).map((row, idx) => {
                                            const rowKey = `reg-${row.VOUCHER ?? "novoucher"}-${row.VCN ?? "novcn"}-${idx}`;
                                            const isOpen = expanded.has(rowKey);

                                            return (
                                                <Fragment key={rowKey}>
                                                    <tr>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-secondary"
                                                                onClick={() => toggleExpand(rowKey)}
                                                            >
                                                                {isOpen ? "-" : "+"}
                                                            </button>
                                                        </td>
                                                        <td>{row.VCN || row.VOUCHER}</td>
                                                        <td>{formatDate(row.DATE)}</td>
                                                        <td>{row.PARNAM}</td>
                                                        <td>{row.GSTNO || "-"}</td>
                                                        <td className="text-end">{formatCurrency(row.taxableAmount)}</td>
                                                        <td className="text-end">{formatCurrency(row.cgstAmount)}</td>
                                                        <td className="text-end">{formatCurrency(row.sgstAmount)}</td>
                                                        <td className="text-end">{formatCurrency(row.igstAmount)}</td>
                                                        <td className="text-end fw-semibold">{formatCurrency(row.invoiceValue)}</td>
                                                    </tr>
                                                    {isOpen && (
                                                        <tr>
                                                            <td></td>
                                                            <td colSpan={9} className="bg-light">
                                                                <div className="row g-3 py-2">
                                                                    <div className="col-md-3">
                                                                        <div>City: {row.CITY || "-"}</div>
                                                                        <div>DL No: {row.DLNO || "-"}</div>
                                                                        <div>Type: {row.TYPE || "-"}</div>
                                                                    </div>
                                                                    <div className="col-md-3">
                                                                        <div>Items: {row.itemCount}</div>
                                                                        <div>Sale Type: {row.saleType || "-"}</div>
                                                                        <div>Total Tax: {formatCurrency(row.totalTax)}</div>
                                                                    </div>
                                                                    <div className="col-md-3">
                                                                        <div>Transport: {row.transport || "-"}</div>
                                                                        <div>LR No: {row.lrNo || "-"}</div>
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
                                {summary && (
                                    <tfoot>
                                        <tr className="table-secondary fw-semibold">
                                            <td colSpan={5} className="text-end">
                                                Total ({summary.invoiceCount} invoices)
                                            </td>
                                            <td className="text-end">{formatCurrency(summary.taxableAmount)}</td>
                                            <td className="text-end">{formatCurrency(summary.cgstAmount)}</td>
                                            <td className="text-end">{formatCurrency(summary.sgstAmount)}</td>
                                            <td className="text-end">{formatCurrency(summary.igstAmount)}</td>
                                            <td className="text-end">{formatCurrency(summary.invoiceValue)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}

                    {reportType === "hsn" && (
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover align-middle">
                                <thead className="table-dark">
                                    <tr>
                                        <th>HSN</th>
                                        <th>Product</th>
                                        <th>Unit</th>
                                        <th className="text-end">Qty</th>
                                        <th className="text-end">Taxable Amt</th>
                                        <th className="text-end">CGST</th>
                                        <th className="text-end">SGST</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
                                    ) : rows.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-4">No Data Found</td></tr>
                                    ) : (
                                        (rows as HsnRow[]).map((row, idx) => (
                                            <tr key={`hsn-${row.productCode ?? "nocode"}-${idx}`}>
                                                <td>{row.hsnCode}</td>
                                                <td>{row.productName}</td>
                                                <td>{row.unit}</td>
                                                <td className="text-end">{row.qty}</td>
                                                <td className="text-end">{formatCurrency(row.taxableAmount)}</td>
                                                <td className="text-end">{formatCurrency(row.cgstAmount)}</td>
                                                <td className="text-end">{formatCurrency(row.sgstAmount)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {reportType === "ledger" && (
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover align-middle">
                                <thead className="table-dark">
                                    <tr>
                                        <th>Voucher</th>
                                        <th>Date</th>
                                        <th>Party</th>
                                        <th className="text-end">Debit</th>
                                        <th className="text-end">Credit</th>
                                        <th className="text-end">Invoice Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
                                    ) : rows.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-4">No Data Found</td></tr>
                                    ) : (
                                        (rows as LedgerRow[]).map((row, idx) => (
                                            <tr key={`ledger-${row._id ?? row.VOUCHER ?? "novoucher"}-${idx}`}>
                                                <td>{row.VOUCHER}</td>
                                                <td>{formatDate(row.DATE)}</td>
                                                <td>{row.PARNAM}</td>
                                                <td className="text-end">{formatCurrency(row.DEBIT)}</td>
                                                <td className="text-end">{formatCurrency(row.CREDIT)}</td>
                                                <td className="text-end">{formatCurrency(row.invoiceValue)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <span className="text-muted">Page {page} of {totalPages}</span>
                            <div className="btn-group">
                                <button type="button" className="btn btn-outline-primary" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                                    Previous
                                </button>
                                <button type="button" className="btn btn-outline-primary" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
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