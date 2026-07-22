"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { INDIA_LOCATIONS, INDIA_VIEWBOX, type StatePath } from "./india-map-data";

interface StateSummary {
    stateId: string;
    stateName: string;
    sales: number;
    salesReturns: number;
    purchase: number;
    customers: number;
    suppliers: number;
    outstanding: number;
    collection: number;
    payment: number;
    dispatch: number;
    topProduct: string;
}

interface PartyDirectoryEntry {
    name: string;
    city: string | null;
    district: string | null;
    districtSource: "address" | "city" | null;
    pincode: string | null;
    phone?: string | null;
    state: string | null;
    balance: number;
    isBuyer: boolean;
    isSupplier: boolean;
}

interface NationalData {
    provisionalVouchers: { count: number; value: number };
    stock: {
        valueAtMRP: number;
        valueAtCost: number;
        lowStockCount: number;
        lowStockItems: { code: string; name: string; balance: number; minimum: number }[];
    };
    expiry: {
        expiredCount: number;
        expiringSoonCount: number;
        upcoming: { code: string; name: string; batch: string; exp: string; daysLeft: number; balance: number }[];
    };
    partyDirectory: {
        totalParties: number;
        totalLedgerBalance: number;
        resolvedByState: number;
        unresolved: number;
        partiesWithPincode: number;
        partiesWithDistrictFromAddress: number;
        stateBreakdown: { state: string; count: number }[];
        topParties: PartyDirectoryEntry[];
    };
}

interface DrillDown {
    topParties: { code: string; name: string; sales: number; outstanding: number }[];
    topOutstandingParties: { code: string; name: string; outstanding: number }[];
    topProducts: { code: string; name: string; qty: number }[];
    recentSales: { vcn: string; date: string; final: number; codep: string; partyName: string }[];
    recentDispatch: { vcn: string; date: string; codep: string; partyName: string }[];
    note: string;
}

const BRAND = "#3730a3";

const STYLES = `
.glass-panel {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
  border-radius: 20px;
}
.glass-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  border-radius: 16px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.07);
  border-color: rgba(255, 255, 255, 1);
}
.glass-input {
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(8px);
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s ease;
}
.glass-input:focus {
  background: #ffffff;
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}
.glass-tooltip {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1.5px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04);
  border-radius: 16px;
}
`;

function formatINR(value: number): string {
    const v = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (v >= 1_00_00_000) return `${sign}₹${(v / 1_00_00_000).toFixed(2)} Cr`;
    if (v >= 1_00_000) return `${sign}₹${(v / 1_00_000).toFixed(2)} Lac`;
    return `${sign}₹${v.toLocaleString("en-IN")}`;
}

function heatColor(sales: number, maxSales: number): string {
    if (maxSales <= 0 || sales <= 0) return "#e2e8f0";
    const ratio = sales / maxSales;
    if (ratio >= 0.6) return "#10b981";
    if (ratio >= 0.3) return "#f59e0b";
    return "#ef4444";
}

function partyLocationLine(p: PartyDirectoryEntry): string {
    const parts: string[] = [];
    if (p.city) parts.push(p.city);
    if (p.district && p.districtSource === "address" && p.district !== p.city) parts.push(p.district);
    let line = parts.join(", ");
    if (p.pincode) line = line ? `${line} · ${p.pincode}` : p.pincode;
    return line;
}

function clampTooltipPos(x: number, y: number, boxW: number, boxH: number) {
    const pad = 14;
    const maxX = (typeof window !== "undefined" ? window.innerWidth : x + boxW) - boxW - pad;
    const maxY = (typeof window !== "undefined" ? window.innerHeight : y + boxH) - boxH - pad;
    return {
        x: Math.max(pad, Math.min(x, maxX)),
        y: Math.max(pad, Math.min(y, maxY)),
    };
}

export default function IndiaMapPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stateData, setStateData] = useState<StateSummary[]>([]);
    const [national, setNational] = useState<NationalData | null>(null);
    const [dataNotes, setDataNotes] = useState<string[]>([]);
    const [notesOpen, setNotesOpen] = useState(false);
    const [fy, setFy] = useState("All");
    const [month, setMonth] = useState("All");
    const [hovered, setHovered] = useState<StateSummary | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [selected, setSelected] = useState<StateSummary | null>(null);
    const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
    const [drillLoading, setDrillLoading] = useState(false);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ fy, month });
        fetch(`/api/dashboard/india-map?${params.toString()}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Request failed: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                setStateData(data.states ?? []);
                setNational(data.national ?? null);
                setDataNotes(data.dataNotes ?? []);
            })
            .catch((err) => setError(err.message || "Failed to load dashboard"))
            .finally(() => setLoading(false));
    }, [fy, month]);

    useEffect(() => {
        if (!selected) {
            setDrillDown(null);
            return;
        }
        setDrillLoading(true);
        const params = new URLSearchParams({ fy, month });
        fetch(`/api/dashboard/india-map/${selected.stateId}?${params.toString()}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setDrillDown(data))
            .catch(() => setDrillDown(null))
            .finally(() => setDrillLoading(false));
    }, [selected, fy, month]);

    useEffect(() => {
        if (mobileFiltersOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileFiltersOpen]);

    const dataById = useMemo(() => {
        const map = new Map<string, StateSummary>();
        stateData.forEach((s) => map.set(s.stateId, s));
        return map;
    }, [stateData]);

    const maxSales = useMemo(() => Math.max(...stateData.map((s) => s.sales), 0), [stateData]);

    const totals = useMemo(
        () =>
            stateData.reduce(
                (acc, s) => ({
                    sales: acc.sales + s.sales,
                    salesReturns: acc.salesReturns + s.salesReturns,
                    purchase: acc.purchase + s.purchase,
                    customers: acc.customers + s.customers,
                    suppliers: acc.suppliers + s.suppliers,
                    outstanding: acc.outstanding + s.outstanding,
                    collection: acc.collection + s.collection,
                    payment: acc.payment + s.payment,
                    dispatch: acc.dispatch + s.dispatch,
                }),
                { sales: 0, salesReturns: 0, purchase: 0, customers: 0, suppliers: 0, outstanding: 0, collection: 0, payment: 0, dispatch: 0 }
            ),
        [stateData]
    );

    const topStates = useMemo(() => [...stateData].sort((a, b) => b.sales - a.sales).slice(0, 5), [stateData]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const boxW = typeof window !== "undefined" && window.innerWidth < 640 ? 210 : 250;
        const clamped = clampTooltipPos(e.clientX + 16, e.clientY + 16, boxW, 190);
        setTooltipPos(clamped);
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
                <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-6 shadow-xl backdrop-blur-xl border border-white">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    <span className="text-sm font-semibold text-slate-700">Loading India Business Intelligence…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#f8fafc] px-4">
                <div className="rounded-2xl bg-rose-50/80 p-6 text-center shadow-lg backdrop-blur-xl border border-rose-200 text-rose-700">
                    <div className="text-xl font-bold mb-1">Error Loading Dashboard</div>
                    <div className="text-sm">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{STYLES}</style>
            <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 text-slate-900 lg:flex-row font-sans">
                {/* ---------------- MOBILE HEADER BAR ---------------- */}
                <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-4 py-3.5 lg:hidden">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-md">🗺️</span>
                        <span className="text-base font-extrabold tracking-tight text-slate-900">
                            India Business Intelligence
                        </span>
                    </div>
                    <button
                        onClick={() => setMobileFiltersOpen(true)}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="4" y1="12" x2="20" y2="12" />
                            <line x1="4" y1="18" x2="20" y2="18" />
                        </svg>
                        Filters
                    </button>
                </div>

                {/* ---------------- MOBILE DRAWER BACKDROP ---------------- */}
                {mobileFiltersOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
                        onClick={() => setMobileFiltersOpen(false)}
                    />
                )}

                {/* ---------------- LEFT LIQUID GLASS FILTER SIDEBAR ---------------- */}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform overflow-y-auto bg-white/80 backdrop-blur-2xl p-5 shadow-2xl transition-transform duration-300 ease-out border-r border-white/80
                    lg:static lg:z-auto lg:w-60 lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:shadow-none lg:bg-transparent lg:border-r lg:border-slate-200/60
                    ${mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"}`}
                >
                    <div className="mb-5 flex items-center justify-between lg:block">
                        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Control Panel</h2>
                        <button
                            onClick={() => setMobileFiltersOpen(false)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
                            aria-label="Close filters"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="6" y1="6" x2="18" y2="18" />
                                <line x1="6" y1="18" x2="18" y2="6" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Financial Year</label>
                            <select
                                className="glass-input w-full px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                                value={fy}
                                onChange={(e) => setFy(e.target.value)}
                            >
                                <option>All</option>
                                <option>2026-27</option>
                                <option>2025-26</option>
                                <option>2024-25</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Month</label>
                            <select
                                className="glass-input w-full px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                            >
                                {["All", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                                    <option key={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {national && (
                        <div className="mt-7 space-y-2.5">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Inventory &amp; Risk Alerts</h3>
                            <AlertPill label="Low stock items" value={national.stock.lowStockCount} tone="red" />
                            <AlertPill label="Expiring ≤90 days" value={national.expiry.expiringSoonCount} tone="yellow" />
                            <AlertPill label="Already expired" value={national.expiry.expiredCount} tone="red" />
                            <AlertPill label="Provisional vouchers" value={national.provisionalVouchers.count} tone="indigo" />
                        </div>
                    )}

                    <div className="mt-8">
                        <Link
                            href="/dashboard/area/parties"
                            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2.5 text-center text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-700 hover:to-indigo-800 transition-all hover:scale-[1.02]"
                        >
                            <span>🏢 Party Directory</span>
                            <span>→</span>
                        </Link>
                        <p className="mt-2 text-center text-[11px] text-slate-400 font-medium leading-relaxed">
                            Search all parties by name, city, district or pincode
                        </p>
                    </div>
                </aside>

                {/* ---------------- MAIN CONTENT AREA ---------------- */}
                <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {/* Desktop Header */}
                    <header className="mb-6 hidden items-center justify-between gap-4 lg:flex">
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-500/30">🗺️</span>
                                <div>
                                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                                        India Business Intelligence
                                    </h1>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Real-time VFP Sync · MDIS · DIS · SUBDIS · PEND · GLEDGER · PRO · PROBAT · ORDER</p>
                                </div>
                            </div>
                        </div>
                        {selected && (
                            <button
                                onClick={() => setSelected(null)}
                                className="glass-card flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50/50"
                            >
                                ← Back to India Overview
                            </button>
                        )}
                    </header>

                    {/* Mobile-only compact back button */}
                    {selected && (
                        <div className="mb-4 flex items-center justify-between lg:hidden">
                            <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">{selected.stateName} State Analytics</span>
                            <button
                                onClick={() => setSelected(null)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-sm"
                            >
                                ← Back Overview
                            </button>
                        </div>
                    )}

                    {/* KPI Row 1 — Trade Metrics */}
                    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
                        <KpiCard label="Active States" value={stateData.length.toString()} icon="📌" />
                        <KpiCard label="Customers" value={totals.customers.toLocaleString("en-IN")} icon="👥" />
                        <KpiCard label="Sales Value" value={formatINR(totals.sales)} accent="green" icon="📈" />
                        <KpiCard label="Sales Returns" value={formatINR(totals.salesReturns)} accent="red" icon="↩️" />
                        <KpiCard label="Purchases" value={formatINR(totals.purchase)} icon="🛒" />
                        <KpiCard label="Outstanding" value={formatINR(totals.outstanding)} accent="red" icon="⏳" />
                    </div>

                    {/* KPI Row 2 — Cash & Inventory Valuation */}
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
                        <KpiCard label="Collections" value={formatINR(totals.collection)} accent="green" icon="💰" />
                        <KpiCard label="Payments" value={formatINR(totals.payment)} accent="red" icon="💸" />
                        <KpiCard label="Suppliers" value={totals.suppliers.toLocaleString("en-IN")} icon="🏭" />
                        <KpiCard label="Dispatches" value={totals.dispatch.toLocaleString("en-IN")} icon="🚚" />
                        {national && (
                            <>
                                <KpiCard label="Stock (MRP)" value={formatINR(national.stock.valueAtMRP)} icon="📦" />
                                <KpiCard label="Stock (Cost)" value={formatINR(national.stock.valueAtCost)} icon="🏷️" />
                            </>
                        )}
                    </div>

                    {!selected ? (
                        <>
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
                                {/* ── Map Container ── */}
                                <div className="glass-panel p-5 relative overflow-hidden">
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <h3 className="font-extrabold text-sm tracking-tight text-slate-800">State Sales Heat Map</h3>
                                        </div>
                                        <Legend />
                                    </div>
                                    <svg
                                        viewBox={INDIA_VIEWBOX}
                                        className="mx-auto h-[320px] w-full sm:h-[440px] lg:h-[560px] filter drop-shadow-md"
                                        onMouseMove={handleMouseMove}
                                    >
                                        {INDIA_LOCATIONS.map((loc: StatePath) => {
                                            const data = dataById.get(loc.id);
                                            const fill = data ? heatColor(data.sales, maxSales) : "#e2e8f0";
                                            return (
                                                <path
                                                    key={loc.id}
                                                    d={loc.path}
                                                    fill={fill}
                                                    stroke="#ffffff"
                                                    strokeWidth={0.8}
                                                    className="cursor-pointer transition-all duration-200 hover:opacity-85 hover:stroke-indigo-600 hover:stroke-[1.5]"
                                                    onMouseEnter={() => data && setHovered(data)}
                                                    onMouseLeave={() => setHovered(null)}
                                                    onClick={() => data && setSelected(data)}
                                                >
                                                    <title>{loc.name}</title>
                                                </path>
                                            );
                                        })}
                                    </svg>

                                    {/* Liquid Floating Tooltip */}
                                    {hovered && (
                                        <div
                                            className="glass-tooltip pointer-events-none fixed z-50 w-56 sm:w-64 p-4 text-xs"
                                            style={{ left: tooltipPos.x, top: tooltipPos.y }}
                                        >
                                            <div className="mb-2.5 border-b border-slate-200/60 pb-2 flex items-center justify-between">
                                                <p className="font-extrabold text-slate-900 text-sm">
                                                    {hovered.stateName}
                                                </p>
                                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">State ID: {hovered.stateId.toUpperCase()}</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                <TooltipRow label="Sales Value" value={formatINR(hovered.sales)} bold />
                                                <TooltipRow label="Purchases" value={formatINR(hovered.purchase)} />
                                                <TooltipRow label="Active Customers" value={hovered.customers.toString()} />
                                                <TooltipRow label="Outstanding" value={formatINR(hovered.outstanding)} color="#dc2626" />
                                                <TooltipRow label="Total Dispatches" value={hovered.dispatch.toString()} />
                                                <TooltipRow label="Top Product" value={hovered.topProduct} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── Top States Ranking Panel ── */}
                                <div className="glass-panel p-5">
                                    <div className="mb-4 border-b border-slate-100 pb-3 flex items-center justify-between">
                                        <h3 className="font-extrabold text-sm tracking-tight text-slate-800">Top Revenue States</h3>
                                        <span className="text-[11px] font-bold text-slate-400">By Sales</span>
                                    </div>
                                    {topStates.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic py-6 text-center">No state-mapped sales yet — check MDIS.MISC1 state codes.</p>
                                    ) : (
                                        <ol className="space-y-2.5">
                                            {topStates.map((s, i) => (
                                                <li
                                                    key={s.stateId}
                                                    onClick={() => setSelected(s)}
                                                    className="glass-card flex cursor-pointer items-center justify-between gap-3 p-3 hover:bg-indigo-50/40"
                                                >
                                                    <span className="flex min-w-0 items-center gap-3 text-xs">
                                                        <span
                                                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white shadow-md"
                                                            style={{ backgroundColor: BRAND }}
                                                        >
                                                            {i + 1}
                                                        </span>
                                                        <span className="truncate font-bold text-slate-800">{s.stateName}</span>
                                                    </span>
                                                    <span className="shrink-0 text-xs font-extrabold text-emerald-600">{formatINR(s.sales)}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </div>
                            </div>

                            {/* ---------------- National Inventory, Expiry & Directory Panels ---------------- */}
                            {national && (
                                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                                    <Panel title="Low Stock Reorder Alerts (PRO)">
                                        {national.stock.lowStockItems.length === 0 ? (
                                            <EmptyNote text="All product stock balances are above reorder levels." />
                                        ) : (
                                            national.stock.lowStockItems.map((it) => (
                                                <RowLine key={it.code} left={it.name} right={`${it.balance} / min ${it.minimum}`} tone="red" />
                                            ))
                                        )}
                                    </Panel>
                                    <Panel title="Batch Expiry Watch (PROBAT)">
                                        {national.expiry.upcoming.length === 0 ? (
                                            <EmptyNote text="No batches expiring within 90 days." />
                                        ) : (
                                            national.expiry.upcoming.map((it) => (
                                                <RowLine
                                                    key={`${it.code}-${it.batch}`}
                                                    left={`${it.name} (${it.batch})`}
                                                    right={it.daysLeft < 0 ? `expired ${Math.abs(it.daysLeft)}d ago` : `${it.daysLeft}d left`}
                                                    tone={it.daysLeft < 0 ? "red" : "yellow"}
                                                />
                                            ))
                                        )}
                                    </Panel>
                                    <Panel title="Party Directory — Top Balances (ORDER)">
                                        <p className="mb-3 text-[11px] font-semibold text-slate-400">
                                            {national.partyDirectory.totalParties} parties ·{" "}
                                            {national.partyDirectory.partiesWithPincode} with pincode
                                        </p>
                                        {national.partyDirectory.topParties.map((p) => (
                                            <RowLine
                                                key={p.name}
                                                left={`${p.name}${partyLocationLine(p) ? ` — ${partyLocationLine(p)}` : ""}`}
                                                right={formatINR(p.balance)}
                                                tone={p.balance < 0 ? "red" : "green"}
                                            />
                                        ))}
                                        <Link
                                            href="/dashboard/area/parties"
                                            className="mt-3 block text-right text-xs font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors"
                                        >
                                            View full searchable party directory →
                                        </Link>
                                    </Panel>
                                </div>
                            )}

                            {dataNotes.length > 0 && (
                                <div className="mt-6 glass-panel p-4 border border-amber-200/80 bg-amber-50/40">
                                    <button
                                        onClick={() => setNotesOpen((o) => !o)}
                                        className="text-xs font-bold text-amber-900 flex items-center gap-2"
                                    >
                                        <span>{notesOpen ? "▾" : "▸"}</span>
                                        <span>System Data Notes ({dataNotes.length})</span>
                                    </button>
                                    {notesOpen && (
                                        <ul className="mt-2.5 list-disc space-y-1 pl-5 text-[11.5px] font-medium text-amber-800/90 leading-relaxed">
                                            {dataNotes.map((note, i) => (
                                                <li key={i}>{note}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        /* ── State Drill-Down Analytics View ── */
                        <>
                            <div className="mb-4 flex items-center justify-between border-b border-slate-200/60 pb-3">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">{selected.stateName} State Analytics</h2>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Drill-down insights for {selected.stateName}</p>
                                </div>
                                <button
                                    onClick={() => setSelected(null)}
                                    className="glass-card px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50/50"
                                >
                                    ← Back Overview
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                                <KpiCard label="Customers" value={selected.customers.toString()} icon="👥" />
                                <KpiCard label="Sales Value" value={formatINR(selected.sales)} accent="green" icon="📈" />
                                <KpiCard label="Purchases" value={formatINR(selected.purchase)} icon="🛒" />
                                <KpiCard label="Outstanding" value={formatINR(selected.outstanding)} accent="red" icon="⏳" />
                                <KpiCard label="Collections" value={formatINR(selected.collection)} accent="green" icon="💰" />
                                <KpiCard label="Payments" value={formatINR(selected.payment)} accent="red" icon="💸" />
                                <KpiCard label="Dispatches" value={selected.dispatch.toString()} icon="🚚" />
                                <KpiCard label="Top Product" value={selected.topProduct} icon="🏆" />
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <Panel title="Top Parties by Sales">
                                    {drillLoading ? (
                                        <EmptyNote text="Loading state parties…" />
                                    ) : !drillDown || drillDown.topParties.length === 0 ? (
                                        <EmptyNote text="No sales vouchers found for this state / period." />
                                    ) : (
                                        drillDown.topParties.map((p) => (
                                            <RowLine key={p.code} left={p.name} right={formatINR(p.sales)} tone="green" />
                                        ))
                                    )}
                                </Panel>
                                <Panel title="Top Products by Volume">
                                    {drillLoading ? (
                                        <EmptyNote text="Loading state products…" />
                                    ) : !drillDown || drillDown.topProducts.length === 0 ? (
                                        <EmptyNote text="No dispatched items found for this state / period." />
                                    ) : (
                                        drillDown.topProducts.map((p) => (
                                            <RowLine key={p.code} left={p.name} right={`${p.qty} units`} />
                                        ))
                                    )}
                                </Panel>
                                <Panel title="Recent Sales Vouchers">
                                    {drillLoading ? (
                                        <EmptyNote text="Loading sales vouchers…" />
                                    ) : !drillDown || drillDown.recentSales.length === 0 ? (
                                        <EmptyNote text="No recent sales vouchers." />
                                    ) : (
                                        drillDown.recentSales.map((v, i) => (
                                            <RowLine key={i} left={`${v.vcn} — ${v.partyName} (${v.date ? v.date.slice(0,10) : ""})`} right={formatINR(v.final)} tone="green" />
                                        ))
                                    )}
                                </Panel>
                                <Panel title="Recent Dispatches">
                                    {drillLoading ? (
                                        <EmptyNote text="Loading dispatches…" />
                                    ) : !drillDown || drillDown.recentDispatch.length === 0 ? (
                                        <EmptyNote text="No recent dispatch entries." />
                                    ) : (
                                        drillDown.recentDispatch.map((d, i) => (
                                            <RowLine key={i} left={`${d.vcn} — ${d.partyName}`} right={d.date ? d.date.slice(0,10) : ""} />
                                        ))
                                    )}
                                </Panel>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </>
    );
}

function KpiCard({ label, value, accent, icon }: { label: string; value: string; accent?: "green" | "red"; icon?: string }) {
    const color = accent === "green" ? "#10b981" : accent === "red" ? "#ef4444" : "#0f172a";
    return (
        <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-1">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 truncate">{label}</p>
                {icon && <span className="text-xs opacity-75">{icon}</span>}
            </div>
            <p className="text-base sm:text-lg font-black tracking-tight break-words" style={{ color }}>
                {value}
            </p>
        </div>
    );
}

function TooltipRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
    return (
        <div className="flex justify-between gap-2 text-slate-600">
            <span className="font-medium text-[11px] text-slate-500">{label}</span>
            <span className={`text-[11.5px] ${bold ? "font-extrabold" : "font-semibold"}`} style={color ? { color } : { color: "#0f172a" }}>
                {value}
            </span>
        </div>
    );
}

function Legend() {
    return (
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
            <LegendDot color="#10b981" label="High Sales" />
            <LegendDot color="#f59e0b" label="Medium Sales" />
            <LegendDot color="#ef4444" label="Low Sales" />
        </div>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full shadow-xs" style={{ backgroundColor: color }} />
            <span>{label}</span>
        </span>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="glass-panel p-5">
            <h3 className="mb-3.5 font-extrabold text-sm tracking-tight text-slate-800 border-b border-slate-100 pb-2.5">{title}</h3>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function RowLine({ left, right, tone }: { left: string; right: string; tone?: "green" | "red" | "yellow" }) {
    const color = tone === "green" ? "#10b981" : tone === "red" ? "#ef4444" : tone === "yellow" ? "#d97706" : "#334155";
    return (
        <div className="glass-card flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <span className="truncate font-semibold text-slate-700">{left}</span>
            <span className="shrink-0 font-extrabold" style={{ color }}>
                {right}
            </span>
        </div>
    );
}

function EmptyNote({ text }: { text: string }) {
    return <p className="text-xs text-slate-400 italic py-3 text-center">{text}</p>;
}

function AlertPill({ label, value, tone }: { label: string; value: number; tone: "red" | "yellow" | "indigo" }) {
    const bg = tone === "red" ? "bg-rose-50/80 text-rose-700 border-rose-200/80" : tone === "yellow" ? "bg-amber-50/80 text-amber-700 border-amber-200/80" : "bg-indigo-50/80 text-indigo-700 border-indigo-200/80";
    return (
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold border backdrop-blur-md ${bg}`}>
            <span>{label}</span>
            <span className="rounded-lg bg-white/80 px-2 py-0.5 shadow-2xs">{value}</span>
        </div>
    );
}