"use client";

import { useEffect, useState, useCallback } from "react";
import KPICards from "@/components/KPICards";
import DashboardCharts from "@/components/DashboardCharts";
import AnalyticsCards from "@/components/AnalyticsCards";
import { FaBuilding, FaMapMarkerAlt, FaArrowRight } from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

export default function DashboardContent() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);

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
            let url = "/api/dashboard";
            if (selectedFY) {
                if (selectedFY.isAll) {
                    url += "?fyId=ALL";
                } else if (selectedFY._id) {
                    url += `?fyId=${selectedFY._id}`;
                    if (selectedFY.startDate && selectedFY.endDate) {
                        const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
                        const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
                        url += `&startDate=${s}&endDate=${e}`;
                    }
                }
            }

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
        }
    }, [selectedFY]);

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
        window.addEventListener("financial-year-changed", onFyChange);
        return () => window.removeEventListener("financial-year-changed", onFyChange);
    }, [loadDashboard]);

    if (loading && !data) {
        return <div className="text-center p-5">Loading dashboard...</div>;
    }

    return (
        <div className="d-flex flex-column gap-4">
            {/* ==================== MR TERRITORY BANNER ==================== */}
            {mrTerritoryInfo?.isMrRestricted && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
                    <div className="flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
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
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium border border-amber-200"
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

            <KPICards kpis={data?.kpis} />
            <DashboardCharts charts={data?.charts} />
            <AnalyticsCards analytics={data?.analytics} />
        </div>
    );
}