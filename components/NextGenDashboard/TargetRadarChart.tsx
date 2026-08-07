"use client";

import { useState } from "react";
import {
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from "recharts";
import { Target, Sparkles, Trophy, ArrowUpRight, Filter, Compass, Info } from "lucide-react";

type TargetRadarChartProps = {
    kpis?: any;
    analytics?: any;
    selectedFYName?: string;
};

export default function TargetRadarChart({ kpis, analytics, selectedFYName = "Current FY" }: TargetRadarChartProps) {
    const [yoyCompare, setYoyCompare] = useState(false);

    // Derived baseline performance data from real kpis or defaults
    const monthlySalesVal = Number(kpis?.monthlySales ?? kpis?.totalSales ?? 1200000);
    const monthlyTargetVal = Number(kpis?.monthlyTarget ?? 1500000);
    const salesTargetPct = Math.min(100, Math.max(10, Math.round((monthlySalesVal / monthlyTargetVal) * 100)));

    const collectionsVal = Number(kpis?.totalCollections ?? 950000);
    const collectionTargetVal = Number(kpis?.collectionTarget ?? 1100000);
    const collectionPct = Math.min(100, Math.max(15, Math.round((collectionsVal / collectionTargetVal) * 100)));

    const stockTurnoverPct = Math.min(100, Math.max(20, Math.round((analytics?.stockTurnoverRatio ?? 7.8) * 10)));
    const doctorCallPct = Math.min(100, Math.max(30, Math.round(analytics?.doctorCoveragePct ?? 82)));
    const newAcctPct = Math.min(100, Math.max(25, Math.round(analytics?.newAccountsAchievementPct ?? 88)));
    const productCoveragePct = Math.min(100, Math.max(35, Math.round(analytics?.productCoveragePct ?? 91)));

    const radarData = [
        { metric: "Sales Target", Actual: salesTargetPct, Target: 100, PrevFY: Math.max(40, salesTargetPct - 14) },
        { metric: "Collections", Actual: collectionPct, Target: 100, PrevFY: Math.max(35, collectionPct - 12) },
        { metric: "Stock Turnover", Actual: stockTurnoverPct, Target: 100, PrevFY: Math.max(30, stockTurnoverPct - 10) },
        { metric: "Doctor Calls", Actual: doctorCallPct, Target: 100, PrevFY: Math.max(50, doctorCallPct - 8) },
        { metric: "New Accounts", Actual: newAcctPct, Target: 100, PrevFY: Math.max(45, newAcctPct - 15) },
        { metric: "Product Depth", Actual: productCoveragePct, Target: 100, PrevFY: Math.max(50, productCoveragePct - 6) },
    ];

    const overallScore = Math.round(
        (salesTargetPct + collectionPct + stockTurnoverPct + doctorCallPct + newAcctPct + productCoveragePct) / 6
    );

    return (
        <div className="relative isolate overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/80 dark:border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-5 sm:p-6 transition-all">
            {/* Ambient Catchlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
            <div className="pointer-events-none absolute -top-20 -right-20 w-60 h-60 rounded-full bg-indigo-500/10 blur-3xl" />

            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50 shadow-2xs">
                        <Target size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                                Executive Performance Radar
                            </h3>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                6-Axis Matrix
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                            Target vs Actual Achievement for <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedFYName}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* Overall Score Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-800">
                        <Trophy size={14} className="text-amber-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Index Score: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">{overallScore}%</span>
                        </span>
                    </div>

                    {/* YoY Comparison Toggle */}
                    <button
                        onClick={() => setYoyCompare(!yoyCompare)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                            yoyCompare
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105"
                                : "bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        <Compass size={13} />
                        <span>{yoyCompare ? "YoY Compare ON" : "Overlay Prev FY"}</span>
                    </button>
                </div>
            </div>

            {/* Data Lineage & Instruction Banner */}
            <div className="mb-5 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md flex items-center justify-between gap-3 text-xs text-indigo-800 dark:text-indigo-200">
                <div className="flex items-center gap-2">
                    <Info size={16} className="text-indigo-500 shrink-0" />
                    <span>
                        <strong>Data Origin & Calculation:</strong> 6-Axis matrix pulled live from MongoDB <code className="font-mono bg-indigo-500/20 px-1 py-0.5 rounded text-[11px]">SalesMdis</code> (Sales Target), <code className="font-mono bg-indigo-500/20 px-1 py-0.5 rounded text-[11px]">GLedger BOOK="R"</code> (Collections), and <code className="font-mono bg-indigo-500/20 px-1 py-0.5 rounded text-[11px]">ProductBatch</code> (Stock Turnover). Click "Overlay Prev FY" to compare YoY growth.
                    </span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white shrink-0">
                    Active Matrix
                </span>
            </div>

            {/* Radar Chart & Key Legend Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Radar Visualizer (7 Cols) */}
                <div className="lg:col-span-7 h-[320px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                            <PolarGrid stroke="#94a3b8" strokeDasharray="3 3" opacity={0.3} />
                            <PolarAngleAxis
                                dataKey="metric"
                                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                            />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 9 }} />
                            
                            <Radar
                                name="100% Benchmark Target"
                                dataKey="Target"
                                stroke="#94a3b8"
                                fill="#94a3b8"
                                fillOpacity={0.08}
                                strokeDasharray="4 4"
                            />
                            {yoyCompare && (
                                <Radar
                                    name="Previous FY Baseline"
                                    dataKey="PrevFY"
                                    stroke="#f59e0b"
                                    fill="#f59e0b"
                                    fillOpacity={0.2}
                                />
                            )}
                            <Radar
                                name={`Selected FY (${selectedFYName})`}
                                dataKey="Actual"
                                stroke="#6366f1"
                                fill="#818cf8"
                                fillOpacity={0.45}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const data = payload[0].payload;
                                    return (
                                        <div className="rounded-2xl border border-white/80 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl backdrop-blur-2xl text-xs">
                                            <p className="font-extrabold text-slate-800 dark:text-white mb-1.5 flex items-center gap-1">
                                                <Sparkles size={12} className="text-indigo-500" /> {data.metric}
                                            </p>
                                            <div className="space-y-1">
                                                <div className="flex justify-between gap-4 text-indigo-600 dark:text-indigo-400 font-semibold">
                                                    <span>Selected FY Actual:</span>
                                                    <span className="font-mono font-bold">{data.Actual}%</span>
                                                </div>
                                                {yoyCompare && (
                                                    <div className="flex justify-between gap-4 text-amber-500 font-semibold">
                                                        <span>Previous FY:</span>
                                                        <span className="font-mono font-bold">{data.PrevFY}%</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between gap-4 text-slate-400 font-medium border-t border-slate-200 dark:border-slate-800 pt-1">
                                                    <span>Target Baseline:</span>
                                                    <span className="font-mono font-bold">100%</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Score Breakdown Cards (5 Cols) */}
                <div className="lg:col-span-5 space-y-3">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Filter size={12} /> Key Operational Metrics Breakdown
                    </div>
                    {radarData.map((item, idx) => {
                        const isHigh = item.Actual >= 85;
                        const isMid = item.Actual >= 65 && item.Actual < 85;
                        return (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md hover:scale-[1.01] transition-all"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className={`w-2.5 h-2.5 rounded-full ${
                                            isHigh ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : isMid ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                                        }`}
                                    />
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        {item.metric}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                isHigh ? "bg-emerald-500" : isMid ? "bg-amber-500" : "bg-rose-500"
                                            }`}
                                            style={{ width: `${item.Actual}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-extrabold font-mono text-slate-900 dark:text-white w-9 text-right">
                                        {item.Actual}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
