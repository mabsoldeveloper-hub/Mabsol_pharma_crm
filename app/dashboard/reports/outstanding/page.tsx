"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

interface LedgerDetail {
    CODE?: string | null;
    BOOK?: string | null;
    CD?: string | null;
    CREDIT?: number;
    DEBIT?: number;
    DATE?: string | null;
    REMARK1?: string | null;
    REMARK2?: string | null;
}

interface InvoiceDetail {
    VOUCHER?: number;
    VCN?: string | null;
    DATE?: string | null;
    DUEDAYS?: number;
    FINAL?: number;
    GODWON?: string | null;
    TRANSPORT?: string | null;
    LRNO?: string | null;
    LRDA?: string | null;
    FORM?: string | null;
    CHALLAN?: string | null;
    ACCOUNT?: string | null;
    CODEP?: string | null;
}

interface ItemDetail {
    BATCH?: string | null;
    QTY?: number;
    RATE?: number;
    MRP?: number;
    EXP?: string | null;
    MFD?: string | null;
    DSM?: string | null;
    COMPANY?: string | null;
    AMMMOUNT?: number;
}

interface OutstandingRow {
    id: string;
    ORD: string;

    PARNAM?: string | null;
    MAILNAM?: string | null;
    CITY?: string | null;
    CODEP?: string | null;
    SCODE?: string | null;
    STATUS?: string | null;
    PHONE1?: string | null;
    PHONE2?: string | null;
    GSTNO?: string | null;
    DLNO?: string | null;

    AREA?: string | null;
    ROUT?: string | null;
    DSM?: string | null;
    ASM?: string | null;
    RSM?: string | null;

    VOUCHER?: number;
    SVOUCHER?: number;
    ADJVOUCHER?: number;
    ADVANCE?: number | null;
    VCN?: string | null;
    TYPE?: string | null;
    MR?: string | null;
    DDATE?: string | null;
    DUEDAYS?: number;
    FINAL?: number;
    REMARK?: string | null;

    ledger?: LedgerDetail | null;
    invoice?: InvoiceDetail | null;
    items?: ItemDetail[];
}

interface OutstandingReportData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    totalOutstanding: number;
    rows: OutstandingRow[];
}

interface ApiResponse {
    success: boolean;
    data?: OutstandingReportData;
    message?: string;
}

const DEFAULT_FILTERS = {
    search: "",
    city: "",
    status: "",

    area: "",
    route: "",
    dsm: "",
    asm: "",
    rsm: "",

    type: "",
    mr: "",
    voucher: "",
    vcn: "",
    dueFrom: "",
    dueTo: "",
    minAmount: "",
    maxAmount: "",
    onlyOutstanding: "Y",

    book: "",
    cd: "",
    ledgerCode: "",

    godown: "",
    transport: "",
    form: "",
    challan: "",
    account: "",

    batch: "",
    company: "",
};

type FilterState = typeof DEFAULT_FILTERS;

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

export default function OutstandingReportPage() {
    const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
    const [appliedFilters, setAppliedFilters] = useState<FilterState>({
        ...DEFAULT_FILTERS,
    });

    const [page, setPage] = useState(1);

    const [rows, setRows] = useState<OutstandingRow[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOutstanding, setTotalOutstanding] = useState(0);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [showMoreFilters, setShowMoreFilters] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const fetchReport = useCallback(
        async (targetPage: number, activeFilters: FilterState) => {
            setLoading(true);
            setError("");

            try {
                const params = new URLSearchParams({
                    page: String(targetPage),
                    limit: String(LIMIT),
                });

                Object.entries(activeFilters).forEach(([key, value]) => {
                    if (value) params.set(key, value);
                });

                const res = await fetch(`/api/reports/outstanding?${params.toString()}`);
                const json: ApiResponse = await res.json();

                if (!res.ok || !json.success || !json.data) {
                    throw new Error(json.message || "Failed to load report");
                }

                setRows(json.data.rows || []);
                setTotal(json.data.total || 0);
                setTotalPages(json.data.totalPages || 1);
                setTotalOutstanding(json.data.totalOutstanding || 0);
                setExpanded(new Set());
            } catch (err: any) {
                setError(err?.message || "Something went wrong");
                setRows([]);
                setTotal(0);
                setTotalPages(1);
                setTotalOutstanding(0);
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

    const toggleExpand = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="container-fluid py-3">
            <div className="card shadow-sm">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h4 className="mb-0">Outstanding Report</h4>
                    <div className="d-flex gap-2">
                        <span className="badge bg-light text-dark">
                            {total} voucher{total === 1 ? "" : "s"}
                        </span>
                        <span className="badge bg-warning text-dark">
                            Total: {formatCurrency(totalOutstanding)}
                        </span>
                    </div>
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
                                placeholder="Customer Name / Code / GST"
                            />
                        </div>

                        <div className="col-md-2">
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

                        <div className="col-md-2">
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

                        <div className="col-md-2">
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
                            <label className="form-label">City</label>
                            <input
                                type="text"
                                className="form-control"
                                name="city"
                                value={filters.city}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">ASM</label>
                            <input
                                type="text"
                                className="form-control"
                                name="asm"
                                value={filters.asm}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">RSM</label>
                            <input
                                type="text"
                                className="form-control"
                                name="rsm"
                                value={filters.rsm}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-2">
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

                        <div className="col-md-2">
                            <label className="form-label">Type</label>
                            <input
                                type="text"
                                className="form-control"
                                name="type"
                                value={filters.type}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                placeholder="A / S / C..."
                            />
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">MR</label>
                            <input
                                type="text"
                                className="form-control"
                                name="mr"
                                value={filters.mr}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Due From</label>
                            <input
                                type="date"
                                className="form-control"
                                name="dueFrom"
                                value={filters.dueFrom}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Due To</label>
                            <input
                                type="date"
                                className="form-control"
                                name="dueTo"
                                value={filters.dueTo}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Min Amount</label>
                            <input
                                type="number"
                                className="form-control"
                                name="minAmount"
                                value={filters.minAmount}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">Max Amount</label>
                            <input
                                type="number"
                                className="form-control"
                                name="maxAmount"
                                value={filters.maxAmount}
                                onChange={handleChange}
                                onKeyDown={(e) => e.key === "Enter" && searchReport()}
                            />
                        </div>

                        <div className="col-md-2 d-flex align-items-end">
                            <div className="form-check">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="onlyOutstanding"
                                    checked={filters.onlyOutstanding === "Y"}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            onlyOutstanding: e.target.checked ? "Y" : "",
                                        }))
                                    }
                                />
                                <label className="form-check-label" htmlFor="onlyOutstanding">
                                    Only Non-Zero
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-dark"
                            onClick={() => setShowMoreFilters((s) => !s)}
                        >
                            {showMoreFilters ? "Hide" : "More"} Filters (Voucher / Ledger / Invoice / Batch)
                        </button>
                    </div>

                    {showMoreFilters && (
                        <div className="row g-3 mt-1 p-3 bg-light rounded">
                            <div className="col-12">
                                <h6 className="text-muted mb-2">Voucher (Pend)</h6>
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">Voucher No</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="voucher"
                                    value={filters.voucher}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                    placeholder="matches VOUCHER/SVOUCHER/ADJVOUCHER"
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">VCN</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="vcn"
                                    value={filters.vcn}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                />
                            </div>

                            <div className="col-12 mt-3">
                                <h6 className="text-muted mb-2">Ledger (GlLedger)</h6>
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">Book</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="book"
                                    value={filters.book}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">C/D</label>
                                <select
                                    className="form-select"
                                    name="cd"
                                    value={filters.cd}
                                    onChange={handleChange}
                                >
                                    <option value="">All</option>
                                    <option value="C">Credit</option>
                                    <option value="D">Debit</option>
                                </select>
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">Ledger Code</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="ledgerCode"
                                    value={filters.ledgerCode}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                />
                            </div>

                            <div className="col-12 mt-3">
                                <h6 className="text-muted mb-2">Invoice (SalesMdis)</h6>
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">Godown</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="godown"
                                    value={filters.godown}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Transport</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="transport"
                                    value={filters.transport}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">Form</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="form"
                                    value={filters.form}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">Challan</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="challan"
                                    value={filters.challan}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label">Account</label>
                                <select
                                    className="form-select"
                                    name="account"
                                    value={filters.account}
                                    onChange={handleChange}
                                >
                                    <option value="">All</option>
                                    <option value="Y">Y</option>
                                    <option value="N">N</option>
                                </select>
                            </div>

                            <div className="col-12 mt-3">
                                <h6 className="text-muted mb-2">Item / Batch (SalesDis)</h6>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Batch</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="batch"
                                    value={filters.batch}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Company</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="company"
                                    value={filters.company}
                                    onChange={handleChange}
                                    onKeyDown={(e) => e.key === "Enter" && searchReport()}
                                />
                            </div>
                        </div>
                    )}

                    <div className="d-flex gap-2 mt-3">
                        <button className="btn btn-primary" onClick={searchReport} disabled={loading}>
                            {loading ? "Loading..." : "Search"}
                        </button>

                        <button className="btn btn-secondary" onClick={resetFilters} disabled={loading}>
                            Reset
                        </button>
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
                                    <th>City</th>
                                    <th>Area</th>
                                    <th>Route</th>
                                    <th>DSM</th>
                                    <th>Type</th>
                                    <th>Voucher</th>
                                    <th>VCN</th>
                                    <th>MR</th>
                                    <th>Due Date</th>
                                    <th>Due Days</th>
                                    <th className="text-end">Amount</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={15} className="text-center py-4">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={15} className="text-center py-4">
                                            No Data Found
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => {
                                        const isOpen = expanded.has(row.id);
                                        const hasDetail =
                                            row.ledger ||
                                            row.invoice ||
                                            (row.items && row.items.length > 0) ||
                                            row.GSTNO ||
                                            row.DLNO ||
                                            row.PHONE1 ||
                                            row.ASM ||
                                            row.RSM;

                                        return (
                                            <Fragment key={row.id}>
                                                <tr>
                                                    <td>
                                                        {hasDetail && (
                                                            <button
                                                                className="btn btn-sm btn-outline-secondary"
                                                                onClick={() => toggleExpand(row.id)}
                                                                title="Show full details"
                                                            >
                                                                {isOpen ? "-" : "+"}
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td>{(page - 1) * LIMIT + idx + 1}</td>
                                                    <td>{row.ORD}</td>
                                                    <td>{row.PARNAM || row.MAILNAM || "-"}</td>
                                                    <td>{row.CITY || "-"}</td>
                                                    <td>{row.AREA || "-"}</td>
                                                    <td>{row.ROUT || "-"}</td>
                                                    <td>{row.DSM || "-"}</td>
                                                    <td>{row.TYPE || "-"}</td>
                                                    <td>{row.VOUCHER || "-"}</td>
                                                    <td>{row.VCN || "-"}</td>
                                                    <td>{row.MR || "-"}</td>
                                                    <td>{formatDate(row.DDATE)}</td>
                                                    <td>{row.DUEDAYS ?? 0}</td>
                                                    <td className="text-end">
                                                        <span
                                                            className={
                                                                (row.FINAL ?? 0) < 0
                                                                    ? "text-danger fw-semibold"
                                                                    : "fw-semibold"
                                                            }
                                                        >
                                                            {formatCurrency(row.FINAL)}
                                                        </span>
                                                    </td>
                                                </tr>

                                                {isOpen && (
                                                    <tr key={`${row.id}-detail`}>
                                                        <td></td>
                                                        <td colSpan={14} className="bg-light">
                                                            <div className="row g-3 py-2">
                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Customer (Order)
                                                                    </h6>
                                                                    <div>Code: {row.CODEP || "-"}</div>
                                                                    <div>SCODE: {row.SCODE || "-"}</div>
                                                                    <div>GST No: {row.GSTNO || "-"}</div>
                                                                    <div>DL No: {row.DLNO || "-"}</div>
                                                                    <div>
                                                                        Phone: {row.PHONE1 || "-"}
                                                                        {row.PHONE2 ? `, ${row.PHONE2}` : ""}
                                                                    </div>
                                                                    <div>ASM: {row.ASM || "-"}</div>
                                                                    <div>RSM: {row.RSM || "-"}</div>
                                                                    <div>
                                                                        Advance: {row.ADVANCE ?? "-"}
                                                                    </div>
                                                                    <div>Remark: {row.REMARK || "-"}</div>
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Ledger (GlLedger)
                                                                    </h6>
                                                                    {row.ledger ? (
                                                                        <>
                                                                            <div>
                                                                                Code: {row.ledger.CODE || "-"}
                                                                            </div>
                                                                            <div>
                                                                                Book: {row.ledger.BOOK || "-"}
                                                                            </div>
                                                                            <div>
                                                                                C/D: {row.ledger.CD || "-"}
                                                                            </div>
                                                                            <div>
                                                                                Credit:{" "}
                                                                                {formatCurrency(row.ledger.CREDIT)}
                                                                            </div>
                                                                            <div>
                                                                                Debit:{" "}
                                                                                {formatCurrency(row.ledger.DEBIT)}
                                                                            </div>
                                                                            <div>
                                                                                Date:{" "}
                                                                                {formatDate(row.ledger.DATE)}
                                                                            </div>
                                                                            {row.ledger.REMARK1 && (
                                                                                <div className="small text-muted">
                                                                                    {row.ledger.REMARK1}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <small className="text-muted">
                                                                            No matching ledger record.
                                                                        </small>
                                                                    )}
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Invoice (SalesMdis)
                                                                    </h6>
                                                                    {row.invoice ? (
                                                                        <>
                                                                            <div>
                                                                                Voucher: {row.invoice.VOUCHER || "-"}
                                                                            </div>
                                                                            <div>VCN: {row.invoice.VCN || "-"}</div>
                                                                            <div>
                                                                                Date: {formatDate(row.invoice.DATE)}
                                                                            </div>
                                                                            <div>
                                                                                Amount:{" "}
                                                                                {formatCurrency(row.invoice.FINAL)}
                                                                            </div>
                                                                            <div>
                                                                                Godown: {row.invoice.GODWON || "-"}
                                                                            </div>
                                                                            <div>
                                                                                Transport:{" "}
                                                                                {row.invoice.TRANSPORT || "-"}
                                                                            </div>
                                                                            <div>
                                                                                LR No: {row.invoice.LRNO || "-"} (
                                                                                {formatDate(row.invoice.LRDA)})
                                                                            </div>
                                                                            <div>
                                                                                Form: {row.invoice.FORM || "-"}
                                                                            </div>
                                                                            <div>
                                                                                Challan:{" "}
                                                                                {row.invoice.CHALLAN || "-"}
                                                                            </div>
                                                                            <div>
                                                                                Account:{" "}
                                                                                {row.invoice.ACCOUNT || "-"}
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <small className="text-muted">
                                                                            No linked invoice found for this
                                                                            voucher.
                                                                        </small>
                                                                    )}
                                                                </div>

                                                                <div className="col-md-3">
                                                                    <h6 className="text-primary">
                                                                        Items / Batches (SalesDis)
                                                                    </h6>
                                                                    {row.items && row.items.length > 0 ? (
                                                                        <div
                                                                            className="table-responsive"
                                                                            style={{ maxHeight: 220, overflowY: "auto" }}
                                                                        >
                                                                            <table className="table table-sm table-bordered mb-0">
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th>Batch</th>
                                                                                        <th>Qty</th>
                                                                                        <th>Rate</th>
                                                                                        <th>MRP</th>
                                                                                        <th>Exp</th>
                                                                                        <th className="text-end">
                                                                                            Amount
                                                                                        </th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {row.items.map((it, i) => (
                                                                                        <tr key={i}>
                                                                                            <td>{it.BATCH || "-"}</td>
                                                                                            <td>{it.QTY ?? 0}</td>
                                                                                            <td>{it.RATE ?? 0}</td>
                                                                                            <td>{it.MRP ?? 0}</td>
                                                                                            <td>
                                                                                                {formatDate(it.EXP)}
                                                                                            </td>
                                                                                            <td className="text-end">
                                                                                                {formatCurrency(
                                                                                                    it.AMMMOUNT
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ) : (
                                                                        <small className="text-muted">
                                                                            No batch/item records found for this
                                                                            invoice.
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
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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