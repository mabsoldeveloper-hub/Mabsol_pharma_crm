"use client";

import { useEffect, useState, useCallback } from "react";
import KPICards from "@/components/KPICards";
import DashboardCharts from "@/components/DashboardCharts";
import AnalyticsCards from "@/components/AnalyticsCards";
import LiquidMeters from "@/components/LiquidMeters";
import { FaBuilding, FaMapMarkerAlt, FaArrowRight, FaSyncAlt, FaCalendarAlt, FaSlidersH } from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

export default function DashboardContent() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);

    const { selectedCompany } = useCompany();
    const { selectedFY } = useFinancialYear();

    const loadMrTerritoryInfo = async () => {
        try {
            const res = await fetch("/api/mr-territory/my-territories");
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    setMrTerritoryInfo({
                        isMrRestricted: json.isMrRestricted,
                        territories: json.territories || [],
                        allowedCompanyCodes: json.allowedCompanyCodes || [],
                    });
                }
            }
        } catch {
            // Silently ignore
        }
    };

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCompany?._id) {
                params.set("companyId", selectedCompany._id);
            }
            if (selectedFY) {
                if (selectedFY.isAll) {
                    params.set("fyId", "ALL");
                } else if (selectedFY._id) {
                    params.set("fyId", selectedFY._id);
                    if (selectedFY.startDate && selectedFY.endDate) {
                        const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
                        const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
                        params.set("startDate", s);
                        params.set("endDate", e);
                    }
                }
            }

            const queryString = params.toString();
            const url = queryString ? `/api/dashboard?${queryString}` : "/api/dashboard";

            const res = await fetch(url);
            if (!res.ok) {
              console.error(`Dashboard API returned status ${res.status}`);
              return;
            }
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCompany, selectedFY]);

    const handleManualRefresh = () => {
        setRefreshing(true);
        loadDashboard();
    };

    useEffect(() => {
        loadMrTerritoryInfo();
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        const onFyChange = () => {
            loadDashboard();
        };
        const onCompanyChange = () => {
            loadDashboard();
        };
        window.addEventListener("financial-year-changed", onFyChange);
        window.addEventListener("company-changed", onCompanyChange);
        return () => {
            window.removeEventListener("financial-year-changed", onFyChange);
            window.removeEventListener("company-changed", onCompanyChange);
        };
    }, [loadDashboard]);

    // Greeting according to local hour
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning ☀️";
        if (hour < 17) return "Good Afternoon 🌤️";
        return "Good Evening 🌙";
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-500 animate-pulse">Loading Apple Liquid Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            {/* ==================== APPLE EXECUTIVE LIQUID GLASS BANNER ==================== */}
            <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/90 via-slate-900/90 to-blue-900/90 p-5 sm:p-6 text-white border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.15)] backdrop-blur-2xl">
                {/* Light reflection sheen */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                <div className="pointer-events-none absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 text-indigo-200 px-2.5 py-0.5 rounded-full border border-white/10 backdrop-blur-md">
                                Executive Overview
                            </span>
                            {selectedCompany?.companyName && (
                                <span className="text-[10px] font-semibold text-indigo-300 flex items-center gap-1 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/30">
                                    <FaBuilding size={9} /> {selectedCompany.companyName}
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-sans">
                            {getGreeting()}
                        </h2>
                        <p className="text-xs text-indigo-200/80 font-normal mt-0.5">
                            Real-time pharma CRM analytics, sales velocity, & inventory health score
                        </p>
                    </div>

                    {/* Actions & Filters Info */}
                    <div className="flex flex-wrap items-center gap-2">
                        {selectedFY && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 text-xs text-white">
                                <FaCalendarAlt size={12} className="text-indigo-300" />
                                <span className="font-semibold text-[11px]">FY: {selectedFY.fyName || "All"}</span>
                            </div>
                        )}
                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-xs font-semibold text-white backdrop-blur-xl border border-white/20 cursor-pointer"
                        >
                            <FaSyncAlt size={11} className={`${refreshing ? "animate-spin" : ""}`} />
                            <span>{refreshing ? "Syncing..." : "Refresh Data"}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ==================== MR TERRITORY BANNER ==================== */}
            {mrTerritoryInfo?.isMrRestricted && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-500/10 backdrop-blur-xl px-4 py-3 shadow-xs">
                    <div className="flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-0.5">Territory Restricted View</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                            Aap sirf apni assigned territory ka dashboard data dekh sakte hain.
                            {mrTerritoryInfo.territories.length > 0 && (
                                <>
                                    {" "}Assigned:
                                    {" "}
                                    {Array.from(
                                        new Set(
                                            mrTerritoryInfo.territories.map(
                                                (t) => t.companyName || t.companyCode
                                            )
                                        )
                                    ).join(", ")}
                                </>
                            )}
                        </p>
                        {mrTerritoryInfo.territories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {mrTerritoryInfo.territories.map((t, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-medium border border-amber-200 dark:border-amber-800"
                                    >
                                        <FaBuilding size={8} />
                                        {t.companyName || t.companyCode}
                                        {t.divisionName ? (
                                            <>
                                                {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                                                {t.divisionName}
                                            </>
                                        ) : null}
                                        {t.subDivisionName ? (
                                            <>
                                                {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                                                {t.subDivisionName}
                                            </>
                                        ) : null}
                                        {t.categoryName ? (
                                            <>
                                                {" "}<FaArrowRight size={7} className="opacity-50" />{" "}
                                                {t.categoryName}
                                            </>
                                        ) : null}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== APPLE LIQUID METERS ==================== */}
            <LiquidMeters kpis={data?.kpis} analytics={data?.analytics} />

            {/* ==================== KPI CARDS GRID ==================== */}
            <KPICards kpis={data?.kpis} />

            {/* ==================== CHARTS GRID ==================== */}
            <DashboardCharts charts={data?.charts} />

            {/* ==================== ANALYTICS SUMMARY CARDS ==================== */}
            <AnalyticsCards analytics={data?.analytics} />
        </div>
    );
}