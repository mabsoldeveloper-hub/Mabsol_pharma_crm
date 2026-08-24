"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    FaBalanceScale,
    FaTimes,
    FaTrophy,
    FaRupeeSign,
    FaChartLine,
    FaShoppingBag,
    FaWallet,
    FaDownload,
    FaArrowUp,
    FaArrowDown,
    FaMinus,
    FaInfoCircle,
    FaHeartbeat,
    FaUserCheck,
    FaMapMarkerAlt,
    FaLayerGroup,
    FaChevronRight,
    FaBoxes,
    FaEye,
} from "react-icons/fa";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
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

interface FYAreaRadarDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    stateData: StateRow[];
    fyList: FYItem[];
    selectedStateIds: string[];
    initialMetric?: string | null;
}

const STATE_PALETTE = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#14B8A6"];
const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const METRIC_CONFIGS: {
    key: string;
    label: string;
    shortLabel: string;
    color: string;
    icon: React.ReactNode;
    description: string;
    getter: (s: StateRow, fyId: string) => number;
    isCurrency?: boolean;
    isScore?: boolean;
    lowerIsBetter?: boolean;
}[] = [
    {
        key: "sales",
        label: "Gross Sales",
        shortLabel: "Sales",
        color: "#6366F1",
        icon: <FaRupeeSign size={12} />,
        description: "Total invoice billing revenue across this state's customer network",
        getter: (s, fyId) => s.byFy[fyId]?.sales ?? 0,
        isCurrency: true,
    },
    {
        key: "netSales",
        label: "Net Sales",
        shortLabel: "Net Sales",
        color: "#10B981",
        icon: <FaChartLine size={12} />,
        description: "Actual retained turnover (Gross Sales minus Sales Returns / Credit Notes)",
        getter: (s, fyId) => s.byFy[fyId]?.netSales ?? 0,
        isCurrency: true,
    },
    {
        key: "collections",
        label: "Collections",
        shortLabel: "Collections",
        color: "#06B6D4",
        icon: <FaWallet size={12} />,
        description: "Realized cash and bank collections from state customer base",
        getter: (s, fyId) => s.byFy[fyId]?.collections ?? 0,
        isCurrency: true,
    },
    {
        key: "purchase",
        label: "Purchases",
        shortLabel: "Purchases",
        color: "#F59E0B",
        icon: <FaShoppingBag size={12} />,
        description: "State-level procurement and stock acquisitions",
        getter: (s, fyId) => s.byFy[fyId]?.purchase ?? 0,
        isCurrency: true,
    },
    {
        key: "customers",
        label: "Active Accounts",
        shortLabel: "Customers",
        color: "#8B5CF6",
        icon: <FaUserCheck size={12} />,
        description: "Number of active billed customer accounts and chemist outlets",
        getter: (s, fyId) => s.byFy[fyId]?.customersCount ?? 0,
    },
    {
        key: "health",
        label: "State Health Score",
        shortLabel: "Health Score",
        color: "#14B8A6",
        icon: <FaHeartbeat size={12} />,
        description: "Composite territory index: revenue growth, return ratio & collection efficiency",
        getter: (s) => s.healthScore,
        isScore: true,
    },
];

const formatINR = (n: number) =>
    "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n ?? 0));

const formatCr = (n: number) => {
    if (!n && n !== 0) return "₹0";
    if (Math.abs(n) >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
    if (Math.abs(n) >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
    if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(1)} K`;
    return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
};

const glassTooltipStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.96)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    borderRadius: 12,
    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.15)",
    fontSize: 12,
    color: "#0f172a",
    fontWeight: 600,
    padding: "8px 12px",
};

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

export default function FYAreaRadarDetailModal({
    isOpen,
    onClose,
    stateData,
    fyList,
    selectedStateIds,
    initialMetric,
}: FYAreaRadarDetailModalProps) {
    const isMobile = useIsMobile(640);
    const [activeTab, setActiveTab] = useState<string>("all");
    const [activeStateIds, setActiveStateIds] = useState<string[]>([]);
    const [selectedFyId, setSelectedFyId] = useState<string>("");

    // Initialize active states & selected FY
    useEffect(() => {
        if (isOpen) {
            if (selectedStateIds && selectedStateIds.length > 0) {
                setActiveStateIds(selectedStateIds);
            } else if (stateData && stateData.length > 0) {
                setActiveStateIds(stateData.slice(0, 3).map((s) => s.stateId));
            }
            if (fyList && fyList.length > 0) {
                setSelectedFyId(fyList[fyList.length - 1].fyId);
            }
            if (initialMetric) {
                const search = initialMetric.toLowerCase().trim();
                const matched = METRIC_CONFIGS.find(
                    (m) =>
                        m.key.toLowerCase() === search ||
                        m.label.toLowerCase() === search ||
                        m.shortLabel.toLowerCase() === search ||
                        m.label.toLowerCase().includes(search) ||
                        m.shortLabel.toLowerCase().includes(search) ||
                        search.includes(m.shortLabel.toLowerCase())
                );
                setActiveTab(matched ? matched.key : "all");
            } else {
                setActiveTab("all");
            }
        }
    }, [isOpen, selectedStateIds, stateData, fyList, initialMetric]);

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "unset";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Compared states list with assigned colors
    const comparedStates = useMemo(() => {
        const list = stateData.filter((s) => activeStateIds.includes(s.stateId));
        return list.map((s, idx) => ({
            ...s,
            color: STATE_PALETTE[idx % STATE_PALETTE.length],
        }));
    }, [stateData, activeStateIds]);

    const currentMetricConfig = useMemo(
        () => METRIC_CONFIGS.find((m) => m.key === activeTab),
        [activeTab]
    );

    // ── Metric Analysis Matrix ──
    const metricAnalysisData = useMemo(() => {
        if (!comparedStates.length || !selectedFyId) return [];

        return METRIC_CONFIGS.map((cfg) => {
            const rawValues = comparedStates.map((s) => cfg.getter(s, selectedFyId));
            const maxVal = Math.max(...rawValues) || 1;

            const bestIdx = rawValues.indexOf(maxVal);
            const bestStateId = comparedStates[bestIdx >= 0 ? bestIdx : 0]?.stateId;

            const stateScores = comparedStates.map((s) => {
                const val = cfg.getter(s, selectedFyId);
                const score = maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
                return {
                    stateId: s.stateId,
                    stateName: s.stateName,
                    color: s.color,
                    val,
                    score,
                    isBest: s.stateId === bestStateId,
                };
            });

            return {
                ...cfg,
                stateScores,
                bestStateId,
                maxVal,
            };
        });
    }, [comparedStates, selectedFyId]);

    // ── Composite Score per State ──
    const stateCompositeScores = useMemo(() => {
        if (!comparedStates.length) return [];

        return comparedStates.map((st) => {
            let totalScore = 0;
            let count = 0;
            let bestCount = 0;

            metricAnalysisData.forEach((analysis) => {
                const s = analysis.stateScores.find((x) => x.stateId === st.stateId);
                if (s) {
                    totalScore += s.score;
                    count++;
                    if (s.isBest) bestCount++;
                }
            });

            const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
            return {
                ...st,
                compositeScore: avgScore,
                bestCategoriesCount: bestCount,
            };
        });
    }, [comparedStates, metricAnalysisData]);

    // ── Multi-FY comparative chart data for selected metric ──
    const multiFyChartData = useMemo(() => {
        if (!comparedStates.length || !currentMetricConfig || !fyList.length) return [];

        return fyList.map((fy) => {
            const row: any = { fyName: fy.fyName };
            comparedStates.forEach((st) => {
                row[st.stateName] = currentMetricConfig.getter(st, fy.fyId);
            });
            return row;
        });
    }, [comparedStates, currentMetricConfig, fyList]);

    // ── Monthly seasonality chart for selected metric ──
    const monthlySeasonalityData = useMemo(() => {
        if (!comparedStates.length || !selectedFyId) return [];

        return MONTH_LABELS.map((month, idx) => {
            const row: any = { month };
            comparedStates.forEach((st) => {
                const mSales = st.byFy[selectedFyId]?.monthlySales?.[idx] ?? 0;
                row[st.stateName] = mSales;
            });
            return row;
        });
    }, [comparedStates, selectedFyId]);

    // ── Export CSV ──
    const handleExportCSV = () => {
        if (!comparedStates.length) return;

        const rows: string[] = [];
        rows.push(["Mabsol Pharma CRM — State Radar Comparison Deep-Dive"].join(","));
        rows.push([`Generated On: ${new Date().toLocaleString("en-IN")}`].join(","));
        rows.push("");

        rows.push(["Metric", ...comparedStates.map((s) => s.stateName), "Leader State"].join(","));
        metricAnalysisData.forEach((item) => {
            const leaderName = comparedStates.find((s) => s.stateId === item.bestStateId)?.stateName || "—";
            const vals = comparedStates.map((s) => {
                const raw = item.getter(s, selectedFyId);
                return item.isCurrency ? String(raw) : item.isScore ? `${raw}/100` : String(raw);
            });
            rows.push([item.label, ...vals, leaderName].join(","));
        });

        rows.push("");
        rows.push(["Normalized Scores (0–100 Scale)", ...comparedStates.map((s) => s.stateName)].join(","));
        metricAnalysisData.forEach((item) => {
            const scores = item.stateScores.map((s) => String(s.score));
            rows.push([item.label, ...scores].join(","));
        });

        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `State_Radar_DeepDive_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleState = (sId: string) => {
        setActiveStateIds((prev) =>
            prev.includes(sId)
                ? prev.length > 2
                    ? prev.filter((x) => x !== sId)
                    : prev
                : prev.length < 4
                ? [...prev, sId]
                : [prev[1], prev[2], sId]
        );
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-hidden animate-[fadeIn_0.2s_ease-out]"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Modal Container */}
            <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-800">
                {/* Top Accent */}
                <div
                    className="h-1.5 w-full transition-colors duration-500"
                    style={{
                        background:
                            activeTab === "all"
                                ? "linear-gradient(90deg, #6366F1, #8B5CF6, #06B6D4, #10B981)"
                                : `linear-gradient(90deg, ${currentMetricConfig?.color || "#6366F1"}, ${currentMetricConfig?.color || "#6366F1"}80)`,
                    }}
                />

                {/* Modal Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200/70 bg-slate-50/70 flex-shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div
                            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
                            style={{
                                background:
                                    activeTab === "all"
                                        ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
                                        : `linear-gradient(135deg, ${currentMetricConfig?.color || "#6366F1"}, ${currentMetricConfig?.color || "#6366F1"}CC)`,
                                boxShadow: `0 4px 14px ${(currentMetricConfig?.color || "#6366F1") + "35"}`,
                            }}
                        >
                            {activeTab === "all" ? (
                                <FaBalanceScale className="text-sm sm:text-lg" />
                            ) : (
                                currentMetricConfig?.icon
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-sm sm:text-lg md:text-xl font-black tracking-tight text-slate-900 truncate">
                                    {activeTab === "all"
                                        ? "State Radar — Comparative Deep Dive"
                                        : `${currentMetricConfig?.label} Comparison`}
                                </h2>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                    Comparing {comparedStates.length} States
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                                {activeTab === "all"
                                    ? "Multi-dimensional performance matrix across Indian states"
                                    : currentMetricConfig?.description}
                            </p>
                        </div>
                    </div>

                    {/* Actions & FY Filter */}
                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        {fyList.length > 1 && (
                            <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-xl shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400">FY:</span>
                                <select
                                    value={selectedFyId}
                                    onChange={(e) => setSelectedFyId(e.target.value)}
                                    className="bg-transparent text-xs font-black text-indigo-600 focus:outline-none cursor-pointer"
                                >
                                    {fyList.map((f) => (
                                        <option key={f.fyId} value={f.fyId}>
                                            {f.fyName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={handleExportCSV}
                            title="Export Detailed Report to CSV"
                            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all hover:scale-105 active:scale-95 shadow-xs"
                        >
                            <FaDownload size={10} />
                            <span className="hidden xs:inline">Export CSV</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                            title="Close Popup (Esc)"
                        >
                            <FaTimes className="text-sm sm:text-base" />
                        </button>
                    </div>
                </div>

                {/* State Quick Toggle Bar */}
                <div className="px-3.5 sm:px-6 py-2 bg-indigo-50/40 border-b border-slate-200/60 flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
                    <div className="flex items-center gap-1.5 min-w-max">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <FaMapMarkerAlt size={9} className="text-indigo-500" /> Active States:
                        </span>
                        {comparedStates.map((st) => (
                            <span
                                key={st.stateId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs"
                                style={{
                                    background: `${st.color}15`,
                                    color: st.color,
                                    borderColor: `${st.color}40`,
                                }}
                            >
                                <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />
                                {st.stateName}
                                <span className="text-[9px] opacity-75 font-normal">({st.zoneName})</span>
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 whitespace-nowrap">
                        <span>Max 4 states</span>
                    </div>
                </div>

                {/* Metric Filter Tabs Bar */}
                <div className="px-3.5 sm:px-6 py-2 bg-white/80 border-b border-slate-200/60 flex-shrink-0 overflow-x-auto scrollbar-hide">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
                        {/* All Overview */}
                        <button
                            onClick={() => setActiveTab("all")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all ${
                                activeTab === "all"
                                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]"
                                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                            }`}
                        >
                            <FaLayerGroup size={11} />
                            <span>All Overview</span>
                        </button>

                        <div className="h-4 w-px bg-slate-200 mx-0.5" />

                        {/* Metric pills */}
                        {METRIC_CONFIGS.map((cfg) => {
                            const isSelected = activeTab === cfg.key;
                            return (
                                <button
                                    key={cfg.key}
                                    onClick={() => setActiveTab(cfg.key)}
                                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                                        isSelected
                                            ? "text-white shadow-md scale-[1.02]"
                                            : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                                    }`}
                                    style={
                                        isSelected
                                            ? {
                                                  background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}DD)`,
                                                  boxShadow: `0 4px 12px ${cfg.color}35`,
                                              }
                                            : {}
                                    }
                                >
                                    <span style={{ color: isSelected ? "#fff" : cfg.color }}>{cfg.icon}</span>
                                    <span>{cfg.shortLabel}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Modal Body Container */}
                <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
                    {/* ═════════════════════════════════════════════════════════ */}
                    {/* VIEW A: ALL METRICS OVERVIEW & COMPOSITE SCORECARD        */}
                    {/* ═════════════════════════════════════════════════════════ */}
                    {activeTab === "all" && (
                        <div className="space-y-4 sm:space-y-5">
                            {/* Composite Rank Cards */}
                            <div>
                                <div className="flex items-center justify-between mb-2 sm:mb-3">
                                    <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                                        <FaTrophy className="text-amber-500" />
                                        States Radar Composite Performance Index
                                    </h3>
                                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold">
                                        Normalized relative benchmark
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
                                    {stateCompositeScores.map((st) => {
                                        const isTopOverall =
                                            stateCompositeScores.every(
                                                (other) => st.compositeScore >= other.compositeScore
                                            ) && stateCompositeScores.length > 1;

                                        return (
                                            <div
                                                key={st.stateId}
                                                className="relative rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 hover:scale-[1.01]"
                                                style={{
                                                    background:
                                                        "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.65))",
                                                    borderColor: `${st.color}35`,
                                                    boxShadow: `0 4px 16px ${st.color}12`,
                                                }}
                                            >
                                                {/* Top Color Accent */}
                                                <div
                                                    className="absolute top-0 inset-x-0 h-1 rounded-t-2xl"
                                                    style={{ background: st.color }}
                                                />

                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ background: st.color }}
                                                        />
                                                        <span className="font-black text-slate-900 text-sm sm:text-base">
                                                            {st.stateName}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            ({st.zoneName})
                                                        </span>
                                                    </div>

                                                    {isTopOverall && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                                            <FaTrophy size={8} /> LEADER
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 my-2.5 pt-2 border-t border-slate-100">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                                            Radar Score
                                                        </span>
                                                        <div className="flex items-baseline gap-1 mt-0.5">
                                                            <span
                                                                className="text-xl sm:text-2xl font-black"
                                                                style={{ color: st.color }}
                                                            >
                                                                {st.compositeScore}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">/ 100</span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                                            Won Dimensions
                                                        </span>
                                                        <span className="text-xs sm:text-sm font-black text-slate-800 mt-0.5 block">
                                                            {st.bestCategoriesCount} of {METRIC_CONFIGS.length} 🏆
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700"
                                                        style={{
                                                            width: `${st.compositeScore}%`,
                                                            background: st.color,
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100/80 text-[10px] text-slate-500 font-medium">
                                                    <span>Sales: {formatCr(st.totalSales)}</span>
                                                    <span>Health: {st.healthScore}/100</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Full Comparative Metric Matrix Table */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 overflow-hidden shadow-sm">
                                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/60 flex flex-col xs:flex-row xs:items-center justify-between gap-1">
                                    <div>
                                        <h4 className="text-xs sm:text-[13px] font-black text-slate-800 m-0">
                                            Multi-State Business Dimensions Matrix
                                        </h4>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 m-0">
                                            Click any metric row to drill down into its multi-year breakdown
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60 self-start xs:self-auto">
                                        Interactive Drill-down ↵
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs min-w-[620px]">
                                        <thead>
                                            <tr className="border-b border-slate-200/70 bg-slate-100/50">
                                                <th className="text-left py-2.5 px-3 text-slate-500 font-bold">
                                                    Business Dimension
                                                </th>
                                                {comparedStates.map((st) => (
                                                    <th
                                                        key={st.stateId}
                                                        className="text-right py-2.5 px-3 font-black text-xs"
                                                        style={{ color: st.color }}
                                                    >
                                                        {st.stateName}
                                                    </th>
                                                ))}
                                                <th className="text-center py-2.5 px-3 text-slate-400 font-bold w-24">
                                                    Leader State
                                                </th>
                                                <th className="text-center py-2.5 px-2 text-slate-400 font-bold w-12">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {metricAnalysisData.map((item) => {
                                                const leaderStateDoc = comparedStates.find(
                                                    (s) => s.stateId === item.bestStateId
                                                );

                                                return (
                                                    <tr
                                                        key={item.key}
                                                        onClick={() => setActiveTab(item.key)}
                                                        className="border-b border-slate-100/70 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                                    >
                                                        <td className="py-3 px-3">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-xs"
                                                                    style={{ background: item.color }}
                                                                >
                                                                    {item.icon}
                                                                </div>
                                                                <div>
                                                                    <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors block">
                                                                        {item.label}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 line-clamp-1">
                                                                        {item.description}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {comparedStates.map((st) => {
                                                            const scoreObj = item.stateScores.find(
                                                                (s) => s.stateId === st.stateId
                                                            );
                                                            const rawVal = item.getter(st, selectedFyId);

                                                            return (
                                                                <td key={st.stateId} className="py-3 px-3 text-right">
                                                                    <div className="font-black text-slate-800 text-xs sm:text-[13px]">
                                                                        {item.isCurrency
                                                                            ? formatCr(rawVal)
                                                                            : item.isScore
                                                                            ? `${rawVal}/100`
                                                                            : Number(rawVal).toLocaleString("en-IN")}
                                                                    </div>
                                                                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                                        <div className="w-10 sm:w-14 h-1 rounded-full bg-slate-100 overflow-hidden">
                                                                            <div
                                                                                className="h-full rounded-full"
                                                                                style={{
                                                                                    width: `${scoreObj?.score ?? 0}%`,
                                                                                    background: st.color,
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <span className="text-[9px] font-bold text-slate-400 w-5 text-right">
                                                                            {scoreObj?.score}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}

                                                        <td className="py-3 px-3 text-center whitespace-nowrap">
                                                            {leaderStateDoc && (
                                                                <span
                                                                    className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs"
                                                                    style={{
                                                                        background: `${leaderStateDoc.color}15`,
                                                                        color: leaderStateDoc.color,
                                                                        borderColor: `${leaderStateDoc.color}40`,
                                                                    }}
                                                                >
                                                                    <FaTrophy size={8} /> {leaderStateDoc.stateName}
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="py-3 px-2 text-center text-slate-300 group-hover:text-indigo-600 transition-colors">
                                                            <FaChevronRight size={10} />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═════════════════════════════════════════════════════════ */}
                    {/* VIEW B: SPECIFIC METRIC DEEP-DIVE                         */}
                    {/* ═════════════════════════════════════════════════════════ */}
                    {activeTab !== "all" && currentMetricConfig && (
                        <div className="space-y-4 sm:space-y-6">
                            {/* State Cards Strip */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ background: currentMetricConfig.color }}
                                        />
                                        {currentMetricConfig.label} — Cross-State Comparative Totals
                                    </h3>
                                    <button
                                        onClick={() => setActiveTab("all")}
                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                                    >
                                        ← Back to Overview
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
                                    {comparedStates.map((st) => {
                                        const rawVal = currentMetricConfig.getter(st, selectedFyId);
                                        const analysisItem = metricAnalysisData.find(
                                            (m) => m.key === currentMetricConfig.key
                                        );
                                        const isBest = analysisItem?.bestStateId === st.stateId;
                                        const scoreObj = analysisItem?.stateScores.find(
                                            (s) => s.stateId === st.stateId
                                        );

                                        return (
                                            <div
                                                key={st.stateId}
                                                className="relative rounded-2xl p-3.5 sm:p-4 border transition-all duration-200"
                                                style={{
                                                    background:
                                                        "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.7))",
                                                    borderColor: `${st.color}35`,
                                                    boxShadow: `0 4px 18px ${st.color}10`,
                                                }}
                                            >
                                                <div
                                                    className="absolute top-0 inset-x-0 h-1 rounded-t-2xl"
                                                    style={{ background: st.color }}
                                                />

                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <div
                                                            className="w-2.5 h-2.5 rounded-full"
                                                            style={{ background: st.color }}
                                                        />
                                                        <span className="font-black text-slate-800 text-sm">
                                                            {st.stateName}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            ({st.zoneName})
                                                        </span>
                                                    </div>

                                                    {isBest && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                                                            <FaTrophy size={8} /> LEADER
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-1">
                                                    <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                                                        {currentMetricConfig.isCurrency
                                                            ? formatCr(rawVal)
                                                            : currentMetricConfig.isScore
                                                            ? `${rawVal}/100`
                                                            : Number(rawVal).toLocaleString("en-IN")}
                                                    </span>
                                                    {currentMetricConfig.isCurrency && (
                                                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                                                            Exact: {formatINR(rawVal)}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs">
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold block">
                                                            YoY Growth
                                                        </span>
                                                        <span className="text-[11px] font-black text-emerald-600">
                                                            {st.salesGrowthPct !== null
                                                                ? `${st.salesGrowthPct > 0 ? "+" : ""}${st.salesGrowthPct}%`
                                                                : "—"}
                                                        </span>
                                                    </div>

                                                    <div className="text-right">
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold block">
                                                            Radar Index
                                                        </span>
                                                        <span
                                                            className="text-xs font-black"
                                                            style={{ color: st.color }}
                                                        >
                                                            {scoreObj?.score ?? 0} / 100
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Multi-FY Bar Chart Comparison */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 sm:p-5 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-black text-slate-800 m-0">
                                            {currentMetricConfig.label} Across Financial Years
                                        </h4>
                                        <p className="text-[10px] sm:text-[11px] text-slate-400 m-0">
                                            Multi-year trajectory comparison between selected states
                                        </p>
                                    </div>
                                </div>

                                <div className="h-[210px] sm:h-[280px] md:h-[310px] w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={multiFyChartData}
                                            margin={{ top: 10, right: 10, left: isMobile ? -20 : -10, bottom: 0 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="rgba(100,116,139,0.12)"
                                            />
                                            <XAxis dataKey="fyName" fontSize={isMobile ? 9 : 10} tick={{ fill: "#64748b" }} />
                                            <YAxis
                                                fontSize={isMobile ? 9 : 10}
                                                tick={{ fill: "#64748b" }}
                                                tickFormatter={
                                                    currentMetricConfig.isCurrency
                                                        ? (v) => formatCr(Number(v))
                                                        : (v) => `${v}`
                                                }
                                                width={isMobile ? 44 : 55}
                                            />
                                            <Tooltip
                                                contentStyle={glassTooltipStyle}
                                                formatter={(v: any) =>
                                                    currentMetricConfig.isCurrency
                                                        ? formatCr(Number(v))
                                                        : `${v}`
                                                }
                                            />
                                            <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 11, color: "#64748b" }} />
                                            {comparedStates.map((st) => (
                                                <Bar
                                                    key={st.stateId}
                                                    dataKey={st.stateName}
                                                    name={st.stateName}
                                                    fill={st.color}
                                                    radius={[4, 4, 0, 0]}
                                                />
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Monthly Seasonality Comparison if Sales/NetSales */}
                            {(currentMetricConfig.key === "sales" || currentMetricConfig.key === "netSales") && (
                                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 sm:p-5 shadow-sm">
                                    <h4 className="text-xs sm:text-sm font-black text-slate-800 m-0">
                                        12-Month Seasonality Comparison (Apr–Mar)
                                    </h4>
                                    <p className="text-[10px] sm:text-[11px] text-slate-400 m-0 mb-3">
                                        Monthly sales volume pattern between compared states
                                    </p>

                                    <div className="h-[200px] sm:h-[250px] md:h-[280px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={monthlySeasonalityData} margin={{ left: isMobile ? -20 : -10, right: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                                                <XAxis dataKey="month" fontSize={isMobile ? 9 : 10} tick={{ fill: "#64748b" }} />
                                                <YAxis fontSize={isMobile ? 9 : 10} tickFormatter={formatCr} width={isMobile ? 44 : 55} tick={{ fill: "#64748b" }} />
                                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v: any) => formatCr(Number(v))} />
                                                <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 11, color: "#64748b" }} />
                                                {comparedStates.map((st) => (
                                                    <Bar key={st.stateId} dataKey={st.stateName} name={st.stateName} fill={st.color} radius={[3, 3, 0, 0]} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Top Products or Accounts in these States */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {comparedStates.map((st) => (
                                    <div
                                        key={st.stateId}
                                        className="rounded-2xl border border-slate-200/80 bg-white/70 p-3.5 sm:p-4 shadow-sm"
                                    >
                                        <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-100">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ background: st.color }}
                                            />
                                            <span className="font-black text-slate-800 text-xs sm:text-sm">
                                                {st.stateName} — Top Formulations
                                            </span>
                                        </div>

                                        {st.topProducts && st.topProducts.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {st.topProducts.slice(0, 4).map((p, pi) => (
                                                    <div
                                                        key={pi}
                                                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 text-[11px]"
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <FaBoxes size={10} className="text-slate-400 shrink-0" />
                                                            <span className="font-bold text-slate-700 truncate max-w-[130px] sm:max-w-[160px]">
                                                                {p.name}
                                                            </span>
                                                        </div>
                                                        <span className="font-black text-slate-900 shrink-0">
                                                            {formatCr(p.amount)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-slate-400 py-3 text-center">
                                                No specific product breakdown available
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200/70 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px]">
                        <FaInfoCircle className="text-indigo-500 shrink-0" />
                        <span>State radar normalized scores evaluate relative commercial strength across key territories.</span>
                    </div>

                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
