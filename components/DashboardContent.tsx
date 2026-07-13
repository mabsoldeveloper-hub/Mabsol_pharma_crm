"use client";

import { useEffect, useState } from "react";
import KPICards from "@/components/KPICards";
import DashboardCharts from "@/components/DashboardCharts";
import AnalyticsCards from "@/components/AnalyticsCards";

export default function DashboardContent() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/dashboard");
            const json = await res.json();
            setData(json);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return <div className="text-center p-5">Loading dashboard...</div>;
    }

    return (
        <div className="d-flex flex-column gap-4">
            <KPICards kpis={data?.kpis} />
            <DashboardCharts charts={data?.charts} />
            <AnalyticsCards analytics={data?.analytics} />
        </div>
    );
}