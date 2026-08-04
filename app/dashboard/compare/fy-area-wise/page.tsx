/**
 * app/dashboard/compare/fy-area-wise/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Financial Year Area-Wise Spatial Intelligence — Fully Responsive & Liquid Glass
 * ─────────────────────────────────────────────────────────────────────────────
 */
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    FaBalanceScale, FaMapMarkerAlt, FaSync, FaCheckSquare, FaRegSquare,
    FaArrowUp, FaArrowDown, FaBuilding, FaDownload, FaFilter,
    FaSearch, FaTimes, FaTrophy, FaBoxes, FaUserCheck, FaChartLine, FaShoppingBag,
    FaWallet, FaUndo, FaExclamationTriangle, FaEye, FaLayerGroup,
    FaHeartbeat, FaGlobeAsia, FaExchangeAlt
} from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";
import { INDIA_LOCATIONS, INDIA_VIEWBOX, type StatePath } from "@/app/dashboard/area/india-map-data";
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
type FYItem = { fyId: string; fyName: string; startDate: string; endDate: string; color: string };

type StateFyData = {
    sales: number;
    netSales: number;
    salesReturns: number;
    purchase: number;
    collections: number;
    payments: number;
    customersCount: number;
    suppliersCount: number;
    returnsRatioPercent: number;
    collectionEfficiencyPercent: number;
    monthlySales: number[];
};

type StateRow = {
    stateId: string;
    stateName: string;
    zoneName: string;
    totalSales: number;
    totalNetSales: number;
    salesGrowthPct: number | null;
    netSalesGrowthPct: number | null;
    healthScore: number;
    byFy: Record<string, StateFyData>;
    topProducts: { name: string; qty: number; amount: number }[];
    topCustomers: { name: string; sales: number }[];
};

type ZonalRow = { zoneName: string; byFy: Record<string, number>; totalSales: number };

type MetricMode = "sales" | "netSales" | "purchase" | "collections" | "returnsRatio" | "growth" | "health";

const FY_PALETTE = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];
const PIE_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16"];
const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

// SVG Coordinates for Hotspots on major state hubs
const STATE_HOTSPOTS: Record<string, { cx: number; cy: number; label: string }> = {
    mh: { cx: 180, cy: 450, label: "Mumbai" },
    gj: { cx: 110, cy: 370, label: "Ahmedabad" },
    dl: { cx: 205, cy: 220, label: "Delhi" },
    ka: { cx: 195, cy: 535, label: "Bengaluru" },
    tn: { cx: 240, cy: 590, label: "Chennai" },
    wb: { cx: 410, cy: 360, label: "Kolkata" },
    up: { cx: 280, cy: 260, label: "Lucknow" },
    hr: { cx: 190, cy: 215, label: "Panchkula" },
};

const METRIC_OPTIONS: { key: MetricMode; label: string; icon: React.ReactNode }[] = [
    { key: "sales", label: "Gross Sales", icon: <FaChartLine size={11} /> },
    { key: "netSales", label: "Net Sales", icon: <FaEye size={11} /> },
    { key: "purchase", label: "Purchases", icon: <FaShoppingBag size={11} /> },
    { key: "collections", label: "Collections", icon: <FaWallet size={11} /> },
    { key: "returnsRatio", label: "Returns Ratio %", icon: <FaUndo size={11} /> },
    { key: "growth", label: "YoY Growth %", icon: <FaArrowUp size={11} /> },
    { key: "health", label: "State Health Score", icon: <FaHeartbeat size={11} /> },
];

function useIsMobile(breakpoint = 640) {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, [breakpoint]);
    return isMobile;
}

const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);

const formatCr = (n: number) => {
    if (!n && n !== 0) return "₹0";
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
    if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
    if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)} K`;
    return `₹${formatINR(n)}`;
};

const glassTooltipStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.8)",
    borderRadius: 14,
    boxShadow: "0 8px 32px rgba(31,41,55,0.14)",
    fontSize: 12,
    color: "#0f172a",
    fontWeight: 600,
    padding: "8px 12px",
};

// Heatmap color generator
function getHeatmapColor(value: number, maxVal: number, mode: MetricMode, growthPct?: number | null, score?: number): string {
    if (mode === "growth") {
        if (growthPct === null || growthPct === undefined) return "#e2e8f0";
        if (growthPct > 30) return "#059669";
        if (growthPct > 15) return "#10b981";
        if (growthPct > 0) return "#6ee7b7";
        if (growthPct === 0) return "#cbd5e1";
        if (growthPct > -15) return "#fca5a5";
        return "#ef4444";
    }

    if (mode === "health") {
        const sc = score ?? 50;
        if (sc >= 80) return "#059669";
        if (sc >= 60) return "#10b981";
        if (sc >= 40) return "#f59e0b";
        return "#ef4444";
    }

    if (!maxVal || !value) return "#f1f5f9";
    const ratio = Math.min(value / maxVal, 1);
    if (mode === "returnsRatio") {
        if (ratio > 0.6) return "#f87171";
        if (ratio > 0.3) return "#fbbf24";
        return "#818cf8";
    }
    // Default Sales/Purchase spectrum
    if (ratio > 0.8) return "#3730a3";
    if (ratio > 0.6) return "#4338ca";
    if (ratio > 0.4) return "#4f46e5";
    if (ratio > 0.2) return "#6366f1";
    if (ratio > 0.05) return "#a5b4fc";
    return "#e0e7ff";
}

// Export CSV
function exportAreaCSV(stateData: StateRow[], fyList: FYItem[]) {
    const rows: string[] = [];
    rows.push(["State Name", "State Code", "Zone", "Health Score", ...fyList.map(f => `${f.fyName} Sales`), "YoY Sales Growth %"].join(","));
    stateData.forEach(st => {
        const rowVals = fyList.map(f => String(st.byFy[f.fyId]?.sales ?? 0));
        rows.push([`"${st.stateName}"`, st.stateId.toUpperCase(), st.zoneName, String(st.healthScore), ...rowVals, st.salesGrowthPct !== null ? `${st.salesGrowthPct}%` : "N/A"].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `India_State_FY_Comparison_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function AmbientBg() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" style={{ background: "linear-gradient(160deg, #F0F4FF 0%, #EDF0FB 40%, #F5F0FF 70%, #EEF5F0 100%)" }}>
            <div className="absolute -top-48 -left-40 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full opacity-60 blur-[90px] sm:blur-[130px]" style={{ background: "radial-gradient(circle, #C7D2FE, #818CF820)" }} />
            <div className="absolute top-1/4 -right-40 w-[320px] sm:w-[560px] h-[320px] sm:h-[560px] rounded-full opacity-50 blur-[90px] sm:blur-[130px]" style={{ background: "radial-gradient(circle, #D8B4FE, #A78BFA20)" }} />
            <div className="absolute bottom-[-120px] left-1/4 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full opacity-45 blur-[100px] sm:blur-[140px]" style={{ background: "radial-gradient(circle, #A7F3D0, #10B98120)" }} />
        </div>
    );
}

function GlassCard({ children, className = "", title, subtitle }: { children: React.ReactNode; className?: string; title?: string; subtitle?: string }) {
    return (
        <div className={`relative rounded-[16px] sm:rounded-[22px] overflow-hidden ${className}`}
            style={{
                background: "rgba(255,255,255,0.68)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.85)",
                boxShadow: "0 4px 20px rgba(99,102,241,0.06), 0 1px 0 rgba(255,255,255,0.9) inset",
            }}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            {(title || subtitle) && (
                <div className="px-3.5 sm:px-5 pt-3.5 sm:pt-5 pb-0">
                    {title && <h3 className="text-xs sm:text-[14px] font-black text-slate-800 tracking-tight m-0">{title}</h3>}
                    {subtitle && <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 m-0 font-medium">{subtitle}</p>}
                </div>
            )}
            <div className="p-3.5 sm:p-5">{children}</div>
        </div>
    );
}

function GrowthBadge({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="text-slate-300 text-[10px]">—</span>;
    const positive = pct > 0;
    const neutral = pct === 0;
    return (
        <span className={`inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black ${
            neutral ? "bg-slate-100 text-slate-600 border border-slate-200"
            : positive ? "bg-emerald-100/80 text-emerald-800 border border-emerald-300"
            : "bg-rose-100/80 text-rose-800 border border-rose-300"
        }`}>
            {!neutral && (positive ? <FaArrowUp size={6} /> : <FaArrowDown size={6} />)}
            {pct > 0 ? "+" : ""}{pct}%
        </span>
    );
}

function HealthRing({ score }: { score: number }) {
    const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
    return (
        <div className="flex items-center gap-1.5 font-black text-[10px] sm:text-[11px]" style={{ color }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
            {score}/100
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function FYAreaWiseComparisonPage() {
    const { fyList: globalFyList } = useFinancialYear();
    const { selectedCompany } = useCompany();
    const isMobile = useIsMobile(640);

    const [selectedFyIds, setSelectedFyIds] = useState<string[]>([]);
    const [fyList, setFyList] = useState<FYItem[]>([]);
    const [stateData, setStateData] = useState<StateRow[]>([]);
    const [zonalBreakdown, setZonalBreakdown] = useState<ZonalRow[]>([]);
    const [leaderboards, setLeaderboards] = useState<any>(null);
    const [nationalSummary, setNationalSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metricMode, setMetricMode] = useState<MetricMode>("sales");
    const [searchState, setSearchState] = useState("");
    const [selectedState, setSelectedState] = useState<StateRow | null>(null);
    const [hoveredState, setHoveredState] = useState<{ path: StatePath; data?: StateRow } | null>(null);
    const [compareStateIds, setCompareStateIds] = useState<string[]>([]);
    const [drawerTab, setDrawerTab] = useState<"overview" | "monthly" | "customers" | "products">("overview");
    const [hasLoaded, setHasLoaded] = useState(false);

    const availableFYs = useMemo(() =>
        globalFyList.filter((f) => !f.isAll && f._id !== "ALL"), [globalFyList]);

    const toggleFY = useCallback((id: string) => {
        setSelectedFyIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

    const loadData = useCallback(async () => {
        if (selectedFyIds.length === 0) return;
        setLoading(true); setError(null);
        try {
            const params = new URLSearchParams();
            const uniqueIds = Array.from(new Set(selectedFyIds));
            params.set("fyIds", uniqueIds.join(","));
            if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

            const res = await fetch(`/api/dashboard/compare/fy-area-wise?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Failed");

            setFyList(json.fyList || []);
            setStateData(json.stateData || []);
            setZonalBreakdown(json.zonalBreakdown || []);
            setLeaderboards(json.leaderboards || null);
            setNationalSummary(json.nationalSummary || null);
            setHasLoaded(true);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [selectedFyIds, selectedCompany]);

    const stateMapLookup = useMemo(() => {
        const map = new Map<string, StateRow>();
        stateData.forEach(st => {
            map.set(st.stateId.toLowerCase(), st);
            map.set(st.stateName.toLowerCase(), st);
        });
        return map;
    }, [stateData]);

    const maxMetricVal = useMemo(() => {
        if (!stateData.length || !fyList.length) return 1;
        const lastFyId = fyList[fyList.length - 1]?.fyId;
        return Math.max(...stateData.map(st => {
            const d = st.byFy[lastFyId];
            if (!d) return 0;
            if (metricMode === "sales") return d.sales;
            if (metricMode === "netSales") return d.netSales;
            if (metricMode === "purchase") return d.purchase;
            if (metricMode === "collections") return d.collections;
            if (metricMode === "returnsRatio") return d.returnsRatioPercent;
            return st.totalSales;
        }), 1);
    }, [stateData, fyList, metricMode]);

    const filteredStateTable = useMemo(() => {
        if (!searchState.trim()) return stateData;
        const q = searchState.toLowerCase();
        return stateData.filter(st => st.stateName.toLowerCase().includes(q) || st.stateId.toLowerCase().includes(q) || st.zoneName.toLowerCase().includes(q));
    }, [stateData, searchState]);

    const compareRadarData = useMemo(() => {
        if (compareStateIds.length < 2 || !fyList.length) return [];
        const lastFyId = fyList[fyList.length - 1]?.fyId;
        const statesToCompare = stateData.filter(s => compareStateIds.includes(s.stateId));

        const metrics = [
            { label: "Sales", getter: (s: StateRow) => s.byFy[lastFyId]?.sales ?? 0 },
            { label: "Net Sales", getter: (s: StateRow) => s.byFy[lastFyId]?.netSales ?? 0 },
            { label: "Collections", getter: (s: StateRow) => s.byFy[lastFyId]?.collections ?? 0 },
            { label: "Purchases", getter: (s: StateRow) => s.byFy[lastFyId]?.purchase ?? 0 },
            { label: "Customers", getter: (s: StateRow) => s.byFy[lastFyId]?.customersCount ?? 0 },
            { label: "Health Score", getter: (s: StateRow) => s.healthScore },
        ];

        return metrics.map(({ label, getter }) => {
            const maxVal = Math.max(...statesToCompare.map(getter)) || 1;
            const row: any = { metric: label };
            statesToCompare.forEach(s => {
                row[s.stateName] = Math.round((getter(s) / maxVal) * 100);
            });
            return row;
        });
    }, [compareStateIds, stateData, fyList]);

    const drawerMonthlyChartData = useMemo(() => {
        if (!selectedState || !fyList.length) return [];
        return MONTH_LABELS.map((mName, idx) => {
            const row: any = { month: mName };
            fyList.forEach(fy => {
                row[fy.fyName] = selectedState.byFy[fy.fyId]?.monthlySales[idx] ?? 0;
            });
            return row;
        });
    }, [selectedState, fyList]);

    const toggleCompareState = (sId: string) => {
        setCompareStateIds(prev =>
            prev.includes(sId) ? prev.filter(x => x !== sId) : (prev.length < 3 ? [...prev, sId] : [prev[1], prev[2], sId])
        );
    };

    // Responsive dimensions
    const svgMapHeight = isMobile ? 300 : 480;
    const pieRadiusOuter = isMobile ? 65 : 85;
    const pieRadiusInner = isMobile ? 30 : 42;
    const chartHeightZonal = isMobile ? 220 : 260;
    const yAxisWidthDrawer = isMobile ? 48 : 58;

    return (
        <div className="min-h-screen p-2.5 sm:p-4 md:p-6 space-y-3.5 sm:space-y-5 relative">
            <AmbientBg />

            {/* Header */}
            <GlassCard>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
                            <FaGlobeAsia size={16} className="text-white sm:text-[18px]" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                                Financial Year Area-Wise Spatial Intelligence
                            </h1>
                            <p className="text-[10px] sm:text-[12px] text-slate-500 mt-0.5 m-0">
                                Advanced Multi-FY India Map Heatmaps · Zonal Distribution · State Radar &amp; Health Analytics
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end flex-shrink-0">
                        {selectedCompany && (
                            <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <FaBuilding size={9} /> {selectedCompany.companyName}
                            </span>
                        )}
                        {stateData.length > 0 && (
                            <button onClick={() => exportAreaCSV(stateData, fyList)}
                                className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                                <FaDownload size={9} /> Export Area CSV
                            </button>
                        )}
                    </div>
                </div>
            </GlassCard>

            {/* ── FY Selector & Heatmap Metric Filters ──────────────────── */}
            <GlassCard>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                        <h3 className="text-xs sm:text-[14px] font-black text-slate-800 flex items-center gap-2 m-0">
                            <FaFilter size={12} className="text-indigo-500" />
                            Select Financial Years &amp; Spatial View Mode
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 m-0">Tick FYs to compare state-wise spatial metrics across India</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                        {selectedFyIds.length > 0 && (
                            <span className="text-[10px] sm:text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                                {selectedFyIds.length} FY Selected
                            </span>
                        )}
                        <button onClick={loadData} disabled={loading || selectedFyIds.length === 0}
                            className="flex items-center justify-center gap-2 text-white text-xs font-black px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 hover:shadow-lg w-full sm:w-auto"
                            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
                            <FaSync size={11} className={loading ? "animate-spin" : ""} />
                            {loading ? "Loading Area…" : "Load Area Analytics"}
                        </button>
                    </div>
                </div>

                {/* FY Selection Pills */}
                <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 mb-3">
                    {availableFYs.map((fy, i) => {
                        const isSelected = selectedFyIds.includes(fy._id);
                        const color = FY_PALETTE[i % FY_PALETTE.length];
                        return (
                            <button key={fy._id} onClick={() => toggleFY(fy._id)}
                                className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-[12px] text-xs font-semibold transition-all duration-200 text-left hover:scale-[1.02] active:scale-95 min-w-0"
                                style={isSelected
                                    ? { border: `1.5px solid ${color}50`, background: `linear-gradient(135deg, ${color}15, ${color}06)`, color: "#1e293b", boxShadow: `0 4px 12px ${color}20` }
                                    : { border: "1.5px solid rgba(148,163,184,0.3)", background: "rgba(255,255,255,0.5)", color: "#94a3b8" }}>
                                <span style={{ color: isSelected ? color : "#cbd5e1" }} className="shrink-0">
                                    {isSelected ? <FaCheckSquare size={13} /> : <FaRegSquare size={13} />}
                                </span>
                                <div className="truncate min-w-0">
                                    <div className="font-bold text-slate-800 text-[11px] sm:text-xs truncate">{fy.fyName}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Metric Modes Options */}
                <div className="flex overflow-x-auto scrollbar-hide pt-2 border-t border-slate-200/60 gap-1.5">
                    {METRIC_OPTIONS.map(opt => {
                        const isActive = metricMode === opt.key;
                        return (
                            <button key={opt.key} onClick={() => setMetricMode(opt.key)}
                                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold whitespace-nowrap transition-all duration-200 shrink-0"
                                style={isActive
                                    ? { background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "white", boxShadow: "0 3px 10px rgba(99,102,241,0.3)" }
                                    : { background: "rgba(241,245,249,0.8)", color: "#64748b" }}>
                                {opt.icon} {opt.label}
                            </button>
                        );
                    })}
                </div>
            </GlassCard>

            {/* Error */}
            {error && (
                <div className="rounded-[16px] px-4 py-3 flex items-center gap-2 text-rose-600 text-xs font-medium border border-rose-200 bg-rose-50/70">
                    <FaExclamationTriangle size={13} /> {error}
                </div>
            )}

            {/* Main Dashboard Layout */}
            {!loading && stateData.length > 0 && (
                <div className="space-y-3.5 sm:space-y-4">
                    {/* Leaderboard Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                        <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-indigo-50/90 to-blue-50/70 border border-indigo-200/70 shadow-sm flex items-center gap-2.5 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                <FaTrophy size={14} className="sm:text-base" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-indigo-600 m-0 truncate">Top Revenue State</p>
                                <p className="text-xs sm:text-sm font-black text-slate-800 m-0 truncate">{leaderboards?.topRevenueState?.stateName || "—"}</p>
                                <p className="text-[10px] sm:text-[11px] font-bold text-indigo-700 m-0 truncate">{leaderboards?.topRevenueState ? formatCr(leaderboards.topRevenueState.sales) : ""}</p>
                            </div>
                        </div>

                        <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border border-emerald-200/70 shadow-sm flex items-center gap-2.5 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                <FaArrowUp size={14} className="sm:text-base" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-600 m-0 truncate">Highest YoY Growth</p>
                                <p className="text-xs sm:text-sm font-black text-slate-800 m-0 truncate">{leaderboards?.topGrowthState?.stateName || "—"}</p>
                                <p className="text-[10px] sm:text-[11px] font-bold text-emerald-700 m-0 truncate">{leaderboards?.topGrowthState ? `+${leaderboards.topGrowthState.growthPct}%` : ""}</p>
                            </div>
                        </div>

                        <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-amber-50/90 to-orange-50/70 border border-amber-200/70 shadow-sm flex items-center gap-2.5 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                <FaHeartbeat size={14} className="sm:text-base" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 m-0 truncate">Top Health Index</p>
                                <p className="text-xs sm:text-sm font-black text-slate-800 m-0 truncate">{leaderboards?.topHealthState?.stateName || "—"}</p>
                                <p className="text-[10px] sm:text-[11px] font-bold text-amber-700 m-0 truncate">{leaderboards?.topHealthState ? `${leaderboards.topHealthState.score}/100 Score` : ""}</p>
                            </div>
                        </div>

                        <div className="rounded-[16px] sm:rounded-[18px] p-3 sm:p-3.5 bg-gradient-to-br from-purple-50/90 to-fuchsia-50/70 border border-purple-200/70 shadow-sm flex items-center gap-2.5 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                <FaLayerGroup size={14} className="sm:text-base" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-purple-600 m-0 truncate">Active Indian Zones</p>
                                <p className="text-xs sm:text-sm font-black text-slate-800 m-0 truncate">{zonalBreakdown.length} Macro Zones</p>
                                <p className="text-[10px] sm:text-[11px] text-purple-700 m-0 truncate">{stateData.length} Covered States</p>
                            </div>
                        </div>
                    </div>

                    {/* Interactive India Map & State Matrix Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
                        {/* Interactive India Map Visual */}
                        <div className="lg:col-span-7">
                            <GlassCard title="Spatial Heatmap & Key State Pulse Hotspots" subtitle="Hover or tap state for stats, click state to inspect full state drilldown">
                                <div className="relative mt-2 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[520px]">
                                    <svg viewBox={INDIA_VIEWBOX} style={{ height: svgMapHeight }} className="w-full drop-shadow-md select-none">
                                        {INDIA_LOCATIONS.map((loc) => {
                                            const sData = stateMapLookup.get(loc.id.toLowerCase()) || stateMapLookup.get(loc.name.toLowerCase());
                                            const lastFyId = fyList[fyList.length - 1]?.fyId;
                                            const curMetrics = sData?.byFy[lastFyId];

                                            let val = 0;
                                            if (curMetrics) {
                                                if (metricMode === "sales") val = curMetrics.sales;
                                                else if (metricMode === "netSales") val = curMetrics.netSales;
                                                else if (metricMode === "purchase") val = curMetrics.purchase;
                                                else if (metricMode === "collections") val = curMetrics.collections;
                                                else if (metricMode === "returnsRatio") val = curMetrics.returnsRatioPercent;
                                            }

                                            const fillColor = getHeatmapColor(val, maxMetricVal, metricMode, sData?.salesGrowthPct, sData?.healthScore);
                                            const isSelected = selectedState?.stateId.toLowerCase() === loc.id.toLowerCase();
                                            const isCompared = compareStateIds.includes(loc.id.toLowerCase());

                                            return (
                                                <path
                                                    key={loc.id}
                                                    d={loc.path}
                                                    fill={fillColor}
                                                    stroke={isSelected ? "#312e81" : isCompared ? "#f59e0b" : "#ffffff"}
                                                    strokeWidth={isSelected ? "3" : isCompared ? "2" : "1"}
                                                    className="transition-all duration-300 cursor-pointer hover:opacity-85 hover:stroke-indigo-600 hover:stroke-[2.5]"
                                                    onMouseEnter={() => setHoveredState({ path: loc, data: sData })}
                                                    onMouseLeave={() => setHoveredState(null)}
                                                    onClick={() => sData && setSelectedState(sData)}
                                                />
                                            );
                                        })}

                                        {/* Pulsing rings on major state hotspots */}
                                        {Object.entries(STATE_HOTSPOTS).map(([sId, spot]) => {
                                            const sData = stateMapLookup.get(sId);
                                            if (!sData) return null;
                                            return (
                                                <g key={sId} className="cursor-pointer" onClick={() => setSelectedState(sData)}>
                                                    <circle cx={spot.cx} cy={spot.cy} r="10" className="fill-indigo-500/20 animate-ping" />
                                                    <circle cx={spot.cx} cy={spot.cy} r="4" className="fill-indigo-600 stroke-white stroke-2 shadow-lg" />
                                                </g>
                                            );
                                        })}
                                    </svg>

                                    {/* Hover State Tooltip Popup */}
                                    {hoveredState && (
                                        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 p-2.5 sm:p-3.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-indigo-200 shadow-2xl max-w-[200px] sm:max-w-[240px] text-xs pointer-events-none space-y-1 sm:space-y-1.5 animate-in fade-in zoom-in-95">
                                            <div className="flex items-center justify-between font-black text-slate-800 border-b border-slate-100 pb-1">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                                                    <span className="truncate">{hoveredState.path.name}</span>
                                                </div>
                                                {hoveredState.data && <HealthRing score={hoveredState.data.healthScore} />}
                                            </div>
                                            {hoveredState.data ? (
                                                <div className="space-y-1 pt-0.5 text-[10px] sm:text-[11px]">
                                                    {fyList.map(fy => (
                                                        <div key={fy.fyId} className="flex justify-between gap-2 text-slate-600">
                                                            <span>{fy.fyName}:</span>
                                                            <span className="font-bold text-slate-900">{formatCr(hoveredState.data?.byFy[fy.fyId]?.sales ?? 0)}</span>
                                                        </div>
                                                    ))}
                                                    {hoveredState.data.salesGrowthPct !== null && (
                                                        <div className="flex justify-between gap-1.5 pt-1 border-t border-slate-100">
                                                            <span className="text-slate-400">Growth:</span>
                                                            <GrowthBadge pct={hoveredState.data.salesGrowthPct} />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-slate-400 m-0">No transaction data recorded</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Heatmap spectrum legend */}
                                    <div className="flex items-center justify-center gap-2 mt-2 text-[9px] sm:text-[10px] font-bold text-slate-500">
                                        <span>Low ({metricMode === "growth" ? "-15%" : metricMode === "health" ? "0 Score" : "Min"})</span>
                                        <div className="h-2 w-24 sm:w-32 rounded-full bg-gradient-to-r from-indigo-200 via-indigo-500 to-indigo-900" />
                                        <span>High ({metricMode === "growth" ? "+30%" : metricMode === "health" ? "100 Score" : formatCr(maxMetricVal)})</span>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>

                        {/* State Matrix & Quick Multi-State Radar */}
                        <div className="lg:col-span-5 space-y-3.5 sm:space-y-4">
                            <GlassCard title="State Matrix &amp; Multi-State Select" subtitle="Click checkbox to pick states for side-by-side Radar Comparison">
                                <div className="mb-2.5 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <FaSearch size={11} className="absolute left-3 top-3 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search state or zone..."
                                            value={searchState}
                                            onChange={(e) => setSearchState(e.target.value)}
                                            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    {compareStateIds.length > 0 && (
                                        <button onClick={() => setCompareStateIds([])} className="text-[10px] font-bold px-2.5 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 shrink-0">
                                            Clear ({compareStateIds.length})
                                        </button>
                                    )}
                                </div>

                                <div className="overflow-x-auto max-h-[300px] sm:max-h-[380px] scrollbar-thin rounded-xl border border-slate-200/50">
                                    <table className="w-full text-xs min-w-[420px]">
                                        <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-10">
                                            <tr className="border-b border-slate-200/60">
                                                <th className="w-8 py-2 px-1.5 text-center text-slate-400">VS</th>
                                                <th className="text-left py-2 px-2 sm:px-3 text-slate-500 font-semibold">State Name</th>
                                                {fyList.map(fy => (
                                                    <th key={fy.fyId} className="text-right py-2 px-2 font-black" style={{ color: fy.color }}>{fy.fyName}</th>
                                                ))}
                                                <th className="text-right py-2 px-2 text-slate-400 font-semibold">Score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStateTable.map((st) => {
                                                const isCompared = compareStateIds.includes(st.stateId);
                                                return (
                                                    <tr key={st.stateId}
                                                        className={`border-b border-slate-100/60 transition-colors ${selectedState?.stateId === st.stateId ? "bg-indigo-50/80 font-bold" : "hover:bg-white/60"}`}>
                                                        <td className="py-2 px-1.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isCompared}
                                                                onChange={() => toggleCompareState(st.stateId)}
                                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-2 sm:px-3 font-bold text-slate-800 cursor-pointer" onClick={() => setSelectedState(st)}>
                                                            <div className="flex items-center gap-1.5">
                                                                <FaMapMarkerAlt size={10} className="text-indigo-500 shrink-0" />
                                                                <span className="truncate max-w-[120px] sm:max-w-none">{st.stateName}</span>
                                                                <span className="text-[9px] text-slate-400 font-normal hidden sm:inline">({st.zoneName})</span>
                                                            </div>
                                                        </td>
                                                        {fyList.map(fy => (
                                                            <td key={fy.fyId} className="py-2 px-2 text-right font-bold text-slate-800 cursor-pointer" onClick={() => setSelectedState(st)}>
                                                                {formatCr(st.byFy[fy.fyId]?.sales ?? 0)}
                                                            </td>
                                                        ))}
                                                        <td className="py-2 px-2 text-right cursor-pointer" onClick={() => setSelectedState(st)}>
                                                            <HealthRing score={st.healthScore} />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </div>
                    </div>

                    {/* Zonal Breakdown & Multi-State Radar Comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
                        {/* Zonal Share Donut Chart */}
                        <div className="lg:col-span-5">
                            <GlassCard title="Zonal Regional Sales Share" subtitle="North · West · South · East · Central · NorthEast">
                                <div className="mt-2" style={{ height: chartHeightZonal }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={zonalBreakdown} dataKey="totalSales" nameKey="zoneName"
                                                cx="50%" cy="45%" outerRadius={pieRadiusOuter} innerRadius={pieRadiusInner} paddingAngle={4}
                                                label={(d: any) => d.percent > 0.08 ? `${(d.percent * 100).toFixed(0)}%` : ""}>
                                                {zonalBreakdown.map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={glassTooltipStyle} formatter={(v: any) => formatCr(Number(v))} />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: isMobile ? 10 : 11, color: "#64748b" }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Multi-State Radar View */}
                        <div className="lg:col-span-7">
                            <GlassCard title="Multi-State Side-by-Side Radar Comparison" subtitle={compareStateIds.length >= 2 ? `Comparing ${compareStateIds.length} states across 6 business dimensions` : "Tick 'VS' checkboxes in the table above to compare 2 or 3 states directly"}>
                                {compareRadarData.length === 0 ? (
                                    <div className="flex flex-col items-center gap-3 py-10 sm:py-12 text-center">
                                        <FaExchangeAlt size={28} className="text-indigo-400 opacity-40 sm:text-3xl" />
                                        <p className="text-slate-400 font-semibold text-xs sm:text-sm">Select at least 2 states using the 'VS' checkboxes to enable Radar Comparison</p>
                                    </div>
                                ) : (
                                    <div className="mt-2" style={{ height: chartHeightZonal }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart data={compareRadarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                                                <PolarGrid stroke="rgba(100,116,139,0.2)" />
                                                <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: isMobile ? 9 : 11, fontWeight: 600 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: isMobile ? 8 : 9 }} />
                                                {compareStateIds.map((sId, idx) => {
                                                    const sName = stateData.find(s => s.stateId === sId)?.stateName;
                                                    const col = FY_PALETTE[idx % FY_PALETTE.length];
                                                    return (
                                                        <Radar key={sId} name={sName} dataKey={sName}
                                                            stroke={col} fill={col} fillOpacity={0.15} strokeWidth={2.5} dot={{ r: 3, fill: col }} />
                                                    );
                                                })}
                                                <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 11, color: "#64748b" }} />
                                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v: any) => `${v}/100`} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </GlassCard>
                        </div>
                    </div>
                </div>
            )}

            {/* ── State Drilldown Glass Slide-Over Drawer (4-Tabbed) ─────── */}
            {selectedState && (
                <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/30 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full sm:max-w-2xl bg-white/95 backdrop-blur-2xl h-full shadow-2xl overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 border-l border-white/80 animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md text-sm sm:text-base shrink-0">
                                    {selectedState.stateId.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-base sm:text-lg font-black text-slate-900 m-0 truncate">{selectedState.stateName}</h2>
                                        <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{selectedState.zoneName} Zone</span>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-slate-500 m-0 truncate">Multi-FY Spatial Intelligence &amp; Customer/Product Drilldown</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedState(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors shrink-0">
                                <FaTimes size={14} />
                            </button>
                        </div>

                        {/* 4 Tabs */}
                        <div className="flex overflow-x-auto scrollbar-hide border-b border-slate-200 gap-1.5 pb-2">
                            {[
                                { key: "overview", label: "Overview & Metrics", icon: <FaEye size={11} /> },
                                { key: "monthly", label: "12-Month Sales Trend", icon: <FaChartLine size={11} /> },
                                { key: "customers", label: "Key Accounts", icon: <FaUserCheck size={11} /> },
                                { key: "products", label: "Product Formulations", icon: <FaBoxes size={11} /> },
                            ].map(t => (
                                <button key={t.key} onClick={() => setDrawerTab(t.key as any)}
                                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold whitespace-nowrap transition-all shrink-0 ${drawerTab === t.key ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 bg-slate-100/70"}`}>
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab 1: Overview */}
                        {drawerTab === "overview" && (
                            <div className="space-y-3.5 sm:space-y-4">
                                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                    <div className="p-2.5 sm:p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                                        <p className="text-[9px] sm:text-[10px] font-bold uppercase text-indigo-600 m-0 truncate">Total Sales</p>
                                        <p className="text-xs sm:text-lg font-black text-slate-900 m-0 truncate">{formatCr(selectedState.totalSales)}</p>
                                    </div>
                                    <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                                        <p className="text-[9px] sm:text-[10px] font-bold uppercase text-emerald-600 m-0 truncate">Net Sales</p>
                                        <p className="text-xs sm:text-lg font-black text-slate-900 m-0 truncate">{formatCr(selectedState.totalNetSales)}</p>
                                    </div>
                                    <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
                                        <p className="text-[9px] sm:text-[10px] font-bold uppercase text-amber-600 m-0 truncate">Health Score</p>
                                        <p className="text-xs sm:text-lg font-black text-slate-900 m-0 truncate">{selectedState.healthScore}/100</p>
                                    </div>
                                </div>

                                <GlassCard title="Multi-FY Metrics Comparison" subtitle="Sales vs Purchase vs Collections across selected FYs">
                                    <div className="mt-2" style={{ height: isMobile ? 180 : 220 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={fyList.map(fy => ({
                                                fyName: fy.fyName,
                                                Sales: selectedState.byFy[fy.fyId]?.sales ?? 0,
                                                Purchase: selectedState.byFy[fy.fyId]?.purchase ?? 0,
                                                Collections: selectedState.byFy[fy.fyId]?.collections ?? 0,
                                            }))} margin={{ left: 0, right: 8 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                                                <XAxis dataKey="fyName" fontSize={isMobile ? 9 : 10} tick={{ fill: "#64748b" }} />
                                                <YAxis fontSize={isMobile ? 9 : 10} tickFormatter={formatCr} width={yAxisWidthDrawer} tick={{ fill: "#64748b" }} />
                                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v: any) => formatCr(Number(v))} />
                                                <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 11, color: "#64748b" }} />
                                                <Bar dataKey="Sales" fill="#6366F1" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="Purchase" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="Collections" fill="#10B981" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </GlassCard>
                            </div>
                        )}

                        {/* Tab 2: 12-Month Sales Trend */}
                        {drawerTab === "monthly" && (
                            <GlassCard title="12-Month Sales Seasonality (Apr – Mar)" subtitle="Monthly sales performance per FY for this state">
                                <div className="mt-2" style={{ height: isMobile ? 220 : 280 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={drawerMonthlyChartData} margin={{ left: 0, right: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                                            <XAxis dataKey="month" fontSize={isMobile ? 9 : 10} tick={{ fill: "#64748b" }} />
                                            <YAxis fontSize={isMobile ? 9 : 10} tickFormatter={formatCr} width={yAxisWidthDrawer} tick={{ fill: "#64748b" }} />
                                            <Tooltip contentStyle={glassTooltipStyle} formatter={(v: any) => formatCr(Number(v))} />
                                            <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 11, color: "#64748b" }} />
                                            {fyList.map(fy => (
                                                <Line key={fy.fyId} type="monotone" dataKey={fy.fyName} stroke={fy.color} strokeWidth={2.5} dot={{ r: isMobile ? 2 : 3 }} />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </GlassCard>
                        )}

                        {/* Tab 3: Key Accounts */}
                        {drawerTab === "customers" && (
                            <GlassCard title="Top Key Accounts &amp; Customers in State" subtitle="Ranked by sales volume in state">
                                {selectedState.topCustomers.length === 0 ? (
                                    <p className="text-xs text-slate-400 m-0 py-4">No individual party breakdown available</p>
                                ) : (
                                    <div className="space-y-2 mt-2">
                                        {selectedState.topCustomers.map((cust, ci) => (
                                            <div key={ci} className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/70 border border-slate-200/50 text-[11px] sm:text-xs">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[9px] sm:text-[10px] shrink-0">
                                                        #{ci + 1}
                                                    </div>
                                                    <span className="font-bold text-slate-800 truncate">{cust.name}</span>
                                                </div>
                                                <span className="font-black text-indigo-600 shrink-0">{formatCr(cust.sales)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </GlassCard>
                        )}

                        {/* Tab 4: Product Formulations */}
                        {drawerTab === "products" && (
                            <GlassCard title="Top Product Formulations Sold in State" subtitle="Highest demand product formulations">
                                {selectedState.topProducts.length === 0 ? (
                                    <p className="text-xs text-slate-400 m-0 py-4">No product formulation breakdown available</p>
                                ) : (
                                    <div className="space-y-2 mt-2">
                                        {selectedState.topProducts.map((prod, pi) => (
                                            <div key={pi} className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/70 border border-slate-200/50 text-[11px] sm:text-xs">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <FaBoxes size={12} className="text-slate-400 shrink-0" />
                                                    <span className="font-bold text-slate-800 truncate max-w-[140px] sm:max-w-[220px]">{prod.name}</span>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="font-black text-slate-900 block">{formatCr(prod.amount)}</span>
                                                    <span className="text-[9px] sm:text-[10px] text-slate-400">{prod.qty.toLocaleString("en-IN")} Qty</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </GlassCard>
                        )}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!loading && !hasLoaded && !error && (
                <GlassCard>
                    <div className="flex flex-col items-center gap-4 sm:gap-5 py-10 sm:py-14 text-center px-2">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] sm:rounded-[24px] flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))", border: "1px solid rgba(99,102,241,0.2)" }}>
                            <FaGlobeAsia size={28} className="text-indigo-500 opacity-60 sm:text-3xl" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-[17px] font-black text-slate-800 mb-1.5">Select Financial Years &amp; Load Area Map</h3>
                            <p className="text-xs sm:text-[13px] text-slate-500 max-w-md">
                                Tick the financial years above, then click <span className="text-indigo-600 font-semibold">Load Area Analytics</span> to render the India spatial comparison dashboard.
                            </p>
                        </div>
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
