"use client";

import { useEffect, useState, useCallback } from "react";
import KPICards from "@/components/KPICards";
import DashboardCharts, { PurchaseDashboardCharts, CreditDashboardCharts } from "@/components/DashboardCharts";
import AnalyticsCards from "@/components/AnalyticsCards";
import LiquidMeters from "@/components/LiquidMeters";
import {
    FaBuilding,
    FaMapMarkerAlt,
    FaArrowRight,
    FaSyncAlt,
    FaCalendarAlt,
    FaChartPie,
    FaChartLine,
    FaBoxes,
    FaWallet,
    FaTruck,
    FaCheckCircle,
} from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

type TabType = "overview" | "sales" | "inventory" | "credit" | "purchase";

export default function DashboardContent() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("overview");
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

    const tabs = [
        { id: "overview", label: "Executive Overview", icon: FaChartPie, badge: "Live" },
        { id: "sales", label: "Sales & Revenue", icon: FaChartLine, badge: "Sales" },
        { id: "inventory", label: "Inventory & Expiry", icon: FaBoxes, badge: "Stock" },
        { id: "credit", label: "Credit & Receivables", icon: FaWallet, badge: "Dues" },
        { id: "purchase", label: "Purchase & Vendors", icon: FaTruck, badge: "Inward" },
    ];

    return (
        <div className="flex flex-col gap-5">
            {/* ==================== APPLE EXECUTIVE LIQUID GLASS BANNER ==================== */}
            <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/90 via-slate-900/90 to-blue-900/90 p-5 sm:p-6 text-white border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.15)] backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                <div className="pointer-events-none absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 text-indigo-200 px-2.5 py-0.5 rounded-full border border-white/10 backdrop-blur-md">
                                Executive Intelligence OS
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

            {/* ==================== FLOATING APPLE LIQUID GLASS TAB BAR ==================== */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-white/80 dark:border-slate-800/80 backdrop-blur-2xl backdrop-saturate-180 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                {tabs.map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`
                                relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold
                                transition-all duration-300 cursor-pointer border
                                ${isActive
                                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-white/80 dark:border-slate-700 shadow-md scale-[1.02]"
                                    : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40"
                                }
                            `}
                        >
                            <IconComponent size={14} className={isActive ? "text-indigo-600 dark:text-indigo-400" : "opacity-70"} />
                            <span>{tab.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                isActive
                                    ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                                    : "bg-slate-500/10 text-slate-500"
                            }`}>
                                {tab.badge}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ==================== TAB CONTENT RENDERING ==================== */}

            {/* TAB 1: EXECUTIVE OVERVIEW */}
            {activeTab === "overview" && (
                <>
                    <LiquidMeters kpis={data?.kpis} analytics={data?.analytics} />
                    <KPICards kpis={data?.kpis} />
                    <DashboardCharts charts={data?.charts} />
                    <AnalyticsCards analytics={data?.analytics} />
                </>
            )}

            {/* TAB 2: SALES & REVENUE */}
            {activeTab === "sales" && (
                <>
                    <KPICards kpis={data?.kpis} />
                    <DashboardCharts charts={data?.charts} />
                </>
            )}

            {/* TAB 3: INVENTORY & EXPIRY */}
            {activeTab === "inventory" && (
                <>
                    <LiquidMeters kpis={data?.kpis} analytics={data?.analytics} />
                    <KPICards kpis={data?.kpis} />
                    <DashboardCharts charts={data?.charts} />
                </>
            )}

            {/* TAB 4: CREDIT & RECEIVABLES */}
            {activeTab === "credit" && (
                <>
                    <LiquidMeters kpis={data?.kpis} analytics={data?.analytics} />
                    <KPICards kpis={data?.kpis} />
                    <CreditDashboardCharts charts={data?.charts} />
                </>
            )}

            {/* TAB 5: PURCHASE & VENDORS */}
            {activeTab === "purchase" && (
                <>
                    <KPICards kpis={data?.kpis} />
                    <PurchaseDashboardCharts charts={data?.charts} />
                    <AnalyticsCards analytics={data?.analytics} />
                </>
            )}
        </div>
    );
}