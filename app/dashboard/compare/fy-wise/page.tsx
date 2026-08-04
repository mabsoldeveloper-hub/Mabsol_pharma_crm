/**
 * app/dashboard/compare/fy-wise/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Financial Year Wise Comparison Dashboard — Premium Light Glass Edition
 * ─────────────────────────────────────────────────────────────────────────────
 */
"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
    FaChartBar, FaCalendarAlt, FaBalanceScale, FaRupeeSign,
    FaSync, FaCheckSquare, FaRegSquare, FaArrowUp, FaArrowDown,
    FaBoxes, FaBuilding, FaWallet, FaChartLine, FaUndo, FaShoppingBag,
    FaMapMarkerAlt, FaArrowRight, FaDownload, FaFilter, FaEye,
    FaTrophy, FaExclamationTriangle, FaMinus, FaInfoCircle,
} from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    ComposedChart, Area,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type FYSummary = {
    totalSales: number; netSales: number; salesReturns: number;
    totalPurchases: number; totalCollections: number; totalPayments: number;
    returnsRatioPercent: number; collectionEfficiencyPercent: number;
};
type MonthlyRow = {
    monthLabel: string; monthIndex: number;
    sales: number; purchase: number; returns: number;
    collections: number; payments: number;
};
type QuarterRow = { quarter: string; sales: number; purchase: number; collections: number; returns: number };
type ProductRow = { code: number; productName: string; qty: number; amount: number };
type CompanyRow = { company: string; qty: number; amount: number };
type FYData = {
    fyId: string; fyName: string; fyCode: string;
    startDate: string; endDate: string; color: string;
    summary: FYSummary;
    monthlyBreakdown: MonthlyRow[];
    quarterlyBreakdown: QuarterRow[];
    topProducts: ProductRow[];
    companyBreakdown: CompanyRow[];
};
type MrInfo = { isMrRestricted: boolean; territories: any[]; allowedCompanyCodes: string[] };

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const FY_PALETTE = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];
const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const PIE_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16"];

const SECTIONS = [
    { key: "overview",  label: "Overview",     icon: <FaEye size={12} /> },
    { key: "monthly",   label: "Monthly",       icon: <FaChartLine size={12} /> },
    { key: "quarterly", label: "Quarterly",     icon: <FaCalendarAlt size={12} /> },
    { key: "svp",       label: "Sales vs Buy",  icon: <FaChartBar size={12} /> },
    { key: "returns",   label: "Returns",       icon: <FaUndo size={12} /> },
    { key: "products",  label: "Products",      icon: <FaBoxes size={12} /> },
    { key: "company",   label: "Divisions",     icon: <FaBuilding size={12} /> },
    { key: "radar",     label: "Radar View",    icon: <FaBalanceScale size={12} /> },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);

const formatCr = (n: number) => {
    if (!n && n !== 0) return "₹0";
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
    if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
    if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)} K`;
    return `₹${formatINR(n)}`;
};

const growthPct = (curr: number, prev: number): number | null => {
    if (!prev) return null;
    return Number((((curr - prev) / prev) * 100).toFixed(1));
};

const glassTooltip: React.CSSProperties = {
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.8)",
    borderRadius: 14,
    boxShadow: "0 8px 32px rgba(31,41,55,0.14)",
    fontSize: 12,
    color: "#0f172a",
    fontWeight: 600,
    padding: "10px 14px",
};

// Animated counter hook
function useAnimatedCount(target: number, duration = 900) {
    const [count, setCount] = useState(0);
    const rafRef = useRef<number | undefined>(undefined);
    useEffect(() => {
        const start = Date.now();
        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [target, duration]);
    return count;
}

// Export CSV
function exportCSV(fyData: FYData[]) {
    const rows: string[] = [];
    rows.push(["Metric", ...fyData.map(f => f.fyName)].join(","));
    const metrics: [string, keyof FYSummary][] = [
        ["Gross Sales", "totalSales"], ["Net Sales", "netSales"],
        ["Sales Returns", "salesReturns"], ["Purchases", "totalPurchases"],
        ["Collections", "totalCollections"], ["Payments", "totalPayments"],
        ["Returns Ratio %", "returnsRatioPercent"], ["Collection Efficiency %", "collectionEfficiencyPercent"],
    ];
    metrics.forEach(([label, key]) => {
        rows.push([label, ...fyData.map(f => String(f.summary[key]))].join(","));
    });
    rows.push(""); rows.push(["Monthly Sales", ...fyData.map(f => f.fyName)].join(","));
    MONTH_LABELS.forEach((m, idx) => {
        rows.push([m, ...fyData.map(f => String(f.monthlyBreakdown[idx]?.sales ?? 0))].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `FY_Comparison_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
}

// Heat map cell color (light theme)
function heatColor(val: number, max: number): string {
    if (!max || !val) return "rgba(99,102,241,0.04)";
    const ratio = val / max;
    if (ratio > 0.8) return "rgba(99,102,241,0.65)";
    if (ratio > 0.6) return "rgba(99,102,241,0.42)";
    if (ratio > 0.4) return "rgba(99,102,241,0.26)";
    if (ratio > 0.2) return "rgba(99,102,241,0.14)";
    return "rgba(99,102,241,0.07)";
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function AmbientBg() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: "linear-gradient(160deg, #F0F4FF 0%, #EDF0FB 40%, #F5F0FF 70%, #EEF5F0 100%)" }}>
            <div className="absolute -top-48 -left-40 w-[600px] h-[600px] rounded-full opacity-60 blur-[130px]" style={{ background: "radial-gradient(circle, #C7D2FE, #818CF820)" }} />
            <div className="absolute top-1/4 -right-40 w-[560px] h-[560px] rounded-full opacity-50 blur-[130px]" style={{ background: "radial-gradient(circle, #D8B4FE, #A78BFA20)" }} />
            <div className="absolute bottom-[-120px] left-1/4 w-[600px] h-[600px] rounded-full opacity-45 blur-[140px]" style={{ background: "radial-gradient(circle, #A7F3D0, #10B98120)" }} />
            <div className="absolute top-2/3 right-1/3 w-[400px] h-[400px] rounded-full opacity-35 blur-[120px]" style={{ background: "radial-gradient(circle, #FDE68A, #F59E0B20)" }} />
        </div>
    );
}

function GlassCard({ children, className = "", noPad = false, title, subtitle, accent }: {
    children: React.ReactNode; className?: string; noPad?: boolean;
    title?: string; subtitle?: string; accent?: string;
}) {
    return (
        <div className={`relative rounded-[22px] overflow-hidden ${className}`}
            style={{
                background: "rgba(255,255,255,0.55)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                border: "1px solid rgba(255,255,255,0.75)",
                boxShadow: "0 4px 24px rgba(99,102,241,0.07), 0 1px 0 rgba(255,255,255,0.9) inset",
            }}>
            {/* Top shimmer line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            {/* Left accent */}
            {accent && <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full" style={{ background: `linear-gradient(180deg, ${accent}, ${accent}50)` }} />}
            {(title || subtitle) && (
                <div className={`px-5 pt-5 pb-0 ${accent ? "pl-6" : ""}`}>
                    {title && <h3 className="text-[14px] font-black text-slate-800 tracking-tight m-0">{title}</h3>}
                    {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 m-0 font-medium">{subtitle}</p>}
                </div>
            )}
            <div className={noPad ? "" : "p-5"}>{children}</div>
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="rounded-[18px] overflow-hidden animate-pulse" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.7)" }}>
            <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200/60" />
                    <div className="h-2.5 rounded-lg bg-slate-200/80 w-1/3" />
                </div>
                <div className="h-6 rounded-xl bg-gradient-to-r from-slate-100 to-slate-200/50 w-2/3" />
                <div className="h-1.5 rounded-full bg-slate-100 w-full" />
            </div>
        </div>
    );
}

function AnimatedKPICard({ label, value, prev, color, icon, lowerIsBetter = false }: {
    label: string; value: number; prev?: number; color: string; icon: React.ReactNode; lowerIsBetter?: boolean;
}) {
    const animated = useAnimatedCount(value);
    const pct = prev !== undefined ? growthPct(value, prev) : null;
    const positive = pct === null ? null : lowerIsBetter ? pct < 0 : pct > 0;
    const maxVal = Math.max(value, prev ?? 0);
    const barWidth = maxVal > 0 ? Math.round((value / maxVal) * 100) : 0;

    return (
        <div
            className="relative rounded-[18px] p-4 overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5 cursor-default"
            style={{
                background: `linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.65))`,
                backdropFilter: "blur(20px)",
                border: `1px solid ${color}25`,
                boxShadow: `0 4px 20px ${color}12, 0 1px 0 rgba(255,255,255,0.9) inset`,
            }}
        >
            {/* Top color accent line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-[18px]" style={{ background: `linear-gradient(90deg, ${color}00, ${color}CC, ${color}00)` }} />
            {/* Subtle corner glow */}
            <div className="pointer-events-none absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl" style={{ background: `${color}20` }} />

            <div className="flex items-start justify-between mb-3">
                {/* Icon with strong color */}
                <div
                    className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                        background: `linear-gradient(135deg, ${color}25, ${color}12)`,
                        boxShadow: `0 4px 12px ${color}30, inset 0 1px 0 ${color}20`,
                        color: color,
                    }}
                >
                    {icon}
                </div>
                {/* Growth badge */}
                {pct !== null && (
                    <span
                        className="flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={positive
                            ? { background: "linear-gradient(135deg, #D1FAE5, #A7F3D0)", color: "#065F46", border: "1px solid #6EE7B7" }
                            : positive === false
                            ? { background: "linear-gradient(135deg, #FEE2E2, #FECACA)", color: "#991B1B", border: "1px solid #FCA5A5" }
                            : { background: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }
                        }
                    >
                        {positive ? <FaArrowUp size={7} /> : positive === false ? <FaArrowDown size={7} /> : <FaMinus size={7} />}
                        {Math.abs(pct)}%
                    </span>
                )}
            </div>

            {/* Label */}
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] m-0 mb-1" style={{ color: `${color}BB` }}>{label}</p>
            {/* Value */}
            <p className="text-[22px] font-black text-slate-900 m-0 tracking-tight leading-none">{formatCr(animated)}</p>
            {prev !== undefined && (
                <p className="text-[10px] text-slate-400 m-0 mt-1">Prev: {formatCr(prev)}</p>
            )}
            {/* Progress bar */}
            <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ background: `${color}12` }}>
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${barWidth}%`, background: `linear-gradient(90deg, ${color}60, ${color})` }}
                />
            </div>
        </div>
    );
}

function GrowthBadge({ curr, prev, lowerIsBetter = false, size = "sm" }: {
    curr: number; prev: number; lowerIsBetter?: boolean; size?: "sm" | "lg";
}) {
    const pct = growthPct(curr, prev);
    if (pct === null) return <span className="text-slate-300 text-[10px]">—</span>;
    const positive = lowerIsBetter ? pct < 0 : pct > 0;
    const neutral = pct === 0;
    const base = size === "lg" ? "text-[12px] px-3 py-1 gap-1" : "text-[10px] px-2 py-0.5 gap-0.5";
    return (
        <span
            className={`inline-flex items-center font-black rounded-full ${base}`}
            style={neutral
                ? { background: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0" }
                : positive
                ? { background: "linear-gradient(135deg, #D1FAE5, #A7F3D0)", color: "#065F46", border: "1px solid #6EE7B7" }
                : { background: "linear-gradient(135deg, #FEE2E2, #FECACA)", color: "#991B1B", border: "1px solid #FCA5A5" }
            }
        >
            {!neutral && (positive ? <FaArrowUp size={size === "lg" ? 9 : 7} /> : <FaArrowDown size={size === "lg" ? 9 : 7} />)}
            {pct > 0 ? "+" : ""}{pct}%
        </span>
    );
}

function BestBadge() {
    return (
        <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", color: "#92400E", border: "1px solid #F59E0B" }}>
            <FaTrophy size={7} /> BEST
        </span>
    );
}

function ChartWrap({ height = 300, children }: { height?: number; children: React.ReactNode }) {
    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                {children as any}
            </ResponsiveContainer>
        </div>
    );
}

// Sticky summary bar — light theme
function StickySummaryBar({ fyData }: { fyData: FYData[] }) {
    if (!fyData.length) return null;
    const latest = fyData[fyData.length - 1];
    const prev = fyData.length > 1 ? fyData[fyData.length - 2] : undefined;
    return (
        <div className="sticky top-0 z-30 rounded-[16px] overflow-hidden border border-white/60 bg-white/80 backdrop-blur-2xl shadow-[0_4px_24px_rgba(31,41,55,0.1)]">
            <div className="flex items-center gap-3 px-4 py-2.5 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: latest.color }} />
                    <span className="text-[11px] font-black" style={{ color: latest.color }}>{latest.fyName}</span>
                </div>
                <div className="h-4 w-px bg-slate-200 flex-shrink-0" />
                {[
                    { l: "Sales", v: latest.summary.totalSales, p: prev?.summary.totalSales },
                    { l: "Net Sales", v: latest.summary.netSales, p: prev?.summary.netSales },
                    { l: "Purchase", v: latest.summary.totalPurchases, p: prev?.summary.totalPurchases },
                    { l: "Collections", v: latest.summary.totalCollections, p: prev?.summary.totalCollections },
                ].map((item) => (
                    <div key={item.l} className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                        <span className="text-[10px] text-slate-400 font-semibold">{item.l}</span>
                        <span className="text-[12px] font-black text-slate-800">{formatCr(item.v)}</span>
                        {item.p !== undefined && <GrowthBadge curr={item.v} prev={item.p} />}
                        <div className="h-4 w-px bg-slate-200" />
                    </div>
                ))}
                <span className={`ml-auto whitespace-nowrap flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${latest.summary.collectionEfficiencyPercent >= 80 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                    Coll. Eff. {latest.summary.collectionEfficiencyPercent}%
                </span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function FYWiseComparisonPage() {
    const { fyList } = useFinancialYear();
    const { selectedCompany } = useCompany();

    const [selectedFyIds, setSelectedFyIds] = useState<string[]>([]);
    const [fyData, setFyData] = useState<FYData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState("overview");
    const [mrInfo, setMrInfo] = useState<MrInfo | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Available FYs (exclude "ALL")
    const availableFYs = useMemo(() =>
        fyList.filter((f) => !f.isAll && f._id !== "ALL"), [fyList]);

    // MR territory info
    useEffect(() => {
        fetch("/api/mr-territory/my-territories").then(r => r.ok ? r.json() : null)
            .then(j => { if (j?.success) setMrInfo({ isMrRestricted: j.isMrRestricted, territories: j.territories || [], allowedCompanyCodes: j.allowedCompanyCodes || [] }); })
            .catch(() => {});
    }, []);

    // ── FIX: NO auto-preselect — user must explicitly choose FYs ──────────
    // This prevents ghost/duplicate FYs appearing that user didn't select

    const toggleFY = useCallback((id: string) => {
        setSelectedFyIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }, []);

    const loadData = useCallback(async () => {
        if (selectedFyIds.length === 0) return;
        setLoading(true); setError(null);
        try {
            const params = new URLSearchParams();
            // Only pass the EXACT selected IDs — deduplicated
            const uniqueIds = Array.from(new Set(selectedFyIds));
            params.set("fyIds", uniqueIds.join(","));
            if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
            const res = await fetch(`/api/dashboard/compare/fy-wise?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Failed");
            // Assign palette colors — one per UNIQUE fyId
            const colored = json.fyData.map((d: FYData, i: number) => ({
                ...d,
                color: FY_PALETTE[i % FY_PALETTE.length],
            }));
            setFyData(colored);
            setHasLoaded(true);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [selectedFyIds, selectedCompany]);

    // Re-fetch when company changes
    useEffect(() => {
        const h = () => hasLoaded && loadData();
        window.addEventListener("company-changed", h);
        return () => window.removeEventListener("company-changed", h);
    }, [loadData, hasLoaded]);

    // ── Derived chart data ─────────────────────────────────────────────────
    const monthlyChartData = useMemo(() => MONTH_LABELS.map((month, idx) => {
        const row: any = { month };
        fyData.forEach(fy => {
            const m = fy.monthlyBreakdown.find(r => r.monthIndex === idx);
            row[`${fy.fyName}_sales`] = m?.sales ?? 0;
            row[`${fy.fyName}_purchase`] = m?.purchase ?? 0;
            row[`${fy.fyName}_collections`] = m?.collections ?? 0;
            row[`${fy.fyName}_returns`] = m?.returns ?? 0;
        });
        return row;
    }), [fyData]);

    const quarterlyChartData = useMemo(() =>
        ["Q1 (Apr-Jun)", "Q2 (Jul-Sep)", "Q3 (Oct-Dec)", "Q4 (Jan-Mar)"].map(q => {
            const row: any = { quarter: q.split(" ")[0] };
            fyData.forEach(fy => {
                const qr = fy.quarterlyBreakdown.find(r => r.quarter === q);
                row[`${fy.fyName}_sales`] = qr?.sales ?? 0;
                row[`${fy.fyName}_purchase`] = qr?.purchase ?? 0;
                row[`${fy.fyName}_collections`] = qr?.collections ?? 0;
            });
            return row;
        }), [fyData]);

    const svpChartData = useMemo(() => fyData.map(fy => ({
        fy: fy.fyName,
        "Sales": fy.summary.totalSales,
        "Net Sales": fy.summary.netSales,
        "Purchase": fy.summary.totalPurchases,
        "Collections": fy.summary.totalCollections,
    })), [fyData]);

    const productChartData = useMemo(() => {
        if (!fyData.length) return [];
        const map = new Map<string, any>();
        fyData.forEach(fy => fy.topProducts.forEach(p => {
            if (!map.has(p.productName)) map.set(p.productName, { productName: p.productName });
            map.get(p.productName)[`${fy.fyName}_amt`] = p.amount;
            map.get(p.productName)[`${fy.fyName}_qty`] = p.qty;
        }));
        const firstFy = fyData[0]?.fyName;
        return Array.from(map.values())
            .sort((a, b) => (b[`${firstFy}_amt`] ?? 0) - (a[`${firstFy}_amt`] ?? 0))
            .slice(0, 10);
    }, [fyData]);

    const radarData = useMemo(() => {
        if (fyData.length < 2) return [];
        const metrics = [
            { label: "Sales", key: "totalSales" as const },
            { label: "Net Sales", key: "netSales" as const },
            { label: "Collections", key: "totalCollections" as const },
            { label: "Purchase", key: "totalPurchases" as const },
            { label: "Returns", key: "salesReturns" as const },
            { label: "Payments", key: "totalPayments" as const },
        ];
        return metrics.map(({ label, key }) => {
            const vals = fyData.map(f => f.summary[key]);
            const max = Math.max(...vals) || 1;
            const row: any = { metric: label };
            fyData.forEach(f => { row[f.fyName] = Math.round((f.summary[key] / max) * 100); });
            return row;
        });
    }, [fyData]);

    const bestFY = useMemo(() => {
        if (!fyData.length) return {};
        return {
            sales: fyData.reduce((b, f) => f.summary.totalSales > b.summary.totalSales ? f : b).fyId,
            netSales: fyData.reduce((b, f) => f.summary.netSales > b.summary.netSales ? f : b).fyId,
            collections: fyData.reduce((b, f) => f.summary.totalCollections > b.summary.totalCollections ? f : b).fyId,
            purchase: fyData.reduce((b, f) => f.summary.totalPurchases > b.summary.totalPurchases ? f : b).fyId,
        };
    }, [fyData]);

    const monthlyMaxSales = useMemo(() =>
        Math.max(...fyData.flatMap(f => f.monthlyBreakdown.map(m => m.sales)), 1), [fyData]);

    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen p-3 sm:p-5 space-y-4 relative">
            <AmbientBg />

            {/* MR Banner */}
            {mrInfo?.isMrRestricted && (
                <div className="flex items-start gap-3 rounded-[18px] px-4 py-3 border border-amber-200 bg-amber-50/70">
                    <FaMapMarkerAlt size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-amber-800 mb-0.5">Territory Restricted View</p>
                        <p className="text-[11px] text-amber-700">Sirf apni assigned territory ka FY comparison data.</p>
                        {mrInfo.territories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {mrInfo.territories.map((t, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium border border-amber-200">
                                        <FaBuilding size={8} /> {t.companyName || t.companyCode}
                                        {t.divisionName && <><FaArrowRight size={7} className="opacity-40" /> {t.divisionName}</>}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Header */}
            <GlassCard>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 m-0">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
                                <FaBalanceScale size={18} className="text-white" />
                            </div>
                            Financial Year Comparison
                        </h1>
                        <p className="text-[12px] text-slate-500 mt-1.5 m-0 ml-[52px]">
                            Advanced multi-FY analysis — Sales · Purchase · Collections · Products · Divisions
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {selectedCompany && (
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <FaBuilding size={9} /> {selectedCompany.companyName}
                            </span>
                        )}
                        {fyData.length > 0 && (
                            <button onClick={() => exportCSV(fyData)}
                                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                                <FaDownload size={9} /> Export CSV
                            </button>
                        )}
                    </div>
                </div>
            </GlassCard>

            {/* ── FY Multi-Selector ──────────────────────────────────────── */}
            <GlassCard>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="text-[14px] font-black text-slate-800 flex items-center gap-2 m-0">
                            <FaFilter size={12} className="text-indigo-500" />
                            Select Financial Years to Compare
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 m-0">Tick the FYs you want to compare, then click Load</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedFyIds.length > 0 && (
                            <span className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                                {selectedFyIds.length} Selected
                            </span>
                        )}
                        <button onClick={loadData} disabled={loading || selectedFyIds.length === 0}
                            className="flex items-center gap-2 text-white text-[12px] font-black px-5 py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 hover:shadow-lg"
                            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
                            <FaSync size={11} className={loading ? "animate-spin" : ""} />
                            {loading ? "Loading…" : "Load Comparison"}
                        </button>
                    </div>
                </div>

                {availableFYs.length === 0 ? (
                    <div className="flex items-center gap-2 py-4 text-slate-400 text-sm">
                        <FaInfoCircle size={13} /> No financial years found.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {availableFYs.map((fy, i) => {
                            const isSelected = selectedFyIds.includes(fy._id);
                            const color = FY_PALETTE[i % FY_PALETTE.length];
                            return (
                                <button key={fy._id} onClick={() => toggleFY(fy._id)}
                                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-[14px] text-[12px] font-semibold transition-all duration-200 text-left hover:scale-[1.02] active:scale-95"
                                    style={isSelected
                                        ? { border: `1.5px solid ${color}50`, background: `linear-gradient(135deg, ${color}15, ${color}06)`, color: "#1e293b", boxShadow: `0 4px 12px ${color}20` }
                                        : { border: "1.5px solid rgba(148,163,184,0.3)", background: "rgba(255,255,255,0.5)", color: "#94a3b8" }}>
                                    <span style={{ color: isSelected ? color : "#cbd5e1" }}>
                                        {isSelected ? <FaCheckSquare size={14} /> : <FaRegSquare size={14} />}
                                    </span>
                                    <div>
                                        <div className="font-bold text-slate-700">{fy.fyName}</div>
                                        {fy.startDate && (
                                            <div className="text-[9px] text-slate-400">
                                                {new Date(fy.startDate).getFullYear()}–{new Date((fy as any).endDate ?? fy.startDate).getFullYear()}
                                            </div>
                                        )}
                                    </div>
                                    {isSelected && <div className="ml-auto w-2 h-2 rounded-full flex-shrink-0 shadow-md" style={{ background: color }} />}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Warning if 0 selected */}
                {selectedFyIds.length === 0 && (
                    <div className="flex items-center gap-1.5 mt-3 text-[11px] text-amber-600 font-medium">
                        <FaInfoCircle size={10} /> Please select at least 1 financial year to load comparison
                    </div>
                )}
            </GlassCard>

            {/* Error */}
            {error && (
                <div className="rounded-[16px] px-4 py-3 flex items-center gap-2 text-rose-600 text-[12px] font-medium border border-rose-200 bg-rose-50/70">
                    <FaExclamationTriangle size={13} /> {error}
                </div>
            )}

            {/* Skeleton loader */}
            {loading && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                    <GlassCard><div className="h-[280px] rounded-xl bg-slate-100/60 animate-pulse" /></GlassCard>
                </div>
            )}

            {/* ── Main Dashboard ─────────────────────────────────────────── */}
            {!loading && fyData.length > 0 && (
                <div className="space-y-4">
                    {/* Sticky bar */}
                    <StickySummaryBar fyData={fyData} />

                    {/* Tab bar */}
                    <GlassCard noPad>
                        <div className="flex overflow-x-auto scrollbar-hide p-2 gap-1">
                            {SECTIONS.map(sec => {
                                const isActive = activeSection === sec.key;
                                return (
                                    <button key={sec.key} onClick={() => setActiveSection(sec.key)}
                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-[12px] font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0"
                                        style={isActive
                                            ? { background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "white", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }
                                            : { color: "#64748b", background: "transparent" }}>
                                        {sec.icon} {sec.label}
                                    </button>
                                );
                            })}
                        </div>
                    </GlassCard>

                    {/* ══ OVERVIEW ══════════════════════════════════════════ */}
                    {activeSection === "overview" && (
                        <div className="space-y-4">
                            {fyData.map((fy, fyIdx) => {
                                const prev = fyData[fyIdx - 1];
                                return (
                                    <div key={fy.fyId}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-3 h-3 rounded-full shadow" style={{ background: fy.color }} />
                                            <h3 className="text-[14px] font-black text-slate-800 m-0">{fy.fyName}</h3>
                                            <span className="text-[10px] text-slate-400 bg-white/60 px-2 py-0.5 rounded-full border border-slate-200">{fy.startDate} → {fy.endDate}</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                            {[
                                                { l: "Gross Sales", v: fy.summary.totalSales, p: prev?.summary.totalSales, icon: <FaRupeeSign size={11} />, color: "#6366F1" },
                                                { l: "Net Sales", v: fy.summary.netSales, p: prev?.summary.netSales, icon: <FaChartLine size={11} />, color: "#10B981" },
                                                { l: "Purchases", v: fy.summary.totalPurchases, p: prev?.summary.totalPurchases, icon: <FaShoppingBag size={11} />, color: "#F59E0B" },
                                                { l: "Collections", v: fy.summary.totalCollections, p: prev?.summary.totalCollections, icon: <FaWallet size={11} />, color: "#06B6D4" },
                                                { l: "Returns (CN)", v: fy.summary.salesReturns, p: prev?.summary.salesReturns, icon: <FaUndo size={10} />, color: "#EF4444", lower: true },
                                                { l: "Payments", v: fy.summary.totalPayments, p: prev?.summary.totalPayments, icon: <FaRupeeSign size={11} />, color: "#8B5CF6" },
                                            ].map(item => (
                                                <AnimatedKPICard key={item.l} label={item.l} value={item.v} prev={item.p}
                                                    color={item.color} icon={item.icon} lowerIsBetter={!!item.lower} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* YoY table */}
                            {fyData.length >= 2 && (
                                <GlassCard title="Year-over-Year Comparison Table" subtitle="Key metrics with growth % across all selected financial years">
                                    <div className="overflow-x-auto mt-4">
                                        <table className="w-full text-[12px]">
                                            <thead>
                                                <tr className="border-b border-slate-200/60">
                                                    <th className="text-left py-3 px-3 text-slate-500 font-semibold">Metric</th>
                                                    {fyData.map(fy => (
                                                        <th key={fy.fyId} className="text-right py-3 px-3 font-black" style={{ color: fy.color }}>{fy.fyName}</th>
                                                    ))}
                                                    {fyData.length === 2 && <th className="text-right py-3 px-3 text-slate-400 font-semibold">YoY</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(([
                                                    { label: "Gross Sales", key: "totalSales", bestKey: "sales" },
                                                    { label: "Net Sales", key: "netSales", bestKey: "netSales" },
                                                    { label: "Sales Returns", key: "salesReturns", lowerBetter: true },
                                                    { label: "Purchases", key: "totalPurchases", bestKey: "purchase" },
                                                    { label: "Collections", key: "totalCollections", bestKey: "collections" },
                                                    { label: "Payments", key: "totalPayments" },
                                                    { label: "Returns Ratio %", key: "returnsRatioPercent", lowerBetter: true, isPercent: true },
                                                    { label: "Collection Eff. %", key: "collectionEfficiencyPercent", isPercent: true },
                                                ]) as any[]).map((row) => {
                                                    const pct = fyData.length === 2
                                                        ? growthPct((fyData[1].summary as any)[row.key], (fyData[0].summary as any)[row.key])
                                                        : null;
                                                    return (
                                                        <tr key={row.label} className="border-b border-slate-100/60 hover:bg-white/40 transition-colors">
                                                            <td className="py-3 px-3 text-slate-600 font-semibold">{row.label}</td>
                                                            {fyData.map(fy => (
                                                                <td key={fy.fyId} className="py-3 px-3 text-right">
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        {row.bestKey && (bestFY as any)[row.bestKey] === fy.fyId && <BestBadge />}
                                                                        <span className="font-bold text-slate-800">
                                                                            {row.isPercent
                                                                                ? `${(fy.summary as any)[row.key]}%`
                                                                                : formatCr((fy.summary as any)[row.key])}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            ))}
                                                            {pct !== null && (
                                                                <td className="py-3 px-3 text-right">
                                                                    <GrowthBadge
                                                                        curr={(fyData[1].summary as any)[row.key]}
                                                                        prev={(fyData[0].summary as any)[row.key]}
                                                                        lowerIsBetter={row.lowerBetter}
                                                                    />
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </GlassCard>
                            )}
                        </div>
                    )}

                    {/* ══ MONTHLY ═══════════════════════════════════════════ */}
                    {activeSection === "monthly" && (
                        <div className="space-y-4">
                            <GlassCard title="Monthly Sales — Multi-FY Area Chart" subtitle="Apr–Mar sales aligned across all financial years">
                                <div className="mt-4">
                                    <ChartWrap height={320}>
                                        <ComposedChart data={monthlyChartData} margin={{ left: 0, right: 8 }}>
                                            <defs>
                                                {fyData.map(fy => (
                                                    <linearGradient key={fy.fyId} id={`grad_${fy.fyId}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={fy.color} stopOpacity={0.25} />
                                                        <stop offset="95%" stopColor={fy.color} stopOpacity={0.01} />
                                                    </linearGradient>
                                                ))}
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                                            <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" tick={{ fill: "#64748b" }} />
                                            <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={formatCr} width={70} tick={{ fill: "#64748b" }} />
                                            <Tooltip contentStyle={glassTooltip} formatter={(v: any) => formatCr(Number(v))} />
                                            <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                                            {fyData.map(fy => (
                                                <Area key={fy.fyId} type="monotone" dataKey={`${fy.fyName}_sales`}
                                                    name={fy.fyName} stroke={fy.color} strokeWidth={2.5}
                                                    fill={`url(#grad_${fy.fyId})`}
                                                    dot={{ r: 3, fill: fy.color, strokeWidth: 0 }}
                                                    activeDot={{ r: 6, stroke: fy.color, strokeWidth: 2, fill: "#fff" }} />
                                            ))}
                                        </ComposedChart>
                                    </ChartWrap>
                                </div>
                            </GlassCard>

                            {/* Heat Map */}
                            <GlassCard title="Monthly Sales Heat Map" subtitle="Darker cell = higher sales. Hover for exact value.">
                                <div className="overflow-x-auto mt-4">
                                    <table className="w-full text-[11px]">
                                        <thead>
                                            <tr className="border-b border-slate-200/60">
                                                <th className="text-left py-2 px-3 text-slate-400 font-semibold">FY</th>
                                                {MONTH_LABELS.map(m => (
                                                    <th key={m} className="text-center py-2 px-1 text-slate-400 font-semibold min-w-[38px]">{m}</th>
                                                ))}
                                                <th className="text-right py-2 px-3 text-slate-400 font-semibold">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fyData.map(fy => (
                                                <tr key={fy.fyId}>
                                                    <td className="py-2 px-3 font-black whitespace-nowrap" style={{ color: fy.color }}>{fy.fyName}</td>
                                                    {MONTH_LABELS.map((_, idx) => {
                                                        const val = fy.monthlyBreakdown.find(r => r.monthIndex === idx)?.sales ?? 0;
                                                        const intense = val / monthlyMaxSales > 0.6;
                                                        return (
                                                            <td key={idx} className="py-1 px-0.5">
                                                                <div className="rounded-lg text-center py-1.5 px-0.5 text-[9px] font-bold transition-all hover:scale-110 cursor-default"
                                                                    style={{ background: heatColor(val, monthlyMaxSales), color: intense ? "white" : "#475569" }}
                                                                    title={`${fy.fyName} ${MONTH_LABELS[idx]}: ${formatCr(val)}`}>
                                                                    {val > 0 ? formatCr(val).replace("₹", "") : "—"}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-2 px-3 text-right font-black text-slate-800">{formatCr(fy.summary.totalSales)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>

                            <GlassCard title="Monthly Collections Trend" subtitle="Customer receipts comparison across FYs">
                                <div className="mt-4">
                                    <ChartWrap height={260}>
                                        <LineChart data={monthlyChartData} margin={{ left: 0, right: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                                            <XAxis dataKey="month" fontSize={11} tick={{ fill: "#64748b" }} />
                                            <YAxis fontSize={11} tickFormatter={formatCr} width={70} tick={{ fill: "#64748b" }} />
                                            <Tooltip contentStyle={glassTooltip} formatter={(v: any) => formatCr(Number(v))} />
                                            <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                                            {fyData.map((fy, i) => (
                                                <Line key={fy.fyId} type="monotone" dataKey={`${fy.fyName}_collections`}
                                                    name={fy.fyName} stroke={fy.color} strokeWidth={2.5}
                                                    strokeDasharray={i > 0 ? "5 3" : undefined}
                                                    dot={{ r: 3, fill: fy.color, strokeWidth: 0 }}
                                                    activeDot={{ r: 5 }} />
                                            ))}
                                        </LineChart>
                                    </ChartWrap>
                                </div>
                            </GlassCard>
                        </div>
                    )}

                    {/* ══ QUARTERLY ═════════════════════════════════════════ */}
                    {activeSection === "quarterly" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <GlassCard title="Quarterly Sales" subtitle="Q1–Q4 sales per FY side by side">
                                    <div className="mt-4"><ChartWrap height={280}>
                                        <BarChart data={quarterlyChartData} margin={{ left: 0, right: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                                            <XAxis dataKey="quarter" fontSize={11} tick={{ fill: "#64748b" }} />
                                            <YAxis fontSize={11} tickFormatter={formatCr} width={70} tick={{ fill: "#64748b" }} />
                                            <Tooltip contentStyle={glassTooltip} formatter={(v: any) => formatCr(Number(v))} />
                                            <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                                            {fyData.map(fy => (
                                                <Bar key={fy.fyId} dataKey={`${fy.fyName}_sales`} name={fy.fyName} fill={fy.color} radius={[5, 5, 0, 0]} />
                                            ))}
                                        </BarChart>
                                    </ChartWrap></div>
                                </GlassCard>
                                <GlassCard title="Quarterly Collections" subtitle="Collections per quarter across FYs">
                                    <div className="mt-4"><ChartWrap height={280}>
                                        <BarChart data={quarterlyChartData} margin={{ left: 0, right: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                                            <XAxis dataKey="quarter" fontSize={11} tick={{ fill: "#64748b" }} />
                                            <YAxis fontSize={11} tickFormatter={formatCr} width={70} tick={{ fill: "#64748b" }} />
                                            <Tooltip contentStyle={glassTooltip} formatter={(v: any) => formatCr(Number(v))} />
                                            <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                                            {fyData.map(fy => (
                                                <Bar key={fy.fyId} dataKey={`${fy.fyName}_collections`} name={fy.fyName} fill={fy.color} radius={[5, 5, 0, 0]} fillOpacity={0.8} />
                                            ))}
                                        </BarChart>
                                    </ChartWrap></div>
                                </GlassCard>
                            </div>
                            <GlassCard title="Quarterly Detail Table" subtitle="Sales, Purchase & Collections per quarter per FY">
                                <div className="overflow-x-auto mt-4">
                                    <table className="w-full text-[12px]">
                                        <thead>
                                            <tr className="border-b border-slate-200/60">
                                                <th className="text-left py-3 px-3 text-slate-400 font-semibold">Quarter</th>
                                                {fyData.map(fy => (
                                                    <React.Fragment key={fy.fyId}>
                                                        <th colSpan={3} className="text-center py-3 px-3 font-black" style={{ color: fy.color }}>{fy.fyName}</th>
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                            <tr className="border-b border-slate-100">
                                                <th className="py-1.5 px-3" />
                                                {fyData.map(fy => (
                                                    <React.Fragment key={fy.fyId}>
                                                        <th className="text-right py-1.5 px-2 text-[10px] text-slate-400 font-semibold">Sales</th>
                                                        <th className="text-right py-1.5 px-2 text-[10px] text-slate-400 font-semibold">Purchase</th>
                                                        <th className="text-right py-1.5 px-2 text-[10px] text-slate-400 font-semibold">Collections</th>
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {["Q1 (Apr-Jun)", "Q2 (Jul-Sep)", "Q3 (Oct-Dec)", "Q4 (Jan-Mar)"].map(q => (
                                                <tr key={q} className="border-b border-slate-100/60 hover:bg-white/40 transition-colors">
                                                    <td className="py-3 px-3 font-bold text-slate-700">{q}</td>
                                                    {fyData.map(fy => {
                                                        const qr = fy.quarterlyBreakdown.find(r => r.quarter === q);
                                                        return (
                                                            <React.Fragment key={fy.fyId}>
                                                                <td className="py-3 px-2 text-right font-semibold text-slate-800">{formatCr(qr?.sales ?? 0)}</td>
                                                                <td className="py-3 px-2 text-right text-amber-600">{formatCr(qr?.purchase ?? 0)}</td>
                                                                <td className="py-3 px-2 text-right text-emerald-600">{formatCr(qr?.collections ?? 0)}</td>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </div>
                    )}

                    {/* ══ SALES vs PURCHASE ═════════════════════════════════ */}
                    {activeSection === "svp" && (
                        <div className="space-y-4">
                            <GlassCard title="Sales vs Purchase vs Collections — FY Level" subtitle="Total comparison across all selected years">
                                <div className="mt-4"><ChartWrap height={340}>
                                    <BarChart data={svpChartData} margin={{ left: 0, right: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                                        <XAxis dataKey="fy" fontSize={11} tick={{ fill: "#64748b" }} />
                                        <YAxis fontSize={11} tickFormatter={formatCr} width={70} tick={{ fill: "#64748b" }} />
                                        <Tooltip contentStyle={glassTooltip} formatter={(v: any) => formatCr(Number(v))} />
                                        <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                                        <Bar dataKey="Sales" fill="#6366F1" radius={[5, 5, 0, 0]} />
                                        <Bar dataKey="Net Sales" fill="#10B981" radius={[5, 5, 0, 0]} />
                                        <Bar dataKey="Purchase" fill="#F59E0B" radius={[5, 5, 0, 0]} />
                                        <Bar dataKey="Collections" fill="#06B6D4" radius={[5, 5, 0, 0]} />
                                    </BarChart>
                                </ChartWrap></div>
                            </GlassCard>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {fyData.map(fy => {
                                    const s = fy.summary;
                                    const pR = s.totalSales > 0 ? ((s.totalPurchases / s.totalSales) * 100).toFixed(1) : "0";
                                    const cR = s.collectionEfficiencyPercent;
                                    const rR = s.returnsRatioPercent;
                                    return (
                                        <div key={fy.fyId} className="rounded-[18px] p-4 bg-white/60 border border-white/70 backdrop-blur-xl shadow-sm space-y-3" style={{ borderTopColor: fy.color + "40" }}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ background: fy.color }} />
                                                <span className="text-[13px] font-black text-slate-800">{fy.fyName}</span>
                                            </div>
                                            {[
                                                { l: "Purchase / Sales", v: pR, color: "#F59E0B", warn: Number(pR) > 80 },
                                                { l: "Collection Efficiency", v: cR, color: "#10B981", warn: cR < 70 },
                                                { l: "Returns Ratio", v: rR, color: "#EF4444", warn: rR > 5 },
                                            ].map(item => (
                                                <div key={item.l}>
                                                    <div className="flex justify-between text-[11px] mb-1">
                                                        <span className="text-slate-500">{item.l}</span>
                                                        <span className="font-black" style={{ color: item.warn ? "#dc2626" : item.color }}>{item.v}%</span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${Math.min(Number(item.v), 100)}%`, background: item.warn ? "#EF4444" : item.color }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ══ RETURNS ═══════════════════════════════════════════ */}
                    {activeSection === "returns" && (
                        <div className="space-y-4">
                            <GlassCard title="Monthly Sales Returns (CN) — Cross FY" subtitle="Credit note trend comparison">
                                <div className="mt-4"><ChartWrap height={300}>
                                    <BarChart data={monthlyChartData} margin={{ left: 0, right: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                                        <XAxis dataKey="month" fontSize={11} tick={{ fill: "#64748b" }} />
                                        <YAxis fontSize={11} tickFormatter={formatCr} width={70} tick={{ fill: "#64748b" }} />
                                        <Tooltip contentStyle={glassTooltip} formatter={(v: any) => formatCr(Number(v))} />
                                        <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                                        {fyData.map(fy => (
                                            <Bar key={fy.fyId} dataKey={`${fy.fyName}_returns`} name={fy.fyName} fill={fy.color} radius={[4, 4, 0, 0]} />
                                        ))}
                                    </BarChart>
                                </ChartWrap></div>
                            </GlassCard>
                            <GlassCard title="Returns Summary per FY">
                                <div className="overflow-x-auto mt-4">
                                    <table className="w-full text-[12px]">
                                        <thead>
                                            <tr className="border-b border-slate-200/60">
                                                {["Financial Year", "Gross Sales", "Returns (CN)", "Net Sales", "Returns %", "YoY Returns"].map(h => (
                                                    <th key={h} className={`py-3 px-3 text-slate-400 font-semibold ${h === "Financial Year" ? "text-left" : "text-right"}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fyData.map((fy, i) => {
                                                const prev = fyData[i - 1];
                                                return (
                                                    <tr key={fy.fyId} className="border-b border-slate-100/60 hover:bg-white/40 transition-colors">
                                                        <td className="py-3 px-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: fy.color }} />
                                                                <span className="font-bold text-slate-800">{fy.fyName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-semibold text-slate-800">{formatCr(fy.summary.totalSales)}</td>
                                                        <td className="py-3 px-3 text-right font-bold text-rose-600">{formatCr(fy.summary.salesReturns)}</td>
                                                        <td className="py-3 px-3 text-right font-bold text-emerald-700">{formatCr(fy.summary.netSales)}</td>
                                                        <td className="py-3 px-3 text-right">
                                                            <span className={`font-black px-2 py-0.5 rounded-full text-[11px] border ${fy.summary.returnsRatioPercent > 5 ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                                                                {fy.summary.returnsRatioPercent}%
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-3 text-right">
                                                            {prev ? <GrowthBadge curr={fy.summary.salesReturns} prev={prev.summary.salesReturns} lowerIsBetter /> : <span className="text-slate-300">—</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </div>
                    )}

                    {/* ══ PRODUCTS ═══════════════════════════════════════════ */}
                    {activeSection === "products" && (
                        <div className="space-y-4">
                            <GlassCard title="Top 10 Products — Cross FY Sales" subtitle="Ranked by first selected FY's sales amount">
                                <div className="mt-4"><ChartWrap height={420}>
                                    <BarChart data={productChartData} layout="vertical" margin={{ left: 10, right: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                                        <XAxis type="number" fontSize={10} tickFormatter={formatCr} tick={{ fill: "#64748b" }} />
                                        <YAxis type="category" dataKey="productName" fontSize={10} width={160} tick={{ fill: "#64748b" }}
                                            tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 20) + "…" : v} />
                                        <Tooltip contentStyle={glassTooltip} formatter={(v: any) => formatCr(Number(v))} />
                                        <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                                        {fyData.map(fy => (
                                            <Bar key={fy.fyId} dataKey={`${fy.fyName}_amt`} name={fy.fyName} fill={fy.color} radius={[0, 4, 4, 0]} />
                                        ))}
                                    </BarChart>
                                </ChartWrap></div>
                            </GlassCard>
                            <GlassCard title="Product Detail — Qty & Amount per FY">
                                <div className="overflow-x-auto mt-4">
                                    <table className="w-full text-[12px]">
                                        <thead>
                                            <tr className="border-b border-slate-200/60">
                                                <th className="text-left py-3 px-3 text-slate-400 font-semibold w-8">#</th>
                                                <th className="text-left py-3 px-3 text-slate-400 font-semibold">Product</th>
                                                {fyData.map(fy => (
                                                    <React.Fragment key={fy.fyId}>
                                                        <th className="text-right py-3 px-2 font-black" style={{ color: fy.color }}>{fy.fyName} Sales</th>
                                                        <th className="text-right py-3 px-2 text-slate-400 font-semibold">Qty</th>
                                                    </React.Fragment>
                                                ))}
                                                {fyData.length === 2 && <th className="text-right py-3 px-3 text-slate-400 font-semibold">Growth</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productChartData.map((row, ri) => {
                                                const pct = fyData.length === 2
                                                    ? growthPct(row[`${fyData[1].fyName}_amt`] ?? 0, row[`${fyData[0].fyName}_amt`] ?? 0)
                                                    : null;
                                                return (
                                                    <tr key={ri} className="border-b border-slate-100/60 hover:bg-white/40 transition-colors">
                                                        <td className="py-2.5 px-3 text-slate-400 font-semibold">{ri + 1}</td>
                                                        <td className="py-2.5 px-3 text-slate-700 font-medium max-w-[200px] truncate">{row.productName}</td>
                                                        {fyData.map(fy => (
                                                            <React.Fragment key={fy.fyId + "_" + row.productName}>
                                                                <td className="py-2.5 px-2 text-right font-bold text-slate-800">{formatCr(row[`${fy.fyName}_amt`] ?? 0)}</td>
                                                                <td className="py-2.5 px-2 text-right text-slate-500">{Number(row[`${fy.fyName}_qty`] ?? 0).toLocaleString("en-IN")}</td>
                                                            </React.Fragment>
                                                        ))}
                                                        {pct !== null && (
                                                            <td className="py-2.5 px-3 text-right">
                                                                <GrowthBadge curr={row[`${fyData[1].fyName}_amt`] ?? 0} prev={row[`${fyData[0].fyName}_amt`] ?? 0} />
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </div>
                    )}

                    {/* ══ DIVISIONS ═════════════════════════════════════════ */}
                    {activeSection === "company" && (
                        <div className="space-y-4">
                            <div className={`grid grid-cols-1 ${fyData.length > 1 ? "lg:grid-cols-2" : ""} gap-4`}>
                                {fyData.map(fy => (
                                    <GlassCard key={fy.fyId} title={`${fy.fyName} — Division Share`} subtitle="Sales by company/division">
                                        <div className="mt-4"><ChartWrap height={280}>
                                            <PieChart>
                                                <Pie data={fy.companyBreakdown} dataKey="amount" nameKey="company"
                                                    cx="50%" cy="45%" outerRadius={90} innerRadius={40} paddingAngle={3}
                                                    labelLine={false}
                                                    label={(d: any) => d.percent > 0.07 ? `${(d.percent * 100).toFixed(0)}%` : ""}>
                                                    {fy.companyBreakdown.map((_, i) => (
                                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(255,255,255,0.7)" strokeWidth={2} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={glassTooltip} formatter={(v: any) => formatCr(Number(v))} />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                                            </PieChart>
                                        </ChartWrap></div>
                                    </GlassCard>
                                ))}
                            </div>
                            {fyData.length >= 2 && (
                                <GlassCard title="Division Cross-FY Table">
                                    <div className="overflow-x-auto mt-4">
                                        <table className="w-full text-[12px]">
                                            <thead>
                                                <tr className="border-b border-slate-200/60">
                                                    <th className="text-left py-3 px-3 text-slate-400 font-semibold">Division / Company</th>
                                                    {fyData.map(fy => (
                                                        <th key={fy.fyId} className="text-right py-3 px-3 font-black" style={{ color: fy.color }}>{fy.fyName}</th>
                                                    ))}
                                                    {fyData.length === 2 && <th className="text-right py-3 px-3 text-slate-400 font-semibold">YoY</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const all = new Set<string>();
                                                    fyData.forEach(f => f.companyBreakdown.forEach(c => all.add(c.company)));
                                                    return Array.from(all).map(comp => {
                                                        const amounts = fyData.map(f => f.companyBreakdown.find(c => c.company === comp)?.amount ?? 0);
                                                        const pct = amounts.length === 2 ? growthPct(amounts[1], amounts[0]) : null;
                                                        return (
                                                            <tr key={comp} className="border-b border-slate-100/60 hover:bg-white/40 transition-colors">
                                                                <td className="py-3 px-3 font-semibold text-slate-700">{comp}</td>
                                                                {amounts.map((a, i) => (
                                                                    <td key={i} className="py-3 px-3 text-right font-bold text-slate-800">{formatCr(a)}</td>
                                                                ))}
                                                                {pct !== null && (
                                                                    <td className="py-3 px-3 text-right">
                                                                        <GrowthBadge curr={amounts[1]} prev={amounts[0]} />
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </GlassCard>
                            )}
                        </div>
                    )}

                    {/* ══ RADAR ══════════════════════════════════════════════ */}
                    {activeSection === "radar" && (
                        <div className="space-y-4">
                            {fyData.length < 2 ? (
                                <GlassCard>
                                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                                        <FaBalanceScale size={32} className="text-indigo-400 opacity-40" />
                                        <p className="text-slate-400 font-semibold text-sm">Select at least 2 Financial Years for Radar comparison</p>
                                    </div>
                                </GlassCard>
                            ) : (
                                <>
                                    <GlassCard title="Multi-Dimensional Radar Comparison" subtitle="Normalized 0–100 scale — relative strength of each FY across 6 metrics">
                                        <div className="mt-4"><ChartWrap height={400}>
                                            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                                                <PolarGrid stroke="rgba(100,116,139,0.2)" />
                                                <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                                                {fyData.map(fy => (
                                                    <Radar key={fy.fyId} name={fy.fyName} dataKey={fy.fyName}
                                                        stroke={fy.color} fill={fy.color} fillOpacity={0.12}
                                                        strokeWidth={2.5} dot={{ r: 4, fill: fy.color }} />
                                                ))}
                                                <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                                                <Tooltip contentStyle={glassTooltip} formatter={(v: any) => `${v}/100`} />
                                            </RadarChart>
                                        </ChartWrap></div>
                                    </GlassCard>
                                    <GlassCard title="Normalized Scores Table" subtitle="100 = best performing FY for that metric (relative scale)">
                                        <div className="overflow-x-auto mt-4">
                                            <table className="w-full text-[12px]">
                                                <thead>
                                                    <tr className="border-b border-slate-200/60">
                                                        <th className="text-left py-3 px-3 text-slate-400 font-semibold">Metric</th>
                                                        {fyData.map(fy => (
                                                            <th key={fy.fyId} className="text-right py-3 px-3 font-black" style={{ color: fy.color }}>{fy.fyName}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {radarData.map(row => (
                                                        <tr key={row.metric} className="border-b border-slate-100/60 hover:bg-white/40 transition-colors">
                                                            <td className="py-3 px-3 text-slate-600 font-semibold">{row.metric}</td>
                                                            {fyData.map(fy => {
                                                                const val = row[fy.fyName] as number;
                                                                return (
                                                                    <td key={fy.fyId} className="py-3 px-3 text-right">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                                                <div className="h-full rounded-full" style={{ width: `${val}%`, background: fy.color }} />
                                                                            </div>
                                                                            <span className="font-bold text-slate-800 w-8 text-right">{val}</span>
                                                                            {val === 100 && <FaTrophy size={10} className="text-amber-500" />}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </GlassCard>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {!loading && !hasLoaded && !error && (
                <GlassCard>
                    <div className="flex flex-col items-center gap-5 py-14 text-center">
                        <div className="w-20 h-20 rounded-[24px] flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))", border: "1px solid rgba(99,102,241,0.2)" }}>
                            <FaBalanceScale size={32} className="text-indigo-500 opacity-60" />
                        </div>
                        <div>
                            <h3 className="text-[17px] font-black text-slate-800 mb-2">Select FYs &amp; Load Comparison</h3>
                            <p className="text-[13px] text-slate-500 max-w-md">
                                Tick the financial years above, then click <span className="text-indigo-600 font-semibold">Load Comparison</span>
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            {["Animated KPIs", "Radar Chart", "Heat Map", "Area Charts", "Export CSV", "Growth Badges"].map(f => (
                                <span key={f} className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-white/60 text-slate-400 border border-slate-200">{f}</span>
                            ))}
                        </div>
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
