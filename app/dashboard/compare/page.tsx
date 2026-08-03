/**
 * app/dashboard/compare/page.tsx
 * ---------------------------------------------------------------------------
 * High-End Financial Comparison Dashboard — "Liquid Glass" theme
 * ---------------------------------------------------------------------------
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import {
    FaBuilding,
    FaMapMarkerAlt,
    FaArrowRight,
    FaRupeeSign,
    FaChartLine,
    FaShoppingBag,
    FaUndo,
    FaWallet,
    FaBoxes,
    FaCalendarAlt,
    FaSync,
} from "react-icons/fa";
import { useFinancialYear } from "@/context/FinancialYearContext";
import { useCompany } from "@/context/CompanyContext";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

type MrTerritoryInfo = {
    isMrRestricted: boolean;
    territories: any[];
    allowedCompanyCodes: string[];
};

const COLORS = [
    "#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#A855F7",
    "#06B6D4", "#EC4899", "#84CC16", "#FB923C", "#6366F1",
];

const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);

// Shared glassy tooltip style for all recharts <Tooltip />
const glassTooltipStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(31,41,55,0.12)",
    fontSize: 13,
    color: "#0f172a",
    fontWeight: 600,
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

type DashboardData = {
    salesVsPurchase: { month: string; sales: number; purchase: number }[];
    collectionVsOutstanding: {
        collectionsMonthly: { month: string; debit: number; credit: number }[];
        totalOutstanding: number;
        totalPendingInvoices: number;
        aging: { bucket: string; totalBalance: number; count: number }[];
    };
    productComparison: { code: number; productName: string; qty: number; amount: number }[];
    companyComparison: { company: string; qty: number; amount: number }[];
    monthlyComparison: { month: string; totalAmount: number; count: number }[];
    quarterlyComparison: { label: string; totalAmount: number; count: number }[];
};

type SummaryData = {
    totalSales: number;
    salesReturns: number;
    netSales: number;
    totalPurchases: number;
    totalOutstanding: number;
    totalPendingInvoices: number;
    totalCollections: number;
    totalPayments: number;
};

/** Glass card shell */
function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="relative rounded-[24px] sm:rounded-[28px] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(31,41,55,0.08)] p-4 sm:p-6 overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
            <div className="mb-4 sm:mb-5">
                <h3 className="text-[14px] sm:text-[15px] font-bold text-gray-900 tracking-tight m-0">{title}</h3>
                {subtitle && <p className="text-xs text-gray-500 mt-0.5 m-0">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

function StatCard({
    label,
    value,
    subtext,
    icon,
    color = "indigo",
}: {
    label: string;
    value: string;
    subtext?: string;
    icon: React.ReactNode;
    color?: string;
}) {
    return (
        <div className="relative rounded-[22px] sm:rounded-[26px] border border-white/60 bg-white/50 backdrop-blur-xl shadow-[0_8px_32px_rgba(31,41,55,0.06)] p-4 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
            <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</p>
                <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                    {icon}
                </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight break-words">{value}</p>
            {subtext && <p className="text-[11px] font-medium text-slate-500 mt-0.5">{subtext}</p>}
        </div>
    );
}

function AmbientBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-[#EEF2FB]">
            <div className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-blue-400/40 blur-[110px]" />
            <div className="absolute top-1/3 -right-32 w-[480px] h-[480px] rounded-full bg-purple-400/30 blur-[110px]" />
            <div className="absolute bottom-[-160px] left-1/3 w-[560px] h-[560px] rounded-full bg-emerald-300/30 blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-[380px] h-[380px] rounded-full bg-pink-300/30 blur-[100px]" />
        </div>
    );
}

function ChartBox({ heightClass, children }: { heightClass: string; children: React.ReactNode }) {
    return (
        <div className={heightClass}>
            <ResponsiveContainer width="100%" height="100%">
                {children as any}
            </ResponsiveContainer>
        </div>
    );
}

export default function ComparisonDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mrTerritoryInfo, setMrTerritoryInfo] = useState<MrTerritoryInfo | null>(null);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const isMobile = useIsMobile();
    const { selectedFY } = useFinancialYear();
    const { selectedCompany } = useCompany();

    useEffect(() => {
        const updateFYFilters = () => {
            if (selectedFY && !selectedFY.isAll && selectedFY.startDate && selectedFY.endDate) {
                const s = new Date(selectedFY.startDate).toISOString().slice(0, 10);
                const e = new Date(selectedFY.endDate).toISOString().slice(0, 10);
                setFrom(s);
                setTo(e);
            } else if (selectedFY?.isAll) {
                setFrom("");
                setTo("");
            }
        };
        updateFYFilters();
        window.addEventListener("financial-year-changed", updateFYFilters);
        return () => window.removeEventListener("financial-year-changed", updateFYFilters);
    }, [selectedFY]);

    useEffect(() => {
        loadMrTerritoryInfo();
    }, []);



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

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);
            if (selectedFY?._id && !selectedFY.isAll) params.set("fyId", selectedFY._id);
            if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

            const res = await fetch(`/api/dashboard/compare?${params.toString()}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Failed to load dashboard");
            setData(json.data);
            setSummary(json.summary);
        } catch (e: any) {
            setError(e.message || "Failed to load comparison data.");
        } finally {
            setLoading(false);
        }
    }, [from, to, selectedFY, selectedCompany]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Re-fetch when company changes via topbar event
    useEffect(() => {
        const handler = () => fetchData();
        window.addEventListener("company-changed", handler);
        return () => window.removeEventListener("company-changed", handler);
    }, [fetchData]);

    return (
        <div className="min-h-screen p-3 sm:p-6 space-y-4 sm:space-y-6 relative">
            <AmbientBackground />

            {/* MR TERRITORY BANNER */}
            {mrTerritoryInfo?.isMrRestricted && (
                <div className="flex items-start gap-3 rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm relative overflow-hidden">
                    <div className="flex-shrink-0 mt-0.5">
                        <FaMapMarkerAlt size={16} className="text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800 mb-0.5">Territory Restricted View</p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            Aap sirf apni assigned territory ka comparison data dekh sakte hain.
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
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center items-stretch justify-between gap-4 rounded-[24px] sm:rounded-[28px] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(31,41,55,0.08)] p-4 sm:p-6 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 m-0">
                        Financial Comparison Dashboard
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
                            {selectedFY?.fyName || "All FY"}
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 m-0">
                        Multi-dimensional comparative analysis of Sales, Purchases, Returns & Cashflows
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                        <div>
                            <label className="block text-[11px] text-slate-500 font-semibold mb-0.5">From Date</label>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="w-full border border-white/80 bg-white/70 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] text-slate-500 font-semibold mb-0.5">To Date</label>
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="w-full border border-white/80 bg-white/70 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                            />
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="mt-4 sm:mt-0 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all border border-indigo-500/30"
                    >
                        <FaSync size={11} className={loading ? "animate-spin" : ""} />
                        <span>Apply Filter</span>
                    </button>
                </div>
            </div>

            {loading && (
                <div className="rounded-[24px] sm:rounded-[28px] border border-white/60 bg-white/40 backdrop-blur-2xl p-8 text-center text-slate-600 font-semibold flex items-center justify-center gap-2">
                    <FaSync size={16} className="animate-spin text-indigo-600" />
                    Calculating Financial Comparison Data...
                </div>
            )}

            {error && (
                <div className="rounded-[24px] sm:rounded-[28px] border border-red-200/60 bg-red-50/50 backdrop-blur-2xl p-4 sm:p-6 text-red-600 font-medium">
                    Error: {error}
                </div>
            )}

            {data && summary && (
                <>
                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard
                            label="Gross Sales"
                            value={`₹ ${formatINR(summary.totalSales)}`}
                            subtext="Exact Marg Sales Book match"
                            icon={<FaRupeeSign size={15} />}
                        />
                        <StatCard
                            label="Net Sales Turnover"
                            value={`₹ ${formatINR(summary.netSales)}`}
                            subtext="Sales minus Sales Returns"
                            icon={<FaChartLine size={15} />}
                        />
                        <StatCard
                            label="Sales Returns (CN)"
                            value={`₹ ${formatINR(summary.salesReturns)}`}
                            subtext="Credit Notes"
                            icon={<FaUndo size={14} />}
                        />
                        <StatCard
                            label="Total Purchases"
                            value={`₹ ${formatINR(summary.totalPurchases)}`}
                            subtext="Supplier Bills"
                            icon={<FaShoppingBag size={15} />}
                        />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard
                            label="Creditor Outstanding"
                            value={`₹ ${formatINR(summary.totalOutstanding)}`}
                            subtext={`${summary.totalPendingInvoices} Pending Purchase Bills`}
                            icon={<FaWallet size={15} />}
                        />
                        <StatCard
                            label="Customer Collections"
                            value={`₹ ${formatINR(summary.totalCollections)}`}
                            subtext="Receipts Received"
                            icon={<FaRupeeSign size={15} />}
                        />
                        <StatCard
                            label="Supplier Payments"
                            value={`₹ ${formatINR(summary.totalPayments)}`}
                            subtext="Payments Made"
                            icon={<FaRupeeSign size={15} />}
                        />
                        <StatCard
                            label="Top Product Sales"
                            value={data.productComparison[0] ? `₹ ${formatINR(data.productComparison[0].amount)}` : "₹ 0"}
                            subtext={data.productComparison[0]?.productName || "Product #1"}
                            icon={<FaBoxes size={15} />}
                        />
                    </div>

                    {/* Sales vs Purchase */}
                    <Card title="Monthly Sales vs Purchase Comparison" subtitle="Monthly trend comparison of Sales Invoices vs Supplier Purchase Bills">
                        <ChartBox heightClass="h-[260px] sm:h-[320px]">
                            <BarChart data={data.salesVsPurchase} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                <XAxis dataKey="month" fontSize={isMobile ? 10 : 12} stroke="#64748b" />
                                <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
                                <Bar dataKey="sales" name="Sales (Gross)" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="purchase" name="Purchase" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ChartBox>
                    </Card>

                    {/* Collection vs Outstanding */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <Card title="Monthly Cashflows (Collections vs Payments)" subtitle="Customer Collections (Receipts) vs Supplier Payments Made">
                            <ChartBox heightClass="h-[240px] sm:h-[290px]">
                                <BarChart data={data.collectionVsOutstanding.collectionsMonthly} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                    <XAxis dataKey="month" fontSize={isMobile ? 10 : 12} stroke="#64748b" />
                                    <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                    <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                    <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
                                    <Bar dataKey="credit" name="Collections (Receipts)" fill="#22C55E" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="debit" name="Payments Made" fill="#EF4444" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ChartBox>
                        </Card>

                        <Card title="Creditor Outstanding Aging Breakdown" subtitle="Purchase Bill aging buckets matching Marg ERP Pendings">
                            <ChartBox heightClass="h-[240px] sm:h-[290px]">
                                <BarChart data={data.collectionVsOutstanding.aging} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                    <XAxis dataKey="bucket" fontSize={isMobile ? 10 : 12} stroke="#64748b" />
                                    <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                    <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                    <Bar dataKey="totalBalance" name="Pending Balance" fill="#A855F7" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ChartBox>
                        </Card>
                    </div>

                    {/* Product Comparison */}
                    <Card title="Top 15 Products Sales Comparison" subtitle="Ranked by total sales turnover amount in active financial year">
                        <ChartBox heightClass="h-[380px] sm:h-[440px]">
                            <BarChart
                                data={data.productComparison}
                                layout="vertical"
                                margin={{ left: isMobile ? 8 : 20, right: 8 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                <XAxis type="number" fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} />
                                <YAxis
                                    type="category"
                                    dataKey="productName"
                                    fontSize={isMobile ? 9 : 11}
                                    stroke="#64748b"
                                    width={isMobile ? 90 : 200}
                                    tickFormatter={(v: string) =>
                                        isMobile && v.length > 15 ? `${v.slice(0, 13)}…` : v
                                    }
                                />
                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                <Bar dataKey="amount" name="Sales Amount" fill="#3B82F6" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ChartBox>
                    </Card>

                    {/* Company Comparison + Quarterly */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <Card title="Company Sales Share Comparison" subtitle="Breakdown of sales turnover by division / company">
                            <ChartBox heightClass={isMobile ? "h-[360px]" : "h-[320px]"}>
                                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                    <Pie
                                        data={data.companyComparison}
                                        dataKey="amount"
                                        nameKey="company"
                                        cx={isMobile ? "50%" : "40%"}
                                        cy={isMobile ? "40%" : "50%"}
                                        outerRadius={isMobile ? 80 : 95}
                                        labelLine={false}
                                        label={(d: any) =>
                                            d.percent > 0.05 ? `${d.company} ${(d.percent * 100).toFixed(0)}%` : ""
                                        }
                                    >
                                        {data.companyComparison.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(255,255,255,0.7)" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                    <Legend
                                        layout={isMobile ? "horizontal" : "vertical"}
                                        align={isMobile ? "center" : "right"}
                                        verticalAlign={isMobile ? "bottom" : "middle"}
                                        iconType="circle"
                                        formatter={(value: string, entry: any) =>
                                            `${value} — ₹ ${formatINR(entry?.payload?.amount ?? 0)}`
                                        }
                                        wrapperStyle={{ fontSize: isMobile ? 11 : 12, color: "#334155", lineHeight: "22px" }}
                                    />
                                </PieChart>
                            </ChartBox>
                        </Card>

                        <Card title="Quarterly Sales Breakdown (Indian FY)" subtitle="Q1 (Apr-Jun), Q2 (Jul-Sep), Q3 (Oct-Dec), Q4 (Jan-Mar)">
                            <ChartBox heightClass="h-[250px] sm:h-[310px]">
                                <BarChart data={data.quarterlyComparison} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                    <XAxis dataKey="label" fontSize={isMobile ? 9 : 11} stroke="#64748b" />
                                    <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                    <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                    <Bar dataKey="totalAmount" name="Sales Turnover" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ChartBox>
                        </Card>
                    </div>

                    {/* Monthly Sales Trend */}
                    <Card title="Monthly Sales Turnover Trend Line" subtitle="Sequential monthly turnover progression">
                        <ChartBox heightClass="h-[250px] sm:h-[300px]">
                            <LineChart data={data.monthlyComparison} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                <XAxis dataKey="month" fontSize={isMobile ? 10 : 12} stroke="#64748b" />
                                <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹ ${formatINR(Number(v))}`} />
                                <Line
                                    type="monotone"
                                    dataKey="totalAmount"
                                    name="Monthly Sales"
                                    stroke="#6366F1"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "#6366F1", strokeWidth: 2, stroke: "#fff" }}
                                    activeDot={{ r: 6, fill: "#4f46e5" }}
                                />
                            </LineChart>
                        </ChartBox>
                    </Card>
                </>
            )}
        </div>
    );
}