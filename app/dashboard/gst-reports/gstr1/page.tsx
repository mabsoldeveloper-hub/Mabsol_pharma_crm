"use client";

import { useState } from "react";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const formatCurrency = (value?: number | null) =>
    (value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Gstr1Page() {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(CURRENT_YEAR);

    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [meta, setMeta] = useState<any>(null);
    const [gstJson, setGstJson] = useState<any>(null);

    const buildParams = () => new URLSearchParams({ month: String(month), year: String(year) });

    const loadPreview = async () => {
        setLoading(true);
        setError("");
        try {
            const params = buildParams();
            const res = await fetch(`/api/reports/gstr1?${params.toString()}`);
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Failed to load GSTR-1");
            setMeta(json.data.meta);
            setGstJson(json.data.gstJson);
        } catch (err: any) {
            setError(err?.message || "Something went wrong");
            setMeta(null);
            setGstJson(null);
        } finally {
            setLoading(false);
        }
    };

    const downloadFile = async (format: "json" | "excel" | "pdf") => {
        setExporting(format);
        setError("");
        try {
            const params = buildParams();
            params.set("format", format);
            const res = await fetch(`/api/reports/gstr1?${params.toString()}`);
            if (!res.ok) {
                const json = await res.json().catch(() => null);
                throw new Error(json?.message || `Failed to export ${format.toUpperCase()}`);
            }
            const blob = await res.blob();
            const disposition = res.headers.get("Content-Disposition") || "";
            const match = /filename="(.+)"/.exec(disposition);
            const filename = match?.[1] || `GSTR1_${year}_${month}.${format === "excel" ? "xlsx" : format}`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err?.message || `Failed to export ${format}`);
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className="container-fluid py-3">
            <div className="card shadow-sm">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">GSTR-1 Return</h4>
                    {meta && (
                        <span className="badge bg-light text-dark">
                            {meta.invoiceCount} invoice{meta.invoiceCount === 1 ? "" : "s"} · {meta.period}
                        </span>
                    )}
                </div>

                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="form-label">Month</label>
                            <select className="form-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                                {MONTHS.map((m, idx) => (
                                    <option key={m} value={idx + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Year</label>
                            <select className="form-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                                {YEARS.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <button type="button" className="btn btn-primary w-100" onClick={loadPreview} disabled={loading}>
                                {loading ? "Loading..." : "Load Return"}
                            </button>
                        </div>
                        <div className="col-md-4 d-flex gap-2 justify-content-end">
                            <button
                                type="button"
                                className="btn btn-outline-success"
                                disabled={!meta || exporting !== null}
                                onClick={() => downloadFile("json")}
                            >
                                {exporting === "json" ? "..." : "JSON (Govt Format)"}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-success"
                                disabled={!meta || exporting !== null}
                                onClick={() => downloadFile("excel")}
                            >
                                {exporting === "excel" ? "..." : "Excel"}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-danger"
                                disabled={!meta || exporting !== null}
                                onClick={() => downloadFile("pdf")}
                            >
                                {exporting === "pdf" ? "..." : "PDF"}
                            </button>
                        </div>
                    </div>

                    <hr />

                    {error && <div className="alert alert-danger">{error}</div>}

                    {!meta && !loading && !error && (
                        <div className="text-muted text-center py-4">
                            Select month &amp; year, then click "Load Return" to preview.
                        </div>
                    )}

                    {meta && (
                        <>
                            {(meta.warnings?.stateGuessedCount > 0 || meta.warnings?.unclassifiedHsnCount > 0) && (
                                <div className="alert alert-warning">
                                    ⚠ Data quality warnings for this period:
                                    {meta.warnings.stateGuessedCount > 0 && (
                                        <div>{meta.warnings.stateGuessedCount} invoice(s) had customer state assumed (no reliable state field) — verify before filing.</div>
                                    )}
                                    {meta.warnings.unclassifiedHsnCount > 0 && (
                                        <div>{meta.warnings.unclassifiedHsnCount} product line(s) have no resolved HSN code — verify before filing.</div>
                                    )}
                                </div>
                            )}

                            <div className="row g-3 mb-3">
                                {[
                                    ["B2B Invoices", meta.b2bCount],
                                    ["B2CL Invoices", meta.b2clCount],
                                    ["B2CS Groups", meta.b2csGroupCount],
                                    ["HSN Lines", meta.hsnLineCount],
                                ].map(([label, value]) => (
                                    <div className="col-md-3" key={label as string}>
                                        <div className="border rounded p-3 text-center">
                                            <div className="text-muted small">{label}</div>
                                            <div className="fs-4 fw-semibold">{value as number}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <h6>B2CS Summary (Small B2C — grouped by State &amp; Rate)</h6>
                            <div className="table-responsive mb-4">
                                <table className="table table-sm table-bordered">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Supply Type</th>
                                            <th>Place of Supply</th>
                                            <th className="text-end">Rate %</th>
                                            <th className="text-end">Taxable Value</th>
                                            <th className="text-end">IGST</th>
                                            <th className="text-end">CGST</th>
                                            <th className="text-end">SGST</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(gstJson?.b2cs || []).length === 0 ? (
                                            <tr><td colSpan={7} className="text-center text-muted py-3">No B2CS data</td></tr>
                                        ) : (
                                            gstJson.b2cs.map((row: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td>{row.sply_ty}</td>
                                                    <td>{row.pos}</td>
                                                    <td className="text-end">{row.rt}</td>
                                                    <td className="text-end">{formatCurrency(row.txval)}</td>
                                                    <td className="text-end">{formatCurrency(row.iamt)}</td>
                                                    <td className="text-end">{formatCurrency(row.camt)}</td>
                                                    <td className="text-end">{formatCurrency(row.samt)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <h6>HSN Summary (top rows — full detail in Excel export)</h6>
                            <div className="table-responsive">
                                <table className="table table-sm table-bordered">
                                    <thead className="table-light">
                                        <tr>
                                            <th>HSN</th>
                                            <th>Description</th>
                                            <th className="text-end">Qty</th>
                                            <th className="text-end">Taxable Value</th>
                                            <th className="text-end">CGST</th>
                                            <th className="text-end">SGST</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(gstJson?.hsn?.data || []).length === 0 ? (
                                            <tr><td colSpan={6} className="text-center text-muted py-3">No HSN data</td></tr>
                                        ) : (
                                            gstJson.hsn.data.slice(0, 15).map((row: any) => (
                                                <tr key={row.num}>
                                                    <td>{row.hsn_sc}</td>
                                                    <td>{row.desc}</td>
                                                    <td className="text-end">{row.qty}</td>
                                                    <td className="text-end">{formatCurrency(row.txval)}</td>
                                                    <td className="text-end">{formatCurrency(row.camt)}</td>
                                                    <td className="text-end">{formatCurrency(row.samt)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 