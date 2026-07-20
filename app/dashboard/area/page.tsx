"use client";

/**
 * app/dashboard/area/page.tsx
 * -----------------------------------------------------------------------------
 * India Business Map — backed by all 8 tables (MDIS, DIS, SUBDIS, PEND,
 * GLEDGER, PRO, PROBAT, ORDER) via /api/dashboard/india-map (national
 * rollup) and /api/dashboard/india-map/[state] (per-state drill-down).
 *
 * New vs. the previous version:
 *   - Purchase / Sales Returns / Payment KPIs are real (previously Purchase
 *     was hardcoded to 0 and Payment didn't exist).
 *   - Stock & Expiry panel (low-stock + near-expiry alerts, from PRO/PROBAT).
 *   - Party Directory panel (from ORDER) — shown as its own section since it
 *     can't be reconciled with the per-state figures; see the note banner.
 *   - Clicking a state now calls the drill-down route for real Top
 *     Parties / Top Products / Recent Sales / Recent Dispatch, instead of
 *     just re-displaying the state's summary numbers.
 *   - NEW: Party Directory rows now show City / District / Pincode (parsed
 *     from ORDER's address text — see /api/dashboard/india-map for how),
 *     plus a "View full directory →" link to /dashboard/area/parties, a
 *     searchable table of every party (not just the top 10 shown here).
 * -----------------------------------------------------------------------------
 */

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
    topParties: { code: string; sales: number; outstanding: number }[];
    topOutstandingParties: { code: string; outstanding: number }[];
    topProducts: { code: string; name: string; qty: number }[];
    recentSales: { vcn: string; date: string; final: number; codep: string }[];
    recentDispatch: { vcn: string; date: string; codep: string }[];
    note: string;
}

const BRAND = "#343872";

function formatINR(value: number): string {
    const v = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (v >= 1_00_00_000) return `${sign}₹${(v / 1_00_00_000).toFixed(2)} Cr`;
    if (v >= 1_00_000) return `${sign}₹${(v / 1_00_000).toFixed(2)} Lac`;
    return `${sign}₹${v.toLocaleString("en-IN")}`;
}

function heatColor(sales: number, maxSales: number): string {
    if (maxSales <= 0 || sales <= 0) return "#e5e7eb";
    const ratio = sales / maxSales;
    if (ratio >= 0.6) return "#16a34a";
    if (ratio >= 0.3) return "#eab308";
    return "#dc2626";
}

/** "City, District 160022" style location line for a Party Directory row. */
function partyLocationLine(p: PartyDirectoryEntry): string {
    const parts: string[] = [];
    if (p.city) parts.push(p.city);
    if (p.district && p.districtSource === "address" && p.district !== p.city) parts.push(p.district);
    let line = parts.join(", ");
    if (p.pincode) line = line ? `${line} · ${p.pincode}` : p.pincode;
    return line;
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
        setTooltipPos({ x: e.clientX, y: e.clientY });
    }, []);

    if (loading) {
        return <div className="flex h-screen items-center justify-center text-gray-500">Loading dashboard…</div>;
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center text-red-600">
                Couldn't load the dashboard: {error}
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full bg-gray-50 text-gray-900">
            {/* ---------------- LEFT FILTER RAIL ---------------- */}
            <aside className="w-56 shrink-0 border-r border-gray-200 bg-white p-4">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Filters</h2>
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Financial Year</label>
                        <select
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#343872] focus:outline-none"
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
                        <label className="mb-1 block text-xs font-medium text-gray-500">Month</label>
                        <select
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#343872] focus:outline-none"
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
                    <div className="mt-6 space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Alerts</h3>
                        <AlertPill label="Low stock items" value={national.stock.lowStockCount} tone="red" />
                        <AlertPill label="Expiring ≤90 days" value={national.expiry.expiringSoonCount} tone="yellow" />
                        <AlertPill label="Already expired" value={national.expiry.expiredCount} tone="red" />
                        <AlertPill label="Provisional vouchers" value={national.provisionalVouchers.count} tone="gray" />
                    </div>
                )}

                <div className="mt-6">
                    <Link
                        href="/dashboard/area/parties"
                        className="block w-full rounded-md border border-[#343872] px-3 py-2 text-center text-sm font-medium text-[#343872] hover:bg-[#343872] hover:text-white transition-colors"
                    >
                        Party Directory →
                    </Link>
                    <p className="mt-1 text-center text-[11px] text-gray-400">
                        Search all parties by name, city, district or pincode
                    </p>
                </div>
            </aside>

            {/* ---------------- MAIN AREA ---------------- */}
            <main className="flex-1 overflow-y-auto p-6">
                <header className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: BRAND }}>
                            India Business Map
                        </h1>
                        <p className="text-sm text-gray-500">Live from MDIS · DIS · SUBDIS · PEND · GLEDGER · PRO · PROBAT · ORDER</p>
                    </div>
                    {selected && (
                        <button
                            onClick={() => setSelected(null)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                        >
                            ← Back to India Map
                        </button>
                    )}
                </header>

                {/* KPI row 1 — trade */}
                <div className="mb-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <KpiCard label="Total States" value={stateData.length.toString()} />
                    <KpiCard label="Total Customers" value={totals.customers.toLocaleString("en-IN")} />
                    <KpiCard label="Sales" value={formatINR(totals.sales)} accent="green" />
                    <KpiCard label="Sales Returns" value={formatINR(totals.salesReturns)} accent="red" />
                    <KpiCard label="Purchase" value={formatINR(totals.purchase)} />
                    <KpiCard label="Outstanding" value={formatINR(totals.outstanding)} accent="red" />
                </div>
                {/* KPI row 2 — cash + dispatch */}
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <KpiCard label="Collection" value={formatINR(totals.collection)} accent="green" />
                    <KpiCard label="Payment" value={formatINR(totals.payment)} accent="red" />
                    <KpiCard label="Total Suppliers" value={totals.suppliers.toLocaleString("en-IN")} />
                    <KpiCard label="Total Dispatch" value={totals.dispatch.toLocaleString("en-IN")} />
                    {national && (
                        <>
                            <KpiCard label="Stock Value (MRP)" value={formatINR(national.stock.valueAtMRP)} />
                            <KpiCard label="Stock Value (Cost)" value={formatINR(national.stock.valueAtCost)} />
                        </>
                    )}
                </div>

                {!selected ? (
                    <>
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
                            <div className="relative rounded-xl border border-gray-200 bg-white p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-700">India Sales Heat Map</h3>
                                    <Legend />
                                </div>
                                <svg viewBox={INDIA_VIEWBOX} className="mx-auto h-[560px] w-full" onMouseMove={handleMouseMove}>
                                    {INDIA_LOCATIONS.map((loc: StatePath) => {
                                        const data = dataById.get(loc.id);
                                        const fill = data ? heatColor(data.sales, maxSales) : "#e5e7eb";
                                        return (
                                            <path
                                                key={loc.id}
                                                d={loc.path}
                                                fill={fill}
                                                stroke="#ffffff"
                                                strokeWidth={0.6}
                                                className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                                                onMouseEnter={() => data && setHovered(data)}
                                                onMouseLeave={() => setHovered(null)}
                                                onClick={() => data && setSelected(data)}
                                            >
                                                <title>{loc.name}</title>
                                            </path>
                                        );
                                    })}
                                </svg>

                                {hovered && (
                                    <div
                                        className="pointer-events-none fixed z-50 w-60 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
                                        style={{ left: tooltipPos.x + 16, top: tooltipPos.y + 16 }}
                                    >
                                        <p className="mb-2 font-semibold" style={{ color: BRAND }}>
                                            {hovered.stateName}
                                        </p>
                                        <TooltipRow label="Sales" value={formatINR(hovered.sales)} />
                                        <TooltipRow label="Purchase" value={formatINR(hovered.purchase)} />
                                        <TooltipRow label="Customers" value={hovered.customers.toString()} />
                                        <TooltipRow label="Outstanding" value={formatINR(hovered.outstanding)} />
                                        <TooltipRow label="Dispatch" value={hovered.dispatch.toString()} />
                                        <TooltipRow label="Top Product" value={hovered.topProduct} />
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                                <h3 className="mb-3 font-semibold text-gray-700">Top States</h3>
                                {topStates.length === 0 ? (
                                    <p className="text-sm text-gray-400">No state-mapped sales yet — check MDIS.MISC1 values.</p>
                                ) : (
                                    <ol className="space-y-2">
                                        {topStates.map((s, i) => (
                                            <li
                                                key={s.stateId}
                                                onClick={() => setSelected(s)}
                                                className="flex cursor-pointer items-center justify-between rounded-md border border-gray-100 p-2 hover:bg-gray-50"
                                            >
                                                <span className="flex items-center gap-2 text-sm">
                                                    <span
                                                        className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                                                        style={{ backgroundColor: BRAND }}
                                                    >
                                                        {i + 1}
                                                    </span>
                                                    {s.stateName}
                                                </span>
                                                <span className="text-sm font-semibold text-gray-700">{formatINR(s.sales)}</span>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                        </div>

                        {/* ---------------- Stock & Expiry + Party Directory ---------------- */}
                        {national && (
                            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <Panel title="Low Stock Alerts (PRO)">
                                    {national.stock.lowStockItems.length === 0 ? (
                                        <EmptyNote text="Nothing below its reorder level." />
                                    ) : (
                                        national.stock.lowStockItems.map((it) => (
                                            <RowLine key={it.code} left={it.name} right={`${it.balance} / min ${it.minimum}`} tone="red" />
                                        ))
                                    )}
                                </Panel>
                                <Panel title="Expiring Soon (PROBAT)">
                                    {national.expiry.upcoming.length === 0 ? (
                                        <EmptyNote text="Nothing expiring within 90 days." />
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
                                <Panel title="Party Directory (ORDER) — Top Ledger Balances">
                                    <p className="mb-2 text-xs text-gray-400">
                                        {national.partyDirectory.totalParties} parties ·{" "}
                                        {national.partyDirectory.partiesWithPincode} with a pincode · not linked to
                                        per-state figures, see note below.
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
                                        className="mt-2 block text-right text-xs font-medium hover:underline"
                                        style={{ color: BRAND }}
                                    >
                                        View full directory →
                                    </Link>
                                </Panel>
                            </div>
                        )}

                        {dataNotes.length > 0 && (
                            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <button
                                    onClick={() => setNotesOpen((o) => !o)}
                                    className="text-sm font-semibold text-amber-800"
                                >
                                    {notesOpen ? "▾" : "▸"} Data notes ({dataNotes.length})
                                </button>
                                {notesOpen && (
                                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800">
                                        {dataNotes.map((note, i) => (
                                            <li key={i}>{note}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <KpiCard label={`${selected.stateName} — Customers`} value={selected.customers.toString()} />
                            <KpiCard label="Sales" value={formatINR(selected.sales)} accent="green" />
                            <KpiCard label="Purchase" value={formatINR(selected.purchase)} />
                            <KpiCard label="Outstanding" value={formatINR(selected.outstanding)} accent="red" />
                            <KpiCard label="Collection" value={formatINR(selected.collection)} accent="green" />
                            <KpiCard label="Payment" value={formatINR(selected.payment)} accent="red" />
                            <KpiCard label="Dispatch" value={selected.dispatch.toString()} />
                            <KpiCard label="Top Product" value={selected.topProduct} />
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <Panel title="Top Parties by Sales">
                                {drillLoading ? (
                                    <EmptyNote text="Loading…" />
                                ) : !drillDown || drillDown.topParties.length === 0 ? (
                                    <EmptyNote text="No sales vouchers found for this state / period." />
                                ) : (
                                    drillDown.topParties.map((p) => (
                                        <RowLine key={p.code} left={`Party ${p.code}`} right={formatINR(p.sales)} tone="green" />
                                    ))
                                )}
                            </Panel>
                            <Panel title="Top Products by Qty">
                                {drillLoading ? (
                                    <EmptyNote text="Loading…" />
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
                                    <EmptyNote text="Loading…" />
                                ) : !drillDown || drillDown.recentSales.length === 0 ? (
                                    <EmptyNote text="No recent sales vouchers." />
                                ) : (
                                    drillDown.recentSales.map((v, i) => (
                                        <RowLine key={i} left={`${v.vcn} — Party ${v.codep} (${v.date})`} right={formatINR(v.final)} tone="green" />
                                    ))
                                )}
                            </Panel>
                            <Panel title="Recent Dispatch">
                                {drillLoading ? (
                                    <EmptyNote text="Loading…" />
                                ) : !drillDown || drillDown.recentDispatch.length === 0 ? (
                                    <EmptyNote text="No recent dispatch entries." />
                                ) : (
                                    drillDown.recentDispatch.map((d, i) => (
                                        <RowLine key={i} left={`${d.vcn} — Party ${d.codep}`} right={d.date} />
                                    ))
                                )}
                            </Panel>
                        </div>
                        {drillDown && (
                            <p className="mt-3 text-xs text-gray-400">{drillDown.note}</p>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: "green" | "red" }) {
    const color = accent === "green" ? "#16a34a" : accent === "red" ? "#dc2626" : "#1f2937";
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
            <p className="mt-1 text-lg font-bold" style={{ color }}>
                {value}
            </p>
        </div>
    );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-xs text-gray-600">
            <span>{label}</span>
            <span className="font-medium text-gray-900">{value}</span>
        </div>
    );
}

function Legend() {
    return (
        <div className="flex items-center gap-3 text-xs text-gray-500">
            <LegendDot color="#16a34a" label="High" />
            <LegendDot color="#eab308" label="Medium" />
            <LegendDot color="#dc2626" label="Low" />
        </div>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
        </span>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 font-semibold text-gray-700">{title}</h3>
            <div className="space-y-1.5">{children}</div>
        </div>
    );
}

function RowLine({ left, right, tone }: { left: string; right: string; tone?: "green" | "red" | "yellow" }) {
    const color = tone === "green" ? "#16a34a" : tone === "red" ? "#dc2626" : tone === "yellow" ? "#ca8a04" : "#374151";
    return (
        <div className="flex items-center justify-between rounded-md border border-gray-100 px-2 py-1.5 text-sm">
            <span className="truncate text-gray-700">{left}</span>
            <span className="ml-3 shrink-0 font-medium" style={{ color }}>
                {right}
            </span>
        </div>
    );
}

function EmptyNote({ text }: { text: string }) {
    return <p className="text-sm text-gray-400">{text}</p>;
}

function AlertPill({ label, value, tone }: { label: string; value: number; tone: "red" | "yellow" | "gray" }) {
    const bg = tone === "red" ? "bg-red-50 text-red-700" : tone === "yellow" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600";
    return (
        <div className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs ${bg}`}>
            <span>{label}</span>
            <span className="font-bold">{value}</span>
        </div>
    );
}