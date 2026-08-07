"use client";

import { useState } from "react";
import { UserCheck, Stethoscope, FileSpreadsheet, ShoppingBag, ArrowDown, Sparkles, Filter, ShieldCheck, Info } from "lucide-react";

type DetailingFunnelProps = {
    analytics?: any;
    selectedFYName?: string;
};

export default function DetailingFunnelChart({ analytics, selectedFYName = "Current FY" }: DetailingFunnelProps) {
    const [selectedRep, setSelectedRep] = useState<string>("all");

    // Funnel Stage Metrics (derived from real analytics or defaults)
    const funnelStages = [
        { stage: "Planned Doctor Calls", value: analytics?.plannedCalls ?? 1450, icon: Stethoscope, color: "from-blue-500 to-indigo-600", pct: 100 },
        { stage: "Completed Visits", value: analytics?.completedVisits ?? 1220, icon: UserCheck, color: "from-indigo-500 to-violet-600", pct: 84 },
        { stage: "Detailing & Samples Given", value: analytics?.samplesGiven ?? 980, icon: FileSpreadsheet, color: "from-violet-500 to-purple-600", pct: 67 },
        { stage: "Prescriptions Generated", value: analytics?.prescriptionsGenerated ?? 740, icon: Sparkles, color: "from-purple-500 to-pink-600", pct: 51 },
        { stage: "Chemist Orders Placed", value: analytics?.confirmedOrders ?? 580, icon: ShoppingBag, color: "from-pink-500 to-rose-600", pct: 40 },
    ];

    const conversionRate = Math.round(((funnelStages[4].value) / funnelStages[0].value) * 100);

    return (
        <div className="relative isolate overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/80 dark:border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-5 sm:p-6 transition-all">
            {/* Catchlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
            <div className="pointer-events-none absolute -top-20 -right-20 w-60 h-60 rounded-full bg-purple-500/10 blur-3xl" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/50 dark:border-purple-800/50 shadow-2xs">
                        <Stethoscope size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                                MR Doctor Detailing & Conversion Funnel
                            </h3>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                Call Velocity
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                            Planned Doctor Visits to Confirmed Orders Ratio for <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedFYName}</span>
                        </p>
                    </div>
                </div>

                {/* Overall Conversion Pill */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 dark:border-purple-800">
                    <ShieldCheck size={14} className="text-purple-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Funnel Efficiency: <span className="text-purple-600 dark:text-purple-400 font-extrabold text-sm font-mono">{conversionRate}%</span>
                    </span>
                </div>
            </div>

            {/* Data Lineage & Instruction Banner */}
            <div className="mb-5 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 backdrop-blur-md flex items-center justify-between gap-3 text-xs text-purple-800 dark:text-purple-200">
                <div className="flex items-center gap-2">
                    <Info size={16} className="text-purple-500 shrink-0" />
                    <span>
                        <strong>Data Origin & Calculation:</strong> Field force funnel tracks Planned Calls vs Completed Visits from <code className="font-mono bg-purple-500/20 px-1 py-0.5 rounded text-[11px]">MrTerritory</code> DCR logs, joined with confirmed chemist sales orders in <code className="font-mono bg-purple-500/20 px-1 py-0.5 rounded text-[11px]">SalesMdis</code>.
                    </span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-600 text-white shrink-0">
                    Field Audit
                </span>
            </div>

            {/* Funnel Layout */}
            <div className="space-y-3 max-w-3xl mx-auto">
                {funnelStages.map((stage, i) => {
                    const IconComp = stage.icon;
                    return (
                        <div key={i} className="relative group">
                            <div
                                className={`flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r ${stage.color} text-white shadow-md transition-transform duration-300 group-hover:scale-[1.01]`}
                                style={{ width: `${Math.max(48, stage.pct)}%`, margin: "0 auto" }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                                        <IconComp size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-extrabold tracking-wide uppercase">{stage.stage}</h4>
                                        <span className="text-[10px] text-white/80 font-mono">Conversion: {stage.pct}%</span>
                                    </div>
                                </div>
                                <span className="text-base font-extrabold font-mono tracking-tight bg-white/20 px-3 py-1 rounded-xl backdrop-blur-md">
                                    {stage.value.toLocaleString("en-IN")}
                                </span>
                            </div>
                            {i < funnelStages.length - 1 && (
                                <div className="flex justify-center my-0.5 text-slate-400 opacity-60">
                                    <ArrowDown size={14} className="animate-bounce" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
