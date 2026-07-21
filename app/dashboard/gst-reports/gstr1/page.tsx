"use client";

import { useState, useMemo } from "react";

const MONTHS = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const fmt = (v?: number | null) =>
    (v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (v?: number | null) =>
    (v ?? 0).toLocaleString("en-IN");

type Tab = "summary" | "invoices" | "b2b" | "b2cl" | "b2cs" | "cdnr" | "hsn" | "docs";

const TAB_META: { id: Tab; label: string; shortLabel: string; color: string }[] = [
    { id: "summary",  label: "Summary",          shortLabel: "Summary",  color: "#6366f1" },
    { id: "invoices", label: "Invoice Register",  shortLabel: "Register", color: "#0ea5e9" },
    { id: "b2b",      label: "B2B (4A/4B)",       shortLabel: "B2B",      color: "#10b981" },
    { id: "b2cl",     label: "B2CL (5A)",          shortLabel: "B2CL",     color: "#f59e0b" },
    { id: "b2cs",     label: "B2CS (7)",           shortLabel: "B2CS",     color: "#8b5cf6" },
    { id: "cdnr",     label: "CDNR / CDNUR (9B)",  shortLabel: "CDN",      color: "#ef4444" },
    { id: "hsn",      label: "HSN Summary (12)",    shortLabel: "HSN",      color: "#06b6d4" },
    { id: "docs",     label: "Doc Issue (13)",       shortLabel: "Docs",     color: "#64748b" },
];

const BUCKET_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    B2B:   { label: "B2B",   bg: "#dcfce7", color: "#15803d" },
    B2CL:  { label: "B2CL",  bg: "#fef9c3", color: "#92400e" },
    B2CS:  { label: "B2CS",  bg: "#ede9fe", color: "#5b21b6" },
    CDNR:  { label: "CDNR",  bg: "#fee2e2", color: "#991b1b" },
    CDNUR: { label: "CDNUR", bg: "#fce7f3", color: "#9d174d" },
};

const GST_STATE_CODES_UI: Record<string, string> = {
    "01":"J&K","02":"HP","03":"Punjab","04":"Chandigarh","05":"Uttarakhand","06":"Haryana",
    "07":"Delhi","08":"Rajasthan","09":"UP","10":"Bihar","11":"Sikkim","12":"Arunachal Pradesh",
    "13":"Nagaland","14":"Manipur","15":"Mizoram","16":"Tripura","17":"Meghalaya","18":"Assam",
    "19":"West Bengal","20":"Jharkhand","21":"Odisha","22":"Chhattisgarh","23":"MP","24":"Gujarat",
    "25":"Daman & Diu","26":"D&NH","27":"Maharashtra","28":"AP (Old)","29":"Karnataka","30":"Goa",
    "31":"Lakshadweep","32":"Kerala","33":"Tamil Nadu","34":"Puducherry","35":"Andaman & Nicobar",
    "36":"Telangana","37":"Andhra Pradesh","38":"Ladakh","97":"Other",
};

const STYLES = `
.gstr1-page{font-family:'Inter','Segoe UI',system-ui,sans-serif;min-height:100vh;background:#f0f4ff;padding:0}
.gstr1-header{background:linear-gradient(135deg,#1e1b4b 0%,#3730a3 50%,#4f46e5 100%);padding:28px 32px 24px;color:#fff;position:relative;overflow:hidden;border-radius:0 0 20px 20px;box-shadow:0 8px 32px rgba(79,70,229,.25)}
.gstr1-header::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,rgba(255,255,255,.06) 0%,transparent 60%)}
.gstr1-header-inner{position:relative;z-index:1}
.gstr1-title{font-size:26px;font-weight:800;letter-spacing:-.5px;margin:0 0 4px}
.gstr1-subtitle{font-size:13px;opacity:.75;margin:0}
.gstr1-header-badge{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);border-radius:20px;padding:5px 14px;font-size:13px;font-weight:600}
.gstr1-control-bar{background:#fff;margin:20px 24px;border-radius:14px;padding:20px 24px;box-shadow:0 2px 12px rgba(0,0,0,.06);border:1px solid #e2e8f0;display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}
.gstr1-control-group{display:flex;flex-direction:column;gap:6px}
.gstr1-label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px}
.gstr1-select{border:1.5px solid #e2e8f0;border-radius:9px;padding:9px 14px;font-size:14px;color:#1e293b;background:#f8fafc;outline:none;cursor:pointer;min-width:130px;transition:border-color .2s}
.gstr1-select:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.12)}
.gstr1-btn{border:none;border-radius:9px;padding:10px 22px;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.gstr1-btn-primary{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;box-shadow:0 4px 12px rgba(99,102,241,.3)}
.gstr1-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 18px rgba(99,102,241,.4)}
.gstr1-btn-primary:disabled{opacity:.55;cursor:not-allowed;transform:none}
.gstr1-btn-json{background:#f0fdf4;color:#16a34a;border:1.5px solid #86efac}
.gstr1-btn-json:hover:not(:disabled){background:#dcfce7}
.gstr1-btn-excel{background:#f0fdf4;color:#15803d;border:1.5px solid #4ade80}
.gstr1-btn-excel:hover:not(:disabled){background:#dcfce7}
.gstr1-btn-pdf{background:#fff1f2;color:#be123c;border:1.5px solid #fca5a5}
.gstr1-btn-pdf:hover:not(:disabled){background:#fee2e2}
.gstr1-btn:disabled{opacity:.5;cursor:not-allowed}
.gstr1-btn-group{display:flex;gap:8px;align-items:flex-end;margin-left:auto;flex-wrap:wrap}
.gstr1-error{background:#fef2f2;border:1.5px solid #fca5a5;color:#991b1b;border-radius:10px;padding:12px 18px;margin:0 24px 12px;font-size:13.5px;display:flex;align-items:center;gap:10px}
.gstr1-empty{text-align:center;padding:60px 24px;color:#94a3b8}
.gstr1-empty-icon{font-size:48px;margin-bottom:12px}
.gstr1-empty-text{font-size:15px;font-weight:500}
.gstr1-empty-hint{font-size:13px;margin-top:6px}
.gstr1-warn{background:#fffbeb;border:1.5px solid #fde68a;color:#92400e;border-radius:10px;padding:12px 18px;margin:0 24px 12px;font-size:13px}
.gstr1-warn-title{font-weight:700;margin-bottom:4px}
.gstr1-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin:0 24px 20px}
.gstr1-kpi-card{background:#fff;border-radius:14px;padding:18px 20px;border:1.5px solid #e2e8f0;position:relative;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.gstr1-kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:14px 14px 0 0}
.gstr1-kpi-card.indigo::before{background:linear-gradient(90deg,#6366f1,#818cf8)}
.gstr1-kpi-card.green::before{background:linear-gradient(90deg,#10b981,#34d399)}
.gstr1-kpi-card.amber::before{background:linear-gradient(90deg,#f59e0b,#fbbf24)}
.gstr1-kpi-card.violet::before{background:linear-gradient(90deg,#8b5cf6,#a78bfa)}
.gstr1-kpi-card.rose::before{background:linear-gradient(90deg,#f43f5e,#fb7185)}
.gstr1-kpi-card.sky::before{background:linear-gradient(90deg,#0ea5e9,#38bdf8)}
.gstr1-kpi-label{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px}
.gstr1-kpi-value{font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-.5px}
.gstr1-kpi-sub{font-size:12px;color:#64748b;margin-top:4px}
.gstr1-total-bar{background:linear-gradient(135deg,#1e1b4b,#3730a3);color:#fff;border-radius:14px;padding:20px 24px;margin:0 24px 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;box-shadow:0 4px 20px rgba(79,70,229,.2)}
.gstr1-total-item{text-align:center}
.gstr1-total-label{font-size:11px;text-transform:uppercase;letter-spacing:.7px;opacity:.65;margin-bottom:4px}
.gstr1-total-val{font-size:18px;font-weight:700}
.gstr1-tabs{display:flex;gap:0;margin:0 24px 0;border-bottom:2.5px solid #e2e8f0;overflow-x:auto;scrollbar-width:none}
.gstr1-tabs::-webkit-scrollbar{display:none}
.gstr1-tab{border:none;background:none;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;color:#64748b;border-bottom:2.5px solid transparent;margin-bottom:-2.5px;white-space:nowrap;transition:all .2s;display:flex;align-items:center;gap:6px}
.gstr1-tab:hover{color:#1e293b}
.gstr1-tab.active{color:#6366f1;border-bottom-color:#6366f1}
.gstr1-tab-count{background:#e0e7ff;color:#4338ca;border-radius:10px;padding:1px 7px;font-size:11px;font-weight:700}
.gstr1-tab.active .gstr1-tab-count{background:#6366f1;color:#fff}
.gstr1-tab-content{margin:0 24px;padding:20px 0 24px}
.gstr1-table-wrap{overflow-x:auto;border-radius:12px;border:1.5px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.gstr1-table{width:100%;border-collapse:collapse;font-size:13px}
.gstr1-table thead tr{background:linear-gradient(135deg,#f8faff,#f0f4ff)}
.gstr1-table th{padding:12px 14px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;border-bottom:1.5px solid #e2e8f0}
.gstr1-table th.num{text-align:right}
.gstr1-table td{padding:11px 14px;border-bottom:1px solid #f1f5f9;color:#1e293b;vertical-align:middle}
.gstr1-table td.num{text-align:right;font-variant-numeric:tabular-nums;font-family:'Consolas',monospace}
.gstr1-table tbody tr:last-child td{border-bottom:none}
.gstr1-table tbody tr:hover td{background:#f8faff}
.gstr1-table tfoot td{background:#f8faff;font-weight:700;border-top:2px solid #c7d2fe;font-size:12px}
.gstr1-table tfoot td.num{color:#4338ca}
.gstr1-badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.3px}
.gstr1-type-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:#f1f5f9;color:#475569}
.gstr1-saletype-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:#fdf4ff;color:#7c3aed;border:1px solid #e9d5ff}
.gstr1-inter-badge{background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:6px;padding:1px 6px;font-size:10px;font-weight:700}
.gstr1-intra-badge{background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;border-radius:6px;padding:1px 6px;font-size:10px;font-weight:700}
.gstr1-search{width:100%;max-width:320px;border:1.5px solid #e2e8f0;border-radius:9px;padding:9px 14px;font-size:13.5px;color:#1e293b;background:#f8fafc;outline:none;margin-bottom:14px;transition:border-color .2s}
.gstr1-search:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1)}
.gstr1-section-title{font-size:16px;font-weight:700;color:#1e293b;margin:0 0 14px;display:flex;align-items:center;gap:8px}
.gstr1-section-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.gstr1-empty-row td{text-align:center;color:#94a3b8;padding:32px;font-style:italic}
.gstr1-section-card{background:#fff;border-radius:12px;border:1.5px solid #e2e8f0;margin-bottom:20px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.03)}
.gstr1-section-card-header{background:linear-gradient(135deg,#f8faff,#f0f4ff);padding:14px 18px;border-bottom:1.5px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between}
.gstr1-section-card-title{font-size:14px;font-weight:700;color:#1e293b}
.gstr1-section-card-sub{font-size:12px;color:#64748b}
.gstr1-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.gstr1-summary-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:13.5px}
.gstr1-summary-row:last-child{border-bottom:none}
.gstr1-summary-row-label{color:#475569}
.gstr1-summary-row-val{font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums}
.spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:768px){
  .gstr1-header{padding:20px 16px;border-radius:0 0 14px 14px}
  .gstr1-control-bar{margin:14px 12px;padding:14px 16px}
  .gstr1-kpi-grid{margin:0 12px 14px;grid-template-columns:repeat(2,1fr)}
  .gstr1-total-bar{margin:0 12px 14px}
  .gstr1-tabs{margin:0 12px}
  .gstr1-tab-content{margin:0 12px}
  .gstr1-error,.gstr1-warn{margin:0 12px 12px}
}
`;

export default function Gstr1Page() {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(CURRENT_YEAR);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [meta, setMeta] = useState<any>(null);
    const [gstJson, setGstJson] = useState<any>(null);
    const [invoiceDetail, setInvoiceDetail] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>("summary");
    const [search, setSearch] = useState("");

    const buildParams = () => new URLSearchParams({ month: String(month), year: String(year) });

    const loadPreview = async () => {
        setLoading(true); setError(""); setMeta(null); setGstJson(null); setInvoiceDetail([]); setActiveTab("summary");
        try {
            const res = await fetch(`/api/reports/gstr1?${buildParams()}`);
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || "Failed to load GSTR-1");
            setMeta(json.data.meta); setGstJson(json.data.gstJson); setInvoiceDetail(json.data.invoiceDetail || []);
        } catch (err: any) { setError(err?.message || "Something went wrong"); } finally { setLoading(false); }
    };

    const downloadFile = async (format: "json" | "excel" | "pdf") => {
        setExporting(format); setError("");
        try {
            const params = buildParams(); params.set("format", format);
            const res = await fetch(`/api/reports/gstr1?${params}`);
            if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.message || `Failed to export ${format}`); }
            const blob = await res.blob();
            const disposition = res.headers.get("Content-Disposition") || "";
            const match = /filename="(.+)"/.exec(disposition);
            const filename = match?.[1] || `GSTR1_${year}_${month}.${format === "excel" ? "xlsx" : format}`;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        } catch (err: any) { setError(err?.message || `Failed to export ${format}`); } finally { setExporting(null); }
    };

    const filteredInvoices = useMemo(() => {
        if (!search.trim()) return invoiceDetail;
        const q = search.toLowerCase();
        return invoiceDetail.filter(r =>
            r.vcn?.toLowerCase().includes(q) || r.partyName?.toLowerCase().includes(q) ||
            r.gstin?.toLowerCase().includes(q) || r.bucket?.toLowerCase().includes(q) ||
            r.city?.toLowerCase().includes(q) || r.saleTypeName?.toLowerCase().includes(q)
        );
    }, [invoiceDetail, search]);

    const grand = meta?.totals?.grand;

    return (
        <>
            <style>{STYLES}</style>
            <div className="gstr1-page">
                {/* ── Header ── */}
                <div className="gstr1-header">
                    <div className="gstr1-header-inner">
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                            <div>
                                <div className="gstr1-title">📋 GSTR-1 Return</div>
                                <div className="gstr1-subtitle">Details of Outward Supplies — GST Portal Filing Report</div>
                                {meta && <div style={{ marginTop:8, fontSize:13, opacity:.85 }}>{meta.companyName} &nbsp;·&nbsp; GSTIN: <strong>{meta.companyGstin || "—"}</strong></div>}
                            </div>
                            {meta && <div className="gstr1-header-badge">{meta.invoiceCount} invoices &nbsp;·&nbsp; {MONTHS[month-1]} {year}</div>}
                        </div>
                    </div>
                </div>

                {/* ── Control Bar ── */}
                <div className="gstr1-control-bar">
                    <div className="gstr1-control-group">
                        <div className="gstr1-label">Month</div>
                        <select className="gstr1-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                            {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                        </select>
                    </div>
                    <div className="gstr1-control-group">
                        <div className="gstr1-label">Year</div>
                        <select className="gstr1-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="gstr1-control-group">
                        <div className="gstr1-label">&nbsp;</div>
                        <button className="gstr1-btn gstr1-btn-primary" onClick={loadPreview} disabled={loading} style={{ minWidth:130 }}>
                            {loading ? <><span className="spinner" /> Loading…</> : "🔍 Load Return"}
                        </button>
                    </div>
                    {meta && (
                        <div className="gstr1-btn-group">
                            <div className="gstr1-label" style={{ width:"100%" }}>Export</div>
                            <button className="gstr1-btn gstr1-btn-json"  disabled={exporting !== null} onClick={() => downloadFile("json")}>
                                {exporting === "json"  ? "…" : "⬇ JSON (Govt)"}
                            </button>
                            <button className="gstr1-btn gstr1-btn-excel" disabled={exporting !== null} onClick={() => downloadFile("excel")}>
                                {exporting === "excel" ? "…" : "⬇ Excel"}
                            </button>
                            <button className="gstr1-btn gstr1-btn-pdf"   disabled={exporting !== null} onClick={() => downloadFile("pdf")}>
                                {exporting === "pdf"   ? "…" : "⬇ PDF"}
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Error ── */}
                {error && <div className="gstr1-error"><span style={{ fontSize:18 }}>⚠️</span><span>{error}</span></div>}

                {/* ── Warnings ── */}
                {meta && (meta.warnings?.stateGuessedCount > 0 || meta.warnings?.unclassifiedHsnCount > 0) && (
                    <div className="gstr1-warn">
                        <div className="gstr1-warn-title">⚠ Data Quality Warnings</div>
                        {meta.warnings.stateGuessedCount > 0 && <div>• {meta.warnings.stateGuessedCount} invoice(s) had customer state assumed — verify before filing.</div>}
                        {meta.warnings.unclassifiedHsnCount > 0 && <div>• {meta.warnings.unclassifiedHsnCount} product line(s) have no resolved HSN code — verify before filing.</div>}
                    </div>
                )}

                {/* ── Empty State ── */}
                {!meta && !loading && !error && (
                    <div className="gstr1-empty">
                        <div className="gstr1-empty-icon">🧾</div>
                        <div className="gstr1-empty-text">Select Month &amp; Year to load GSTR-1</div>
                        <div className="gstr1-empty-hint">Data is fetched live from your sales database for the selected period.</div>
                    </div>
                )}

                {meta && (<>
                    {/* ── KPI Cards ── */}
                    <div className="gstr1-kpi-grid">
                        {[
                            { label:"Total Invoices", value:fmtInt(meta.invoiceCount), sub:`${MONTHS[month-1]} ${year}`, cls:"indigo" },
                            { label:"B2B Invoices",   value:fmtInt(meta.b2bCount),     sub:"Registered parties",   cls:"green"  },
                            { label:"B2CL Invoices",  value:fmtInt(meta.b2clCount),    sub:"Inter-state > ₹2.5L",  cls:"amber"  },
                            { label:"B2CS Groups",    value:fmtInt(meta.b2csGroupCount),sub:"By state & rate",     cls:"violet" },
                            { label:"CDN Notes",      value:fmtInt(meta.cdnrCount + meta.cdnurCount), sub:"Debit / Credit notes", cls:"rose" },
                            { label:"HSN Lines",      value:fmtInt(meta.hsnLineCount), sub:"Unique HSN codes",     cls:"sky"    },
                        ].map(c => (
                            <div key={c.label} className={`gstr1-kpi-card ${c.cls}`}>
                                <div className="gstr1-kpi-label">{c.label}</div>
                                <div className="gstr1-kpi-value">{c.value}</div>
                                <div className="gstr1-kpi-sub">{c.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── Grand Total Bar ── */}
                    {grand && (
                        <div className="gstr1-total-bar">
                            {[
                                { label:"Taxable Value", val:grand.taxableValue },
                                { label:"CGST",          val:grand.cgst         },
                                { label:"SGST",          val:grand.sgst         },
                                { label:"IGST",          val:grand.igst         },
                                { label:"Invoice Value", val:grand.invoiceValue },
                            ].map(t => (
                                <div key={t.label} className="gstr1-total-item">
                                    <div className="gstr1-total-label">{t.label}</div>
                                    <div className="gstr1-total-val">₹{fmt(t.val)}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Tabs ── */}
                    <div className="gstr1-tabs">
                        {TAB_META.map(t => {
                            let count: number | null = null;
                            if (t.id === "b2b")      count = meta.b2bCount;
                            else if (t.id === "b2cl") count = meta.b2clCount;
                            else if (t.id === "b2cs") count = meta.b2csGroupCount;
                            else if (t.id === "cdnr") count = meta.cdnrCount + meta.cdnurCount;
                            else if (t.id === "hsn")  count = meta.hsnLineCount;
                            else if (t.id === "invoices") count = meta.invoiceCount;
                            return (
                                <button key={t.id} className={`gstr1-tab${activeTab === t.id ? " active" : ""}`}
                                    onClick={() => setActiveTab(t.id)}
                                    style={activeTab === t.id ? { color:t.color, borderBottomColor:t.color } : {}}>
                                    {t.shortLabel}
                                    {count !== null && count > 0 && <span className="gstr1-tab-count">{count}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Tab Content ── */}
                    <div className="gstr1-tab-content">

                        {/* SUMMARY */}
                        {activeTab === "summary" && (
                            <div className="gstr1-summary-grid">
                                {[
                                    { title:"B2B — Registered Outward Supplies (4A/4B)",        dot:"#10b981", key:"b2b",   count:meta.b2bCount },
                                    { title:"B2CL — Large Unregistered (5A)",                   dot:"#f59e0b", key:"b2cl",  count:meta.b2clCount },
                                    { title:"B2CS — Small Unregistered (7)",                    dot:"#8b5cf6", key:"b2cs",  count:meta.b2csGroupCount },
                                    { title:"CDNR — Debit/Credit Notes Registered (9B)",        dot:"#ef4444", key:"cdnr",  count:meta.cdnrCount },
                                    { title:"CDNUR — Debit/Credit Notes Unregistered (9B)",     dot:"#f43f5e", key:"cdnur", count:meta.cdnurCount },
                                    { title:"Grand Total (All Sections)",                        dot:"#6366f1", key:"grand", count:meta.invoiceCount },
                                ].map(sec => {
                                    const t = meta.totals[sec.key];
                                    return (
                                        <div key={sec.key} className="gstr1-section-card">
                                            <div className="gstr1-section-card-header">
                                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                                    <span className="gstr1-section-dot" style={{ background:sec.dot }} />
                                                    <span className="gstr1-section-card-title">{sec.title}</span>
                                                </div>
                                                <span className="gstr1-section-card-sub">{sec.count} record{sec.count !== 1 ? "s" : ""}</span>
                                            </div>
                                            <div style={{ padding:"12px 18px" }}>
                                                {[
                                                    { label:"Taxable Value", val:t.taxableValue },
                                                    { label:"CGST",          val:t.cgst         },
                                                    { label:"SGST",          val:t.sgst         },
                                                    { label:"IGST",          val:t.igst         },
                                                    { label:"Invoice Value", val:t.invoiceValue },
                                                ].map(row => (
                                                    <div key={row.label} className="gstr1-summary-row">
                                                        <span className="gstr1-summary-row-label">{row.label}</span>
                                                        <span className="gstr1-summary-row-val">₹{fmt(row.val)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* INVOICE REGISTER */}
                        {activeTab === "invoices" && (<>
                            <input className="gstr1-search" placeholder="🔍 Search party, GSTIN, voucher, city, sale type…" value={search} onChange={e => setSearch(e.target.value)} />
                            <div className="gstr1-table-wrap">
                                <table className="gstr1-table">
                                    <thead><tr>
                                        <th>#</th><th>Voucher/VCN</th><th>Date</th><th>Doc Type</th>
                                        <th>Party Name</th><th>GSTIN</th><th>City</th>
                                        <th>Sale Type</th><th>Bucket</th><th>P.O.S.</th><th>Supply</th>
                                        <th className="num">Items</th><th className="num">Taxable (₹)</th>
                                        <th className="num">CGST (₹)</th><th className="num">SGST (₹)</th>
                                        <th className="num">IGST (₹)</th><th className="num">Invoice Value (₹)</th>
                                    </tr></thead>
                                    <tbody>
                                        {filteredInvoices.length === 0
                                            ? <tr><td colSpan={17} style={{ textAlign:"center", color:"#94a3b8", padding:32, fontStyle:"italic" }}>No invoices found.</td></tr>
                                            : filteredInvoices.map((r, i) => {
                                                const bk = BUCKET_BADGE[r.bucket] || { label:r.bucket, bg:"#f1f5f9", color:"#475569" };
                                                return (
                                                    <tr key={r.voucher}>
                                                        <td style={{ color:"#94a3b8", fontSize:12 }}>{i+1}</td>
                                                        <td style={{ fontWeight:600, fontFamily:"monospace", fontSize:12.5 }}>{r.vcn}</td>
                                                        <td style={{ fontSize:12.5, whiteSpace:"nowrap" }}>{r.date ? r.date.slice(0,10) : "—"}</td>
                                                        <td><span className="gstr1-type-badge">{r.docType}</span></td>
                                                        <td style={{ maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.partyName}>{r.partyName}</td>
                                                        <td style={{ fontFamily:"monospace", fontSize:12, color:r.gstin==="-"?"#94a3b8":"#1e293b" }}>{r.gstin}</td>
                                                        <td style={{ color:"#64748b", fontSize:12.5 }}>{r.city}</td>
                                                        <td>{r.saleTypeName ? <span className="gstr1-saletype-badge">{r.saleTypeName}</span> : <span style={{ color:"#cbd5e1", fontSize:12 }}>—</span>}</td>
                                                        <td><span className="gstr1-badge" style={{ background:bk.bg, color:bk.color }}>{bk.label}</span></td>
                                                        <td style={{ fontSize:12 }}>{r.placeOfSupply} — {GST_STATE_CODES_UI[r.placeOfSupply] || r.placeOfSupply}</td>
                                                        <td><span className={r.interstate ? "gstr1-inter-badge" : "gstr1-intra-badge"}>{r.interstate ? "INTER" : "INTRA"}</span></td>
                                                        <td className="num" style={{ color:"#64748b" }}>{r.itemCount}</td>
                                                        <td className="num">{fmt(r.taxableAmount)}</td>
                                                        <td className="num" style={{ color:r.cgstAmount>0?"#1d4ed8":"#94a3b8" }}>{fmt(r.cgstAmount)}</td>
                                                        <td className="num" style={{ color:r.sgstAmount>0?"#1d4ed8":"#94a3b8" }}>{fmt(r.sgstAmount)}</td>
                                                        <td className="num" style={{ color:r.igstAmount>0?"#7c3aed":"#94a3b8" }}>{fmt(r.igstAmount)}</td>
                                                        <td className="num" style={{ fontWeight:700 }}>₹{fmt(r.invoiceValue)}</td>
                                                    </tr>
                                                );
                                            })
                                        }
                                    </tbody>
                                    {filteredInvoices.length > 0 && (() => {
                                        const totTx = filteredInvoices.reduce((s,r) => s+r.taxableAmount,0);
                                        const totC  = filteredInvoices.reduce((s,r) => s+r.cgstAmount,0);
                                        const totS  = filteredInvoices.reduce((s,r) => s+r.sgstAmount,0);
                                        const totI  = filteredInvoices.reduce((s,r) => s+r.igstAmount,0);
                                        const totV  = filteredInvoices.reduce((s,r) => s+r.invoiceValue,0);
                                        return <tfoot><tr>
                                            <td colSpan={12} style={{ fontSize:12, color:"#64748b" }}>Totals ({filteredInvoices.length} records)</td>
                                            <td className="num">₹{fmt(totTx)}</td>
                                            <td className="num">₹{fmt(totC)}</td>
                                            <td className="num">₹{fmt(totS)}</td>
                                            <td className="num">₹{fmt(totI)}</td>
                                            <td className="num">₹{fmt(totV)}</td>
                                        </tr></tfoot>;
                                    })()}
                                </table>
                            </div>
                        </>)}

                        {/* B2B */}
                        {activeTab === "b2b" && (<>
                            <div className="gstr1-section-title"><span className="gstr1-section-dot" style={{ background:"#10b981" }} />B2B — Registered Outward Supplies (Form 4A/4B)</div>
                            <div className="gstr1-table-wrap">
                                <table className="gstr1-table">
                                    <thead><tr>
                                        <th>Recipient GSTIN</th><th>Invoice No.</th><th>Invoice Date</th>
                                        <th className="num">Invoice Value (₹)</th><th>P.O.S.</th><th>Type</th>
                                        <th className="num">Taxable (₹)</th><th className="num">CGST (₹)</th>
                                        <th className="num">SGST (₹)</th><th className="num">IGST (₹)</th>
                                    </tr></thead>
                                    <tbody>
                                        {!(gstJson?.b2b?.length)
                                            ? <tr><td colSpan={10} style={{ textAlign:"center", color:"#94a3b8", padding:32, fontStyle:"italic" }}>No B2B invoices.</td></tr>
                                            : gstJson.b2b.flatMap((g: any) => g.inv.map((inv: any, j: number) => {
                                                const tx = inv.itms.reduce((s:number,i:any)=>s+(i.itm_det.txval||0),0);
                                                const c  = inv.itms.reduce((s:number,i:any)=>s+(i.itm_det.camt||0),0);
                                                const s  = inv.itms.reduce((s:number,i:any)=>s+(i.itm_det.samt||0),0);
                                                const ig = inv.itms.reduce((s:number,i:any)=>s+(i.itm_det.iamt||0),0);
                                                return <tr key={`${g.ctin}-${j}`}>
                                                    <td style={{ fontFamily:"monospace", fontSize:12, fontWeight:600 }}>{g.ctin}</td>
                                                    <td style={{ fontFamily:"monospace", fontSize:12.5 }}>{inv.inum}</td>
                                                    <td style={{ fontSize:12.5 }}>{inv.idt}</td>
                                                    <td className="num" style={{ fontWeight:700 }}>₹{fmt(inv.val)}</td>
                                                    <td><span className="gstr1-type-badge">{inv.pos}</span></td>
                                                    <td><span className="gstr1-type-badge">{inv.inv_typ}</span></td>
                                                    <td className="num">{fmt(tx)}</td>
                                                    <td className="num" style={{ color:"#1d4ed8" }}>{fmt(c)}</td>
                                                    <td className="num" style={{ color:"#1d4ed8" }}>{fmt(s)}</td>
                                                    <td className="num" style={{ color:"#7c3aed" }}>{fmt(ig)}</td>
                                                </tr>;
                                            }))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </>)}

                        {/* B2CL */}
                        {activeTab === "b2cl" && (<>
                            <div className="gstr1-section-title"><span className="gstr1-section-dot" style={{ background:"#f59e0b" }} />B2CL — Large Unregistered Interstate &gt; ₹2.5L (Form 5A)</div>
                            <div className="gstr1-table-wrap">
                                <table className="gstr1-table">
                                    <thead><tr>
                                        <th>Invoice No.</th><th>Invoice Date</th>
                                        <th className="num">Invoice Value (₹)</th><th>P.O.S.</th>
                                        <th className="num">Taxable (₹)</th><th className="num">IGST (₹)</th>
                                    </tr></thead>
                                    <tbody>
                                        {!(gstJson?.b2cl?.length)
                                            ? <tr><td colSpan={6} style={{ textAlign:"center", color:"#94a3b8", padding:32, fontStyle:"italic" }}>No B2CL invoices.</td></tr>
                                            : gstJson.b2cl.flatMap((g: any) => g.inv.map((inv: any, j: number) => {
                                                const tx = inv.itms.reduce((s:number,i:any)=>s+(i.itm_det.txval||0),0);
                                                const ig = inv.itms.reduce((s:number,i:any)=>s+(i.itm_det.iamt||0),0);
                                                return <tr key={j}>
                                                    <td style={{ fontFamily:"monospace", fontSize:12.5 }}>{inv.inum}</td>
                                                    <td style={{ fontSize:12.5 }}>{inv.idt}</td>
                                                    <td className="num" style={{ fontWeight:700 }}>₹{fmt(inv.val)}</td>
                                                    <td><span className="gstr1-type-badge">{inv.pos}</span></td>
                                                    <td className="num">{fmt(tx)}</td>
                                                    <td className="num" style={{ color:"#7c3aed" }}>{fmt(ig)}</td>
                                                </tr>;
                                            }))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </>)}

                        {/* B2CS */}
                        {activeTab === "b2cs" && (<>
                            <div className="gstr1-section-title"><span className="gstr1-section-dot" style={{ background:"#8b5cf6" }} />B2CS — Small Unregistered Aggregated by State &amp; Rate (Form 7)</div>
                            <div className="gstr1-table-wrap">
                                <table className="gstr1-table">
                                    <thead><tr>
                                        <th>Supply Type</th><th>Place of Supply</th>
                                        <th className="num">Rate %</th><th className="num">Taxable Value (₹)</th>
                                        <th className="num">IGST (₹)</th><th className="num">CGST (₹)</th><th className="num">SGST (₹)</th>
                                    </tr></thead>
                                    <tbody>
                                        {!(gstJson?.b2cs?.length)
                                            ? <tr><td colSpan={7} style={{ textAlign:"center", color:"#94a3b8", padding:32, fontStyle:"italic" }}>No B2CS data.</td></tr>
                                            : gstJson.b2cs.map((row: any, i: number) => (
                                                <tr key={i}>
                                                    <td><span className={row.sply_ty === "INTER" ? "gstr1-inter-badge" : "gstr1-intra-badge"}>{row.sply_ty}</span></td>
                                                    <td>{row.pos} — {GST_STATE_CODES_UI[row.pos] || row.pos}</td>
                                                    <td className="num" style={{ fontWeight:700 }}>{row.rt}%</td>
                                                    <td className="num">{fmt(row.txval)}</td>
                                                    <td className="num" style={{ color:"#7c3aed" }}>{fmt(row.iamt)}</td>
                                                    <td className="num" style={{ color:"#1d4ed8" }}>{fmt(row.camt)}</td>
                                                    <td className="num" style={{ color:"#1d4ed8" }}>{fmt(row.samt)}</td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </>)}

                        {/* CDNR */}
                        {activeTab === "cdnr" && (<>
                            <div className="gstr1-section-title"><span className="gstr1-section-dot" style={{ background:"#ef4444" }} />Credit / Debit Notes — CDNR &amp; CDNUR (9B)</div>
                            <div style={{ fontSize:13, fontWeight:700, color:"#64748b", marginBottom:8 }}>CDNR — Registered ({meta.cdnrCount} notes)</div>
                            <div className="gstr1-table-wrap" style={{ marginBottom:20 }}>
                                <table className="gstr1-table">
                                    <thead><tr>
                                        <th>Recipient GSTIN</th><th>Note No.</th><th>Note Date</th><th>Note Type</th>
                                        <th className="num">Value (₹)</th><th>P.O.S.</th>
                                        <th className="num">Taxable (₹)</th><th className="num">CGST (₹)</th>
                                        <th className="num">SGST (₹)</th><th className="num">IGST (₹)</th>
                                    </tr></thead>
                                    <tbody>
                                        {!(gstJson?.cdnr?.length)
                                            ? <tr><td colSpan={10} style={{ textAlign:"center", color:"#94a3b8", padding:32, fontStyle:"italic" }}>No CDNR notes.</td></tr>
                                            : gstJson.cdnr.flatMap((g: any) => g.nt.map((nt: any, j: number) => {
                                                const tx = nt.itms.reduce((s:number,i:any)=>s+(i.itm_det.txval||0),0);
                                                const c  = nt.itms.reduce((s:number,i:any)=>s+(i.itm_det.camt||0),0);
                                                const sv = nt.itms.reduce((s:number,i:any)=>s+(i.itm_det.samt||0),0);
                                                const ig = nt.itms.reduce((s:number,i:any)=>s+(i.itm_det.iamt||0),0);
                                                return <tr key={`${g.ctin}-${j}`}>
                                                    <td style={{ fontFamily:"monospace", fontSize:12 }}>{g.ctin}</td>
                                                    <td style={{ fontFamily:"monospace", fontSize:12.5 }}>{nt.nt_num}</td>
                                                    <td style={{ fontSize:12.5 }}>{nt.nt_dt}</td>
                                                    <td><span className="gstr1-badge" style={{ background:nt.ntty==="C"?"#dcfce7":"#fee2e2", color:nt.ntty==="C"?"#15803d":"#dc2626" }}>{nt.ntty==="C"?"Credit Note":"Debit Note"}</span></td>
                                                    <td className="num" style={{ fontWeight:700 }}>₹{fmt(nt.val)}</td>
                                                    <td><span className="gstr1-type-badge">{nt.pos}</span></td>
                                                    <td className="num">{fmt(tx)}</td>
                                                    <td className="num" style={{ color:"#1d4ed8" }}>{fmt(c)}</td>
                                                    <td className="num" style={{ color:"#1d4ed8" }}>{fmt(sv)}</td>
                                                    <td className="num" style={{ color:"#7c3aed" }}>{fmt(ig)}</td>
                                                </tr>;
                                            }))
                                        }
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ fontSize:13, fontWeight:700, color:"#64748b", marginBottom:8 }}>CDNUR — Unregistered ({meta.cdnurCount} notes)</div>
                            <div className="gstr1-table-wrap">
                                <table className="gstr1-table">
                                    <thead><tr>
                                        <th>Note No.</th><th>Note Date</th><th>Note Type</th><th>UR Type</th>
                                        <th className="num">Value (₹)</th><th>P.O.S.</th>
                                        <th className="num">Taxable (₹)</th><th className="num">IGST (₹)</th>
                                    </tr></thead>
                                    <tbody>
                                        {!(gstJson?.cdnur?.length)
                                            ? <tr><td colSpan={8} style={{ textAlign:"center", color:"#94a3b8", padding:32, fontStyle:"italic" }}>No CDNUR notes.</td></tr>
                                            : gstJson.cdnur.map((nt: any, i: number) => {
                                                const tx = nt.itms.reduce((s:number,ii:any)=>s+(ii.itm_det.txval||0),0);
                                                const ig = nt.itms.reduce((s:number,ii:any)=>s+(ii.itm_det.iamt||0),0);
                                                return <tr key={i}>
                                                    <td style={{ fontFamily:"monospace", fontSize:12.5 }}>{nt.nt_num}</td>
                                                    <td style={{ fontSize:12.5 }}>{nt.nt_dt}</td>
                                                    <td><span className="gstr1-badge" style={{ background:nt.ntty==="C"?"#dcfce7":"#fee2e2", color:nt.ntty==="C"?"#15803d":"#dc2626" }}>{nt.ntty==="C"?"Credit":"Debit"}</span></td>
                                                    <td><span className="gstr1-type-badge">{nt.typ}</span></td>
                                                    <td className="num" style={{ fontWeight:700 }}>₹{fmt(nt.val)}</td>
                                                    <td><span className="gstr1-type-badge">{nt.pos}</span></td>
                                                    <td className="num">{fmt(tx)}</td>
                                                    <td className="num" style={{ color:"#7c3aed" }}>{fmt(ig)}</td>
                                                </tr>;
                                            })
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </>)}

                        {/* HSN */}
                        {activeTab === "hsn" && (<>
                            <div className="gstr1-section-title"><span className="gstr1-section-dot" style={{ background:"#06b6d4" }} />HSN / SAC Summary (Form 12)</div>
                            <div className="gstr1-table-wrap">
                                <table className="gstr1-table">
                                    <thead><tr>
                                        <th>#</th><th>HSN / SAC Code</th><th>Description</th><th>Sale Type</th>
                                        <th>UQC</th><th className="num">Qty</th><th className="num">Rate %</th>
                                        <th className="num">Taxable (₹)</th><th className="num">CGST (₹)</th>
                                        <th className="num">SGST (₹)</th><th className="num">IGST (₹)</th>
                                        <th className="num">Total Value (₹)</th>
                                    </tr></thead>
                                    <tbody>
                                        {!(gstJson?.hsn?.data?.length)
                                            ? <tr><td colSpan={12} style={{ textAlign:"center", color:"#94a3b8", padding:32, fontStyle:"italic" }}>No HSN data.</td></tr>
                                            : gstJson.hsn.data.map((row: any) => (
                                                <tr key={row.num}>
                                                    <td style={{ color:"#94a3b8", fontSize:12 }}>{row.num}</td>
                                                    <td style={{ fontFamily:"monospace", fontWeight:700, color:"#0f172a", fontSize:13 }}>{row.hsn_sc}</td>
                                                    <td style={{ maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={row.desc}>{row.desc}</td>
                                                    <td>{row.saleTypeName && row.saleTypeName !== "-" ? <span className="gstr1-saletype-badge">{row.saleTypeName}</span> : <span style={{ color:"#cbd5e1", fontSize:12 }}>—</span>}</td>
                                                    <td><span className="gstr1-type-badge">{row.uqc}</span></td>
                                                    <td className="num">{fmt(row.qty)}</td>
                                                    <td className="num" style={{ fontWeight:700 }}>{row.rt}%</td>
                                                    <td className="num">{fmt(row.txval)}</td>
                                                    <td className="num" style={{ color:"#1d4ed8" }}>{fmt(row.camt)}</td>
                                                    <td className="num" style={{ color:"#1d4ed8" }}>{fmt(row.samt)}</td>
                                                    <td className="num" style={{ color:"#7c3aed" }}>{fmt(row.iamt)}</td>
                                                    <td className="num" style={{ fontWeight:700 }}>₹{fmt(row.val)}</td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                    {gstJson?.hsn?.data?.length > 0 && (() => {
                                        const data = gstJson.hsn.data;
                                        const totTx = data.reduce((s:number,r:any)=>s+r.txval,0);
                                        const totC  = data.reduce((s:number,r:any)=>s+r.camt,0);
                                        const totS  = data.reduce((s:number,r:any)=>s+r.samt,0);
                                        const totI  = data.reduce((s:number,r:any)=>s+r.iamt,0);
                                        const totV  = data.reduce((s:number,r:any)=>s+r.val,0);
                                        return <tfoot><tr>
                                            <td colSpan={7} style={{ fontSize:12, color:"#64748b" }}>Totals ({data.length} HSN lines)</td>
                                            <td className="num">₹{fmt(totTx)}</td>
                                            <td className="num">₹{fmt(totC)}</td>
                                            <td className="num">₹{fmt(totS)}</td>
                                            <td className="num">₹{fmt(totI)}</td>
                                            <td className="num">₹{fmt(totV)}</td>
                                        </tr></tfoot>;
                                    })()}
                                </table>
                            </div>
                        </>)}

                        {/* DOCS */}
                        {activeTab === "docs" && (<>
                            <div className="gstr1-section-title"><span className="gstr1-section-dot" style={{ background:"#64748b" }} />Documents Issued (Form 13)</div>
                            <div className="gstr1-table-wrap">
                                <table className="gstr1-table">
                                    <thead><tr>
                                        <th>Doc Type</th><th>From</th><th>To</th>
                                        <th className="num">Total Issued</th><th className="num">Cancelled</th><th className="num">Net Issued</th>
                                    </tr></thead>
                                    <tbody>
                                        {(gstJson?.doc_issue?.doc_det || []).flatMap((dd: any) =>
                                            dd.docs.map((d: any, j: number) => (
                                                <tr key={`${dd.doc_num}-${j}`}>
                                                    <td><span className="gstr1-type-badge">{dd.doc_num === 1 ? "Sales Invoice" : dd.doc_num === 2 ? "Credit/Debit Note" : `Doc ${dd.doc_num}`}</span></td>
                                                    <td style={{ fontFamily:"monospace", fontSize:12.5 }}>{d.from}</td>
                                                    <td style={{ fontFamily:"monospace", fontSize:12.5 }}>{d.to}</td>
                                                    <td className="num" style={{ fontWeight:700 }}>{fmtInt(d.totnum)}</td>
                                                    <td className="num" style={{ color:"#dc2626" }}>{fmtInt(d.cancel)}</td>
                                                    <td className="num" style={{ fontWeight:700, color:"#15803d" }}>{fmtInt(d.net_issue)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>)}

                    </div>
                </>)}
            </div>
        </>
    );
}
