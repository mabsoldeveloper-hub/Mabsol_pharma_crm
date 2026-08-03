"use client";

import { useState } from "react";
import {
    Sparkles,
    TrendingUp,
    AlertTriangle,
    Zap,
    CheckCircle2,
    ArrowUpRight,
    HelpCircle,
    ShieldAlert,
    BrainCircuit,
    Lightbulb,
} from "lucide-react";

type SmartInsightsProps = {
    kpis: any;
    analytics: any;
};

export default function SmartInsightsWidget({ kpis, analytics }: SmartInsightsProps) {
    const [activeTab, setActiveTab] = useState<"all" | "alerts" | "growth" | "tips">("all");

    // Dynamic AI Calculations
    const collectionEff = Number(analytics?.collectionEfficiency ?? 0);
    const nearExpiryCount = Number(kpis?.nearExpiryBatches ?? 0);
    const expiredCount = Number(kpis?.expiredBatches ?? 0);
    const expiredVal = Number(analytics?.expiredStockValue ?? 0);
    const totalSales = Number(kpis?.totalSales ?? 0);
    const totalOut = Number(kpis?.totalOutstanding ?? 0);
    const overdueAmt = Number(kpis?.overdueAmount ?? 0);
    const activeCust = Number(kpis?.activeCustomers ?? 0);
    const totalCust = Number(kpis?.totalCustomers ?? 1);

    const insights = [
        {
            id: 1,
            type: "alerts",
            severity: expiredCount > 0 ? "high" : "low",
            title: expiredCount > 0 ? `${expiredCount} Expired Batches Detected` : "Zero Expired Stock Loss",
            badge: expiredCount > 0 ? "Action Required" : "Optimal Health",
            desc: expiredCount > 0
                ? `Approx ₹${expiredVal.toLocaleString("en-IN")} worth of inventory is expired. Initiate supplier returns or debit note generation.`
                : "All product batches are currently active with zero expired inventory losses.",
            icon: ShieldAlert,
            color: expiredCount > 0 ? "text-rose-500 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800" : "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
        },
        {
            id: 2,
            type: "growth",
            severity: "info",
            title: "Collection Recovery Efficiency",
            badge: collectionEff >= 80 ? "High Liquidity" : "Moderate Pace",
            desc: `Current recovery speed is at ${collectionEff.toFixed(1)}%. Total customer receipts stand at ₹${Number(kpis?.totalCollections || 0).toLocaleString("en-IN")}.`,
            icon: TrendingUp,
            color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800",
        },
        {
            id: 3,
            type: "tips",
            severity: "medium",
            title: "Customer Engagement Index",
            badge: `${Math.round((activeCust / totalCust) * 100)}% Active`,
            desc: `${activeCust} out of ${totalCust} registered customer accounts placed active orders this period. Consider follow-ups on inactive ledgers.`,
            icon: Lightbulb,
            color: "text-amber-500 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
        },
        {
            id: 4,
            type: "alerts",
            severity: overdueAmt > 0 ? "medium" : "low",
            title: "Overdue Dues Spotlight",
            badge: overdueAmt > 0 ? "Credit Warning" : "Healthy Ledger",
            desc: overdueAmt > 0
                ? `₹${overdueAmt.toLocaleString("en-IN")} is past due date out of ₹${totalOut.toLocaleString("en-IN")} total outstanding.`
                : "No overdue ledger payments flagged past due date.",
            icon: Zap,
            color: overdueAmt > 0 ? "text-orange-500 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800" : "text-teal-500 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800",
        },
    ];

    const filteredInsights = activeTab === "all"
        ? insights
        : insights.filter(item => item.type === activeTab);

    return (
        <div className="relative isolate overflow-hidden rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-180 border border-white/80 dark:border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.03)] p-5 sm:p-6 transition-all">
            {/* Top Light Rim Sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50 shadow-2xs">
                        <BrainCircuit size={18} className="animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-sans tracking-tight">
                                Smart AI Business Radar & Anomaly Detector
                            </h3>
                            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Live AI
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">Automated CRM audit highlights, inventory risks, & growth opportunities</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/70 text-xs">
                    {[
                        { id: "all", label: "All Insights" },
                        { id: "alerts", label: "Alerts" },
                        { id: "growth", label: "Growth" },
                        { id: "tips", label: "Tips" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                                activeTab === tab.id
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Insights Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredInsights.map(item => {
                    const IconComp = item.icon;
                    return (
                        <div
                            key={item.id}
                            className="
                                group relative isolate overflow-hidden rounded-2xl
                                bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl
                                border border-slate-200/80 dark:border-slate-700/80
                                p-3.5 sm:p-4 flex items-start gap-3
                                transition-all duration-300 hover:-translate-y-1 hover:shadow-md
                            "
                        >
                            <div className={`p-2 rounded-xl border flex-shrink-0 ${item.color}`}>
                                <IconComp size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                        {item.title}
                                    </h4>
                                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                                        {item.badge}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                                    {item.desc}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
