"use client";

import { useState } from "react";
import { Sliders, Sparkles, TrendingUp, DollarSign, Calculator, RefreshCw } from "lucide-react";

type FinancialSimulatorProps = {
    kpis: any;
    analytics: any;
};

export default function FinancialSimulatorWidget({ kpis, analytics }: FinancialSimulatorProps) {
    const monthlySales = Number(kpis?.monthlySales ?? 0);
    const totalCollections = Number(kpis?.totalCollections ?? 0);
    const grossMarginVal = Number(analytics?.grossMargin ?? Math.round(monthlySales * 0.22));

    // Interactive Slider States
    const [salesBoostPct, setSalesBoostPct] = useState(15); // +15% target boost
    const [targetCollEff, setTargetCollEff] = useState(85); // 85% target collection

    // Dynamic Calculations
    const projectedSales = Math.round(monthlySales * (1 + salesBoostPct / 100));
    const salesDifference = projectedSales - monthlySales;
    
    const projectedCollections = Math.round(projectedSales * (targetCollEff / 100));
    const collectionDifference = projectedCollections - totalCollections;

    const marginRate = monthlySales > 0 ? (grossMarginVal / monthlySales) : 0.22;
    const projectedMargin = Math.round(projectedSales * marginRate);
    const marginGain = projectedMargin - grossMarginVal;

    const handleReset = () => {
        setSalesBoostPct(15);
        setTargetCollEff(85);
    };

    return (
        <div className="relative isolate overflow-hidden rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-180 border border-white/80 dark:border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.03)] p-5 sm:p-6 transition-all">
            {/* Specular Catch Light Top Rim */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            <div className="pointer-events-none absolute -top-20 -left-20 w-56 h-56 rounded-full bg-cyan-500/10 blur-3xl" />

            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-200/50 dark:border-cyan-800/50 shadow-2xs">
                        <Calculator size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-sans tracking-tight">
                                Executive "What-If" Revenue & Growth Simulator
                            </h3>
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                                Interactive Simulator
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">Adjust growth sliders to forecast projected cashflow & profit margins</p>
                    </div>
                </div>

                <button
                    onClick={handleReset}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer transition"
                >
                    <RefreshCw size={11} /> Reset
                </button>
            </div>

            {/* Main Content Grid: Sliders Left + Realtime Forecast Cards Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* SLIDERS (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 backdrop-blur-md">
                    {/* Slider 1: Sales Growth Target */}
                    <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                            <span className="flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-cyan-500" /> Target Sales Growth Boost
                            </span>
                            <span className="text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950 px-2 py-0.5 rounded-lg border border-cyan-200 dark:border-cyan-800 font-mono">
                                +{salesBoostPct}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={salesBoostPct}
                            onChange={(e) => setSalesBoostPct(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                            <span>0% (Current)</span>
                            <span>+25% Growth</span>
                            <span>+50% Max</span>
                        </div>
                    </div>

                    {/* Slider 2: Target Collection Recovery Rate */}
                    <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                            <span className="flex items-center gap-1.5">
                                <DollarSign size={14} className="text-emerald-500" /> Target Collection Recovery Rate
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 font-mono">
                                {targetCollEff}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="100"
                            step="1"
                            value={targetCollEff}
                            onChange={(e) => setTargetCollEff(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                            <span>50% Min</span>
                            <span>75% Target</span>
                            <span>100% Full Cash</span>
                        </div>
                    </div>
                </div>

                {/* FORECAST DISPLAY CARDS (7 Cols) */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Card 1: Projected Revenue */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent border border-cyan-200/80 dark:border-cyan-800/80 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400 tracking-wider">
                            Projected Revenue
                        </span>
                        <div className="my-2">
                            <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-sans truncate">
                                ₹{projectedSales.toLocaleString("en-IN")}
                            </p>
                            <p className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 mt-0.5">
                                <Sparkles size={10} /> +₹{salesDifference.toLocaleString("en-IN")} gain
                            </p>
                        </div>
                        <span className="text-[10px] text-slate-400">Based on +{salesBoostPct}% boost</span>
                    </div>

                    {/* Card 2: Projected Cash Recovery */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200/80 dark:border-emerald-800/80 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                            Projected Recovery
                        </span>
                        <div className="my-2">
                            <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-sans truncate">
                                ₹{projectedCollections.toLocaleString("en-IN")}
                            </p>
                            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                                <Sparkles size={10} /> {targetCollEff}% recovery speed
                            </p>
                        </div>
                        <span className="text-[10px] text-slate-400">Cash in bank forecast</span>
                    </div>

                    {/* Card 3: Estimated Margin Gain */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                            Estimated Gross Margin
                        </span>
                        <div className="my-2">
                            <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-sans truncate">
                                ₹{projectedMargin.toLocaleString("en-IN")}
                            </p>
                            <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 mt-0.5">
                                <Sparkles size={10} /> +₹{marginGain.toLocaleString("en-IN")} net profit
                            </p>
                        </div>
                        <span className="text-[10px] text-slate-400">Est. gross margin share</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
