/**
 * app/dashboard/compare/page.tsx
 * ---------------------------------------------------------------------------
 * Comparison Dashboard — "Liquid Glass" theme
 * Frosted / translucent cards over a soft ambient gradient, in the spirit of
 * Apple's visionOS / iOS 18 "Liquid Glass" material: backdrop-blur, subtle
 * white borders that catch light, layered soft shadows, generous radii.
 *
 * Requires `recharts` (npm install recharts) if not already in the project.
 * Tailwind's `backdrop-blur-*` utilities must be enabled (default in v3+).
 *
 * RESPONSIVE FIXES in this pass:
 *  - Header controls stack on mobile instead of overflowing/squeezing.
 *  - Chart heights are set via responsive Tailwind classes on a wrapper div
 *    (h-[220px] sm:h-[280px] ...) with ResponsiveContainer height="100%",
 *    instead of one fixed pixel height for every screen size.
 *  - Horizontal "Product Comparison" bar chart shrinks its label gutter and
 *    font size on small screens so labels don't eat the whole chart.
 *  - Pie chart switches from a right-side vertical legend (which crushes the
 *    pie on narrow screens) to a bottom horizontal legend on mobile, using a
 *    simple useIsMobile() breakpoint hook.
 *  - Card/page padding, gaps, and heading sizes scale down on small screens.
 * ---------------------------------------------------------------------------
 */

"use client";

import { useEffect, useState } from "react";
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

const COLORS = [
    "#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#A855F7",
    "#06B6D4", "#EC4899", "#84CC16", "#FB923C", "#6366F1",
];

const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);

// Shared glassy tooltip style for all recharts <Tooltip />
const glassTooltipStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(31,41,55,0.12)",
    fontSize: 13,
    color: "#1e293b",
};

/** Tracks a simple mobile breakpoint (< 640px, Tailwind's `sm`) client-side. */
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

/** Glass card shell — frosted panel with a soft specular highlight on top edge */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="relative rounded-[24px] sm:rounded-[28px] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(31,41,55,0.08)] p-4 sm:p-6 overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
            <h3 className="text-[14px] sm:text-[15px] font-semibold text-slate-800 mb-4 sm:mb-5 tracking-tight">{title}</h3>
            {children}
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="relative rounded-[24px] sm:rounded-[28px] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(31,41,55,0.08)] p-4 sm:p-6 overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
            <p className="text-[12px] sm:text-[13px] text-slate-500 font-medium">{label}</p>
            <p className="text-[20px] sm:text-[26px] font-bold text-slate-900 mt-1 tracking-tight break-words">{value}</p>
        </div>
    );
}

/** Ambient blurred gradient orbs that sit behind the glass layer */
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

/** Wrapper that gives ResponsiveContainer a responsive height via Tailwind classes */
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const isMobile = useIsMobile();

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);
            const res = await fetch(`/api/dashboard/compare?${params.toString()}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Failed to load dashboard");
            setData(json.data);
        } catch (e: any) {
            setError(e.message ?? "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen p-3 sm:p-6 space-y-4 sm:space-y-6 relative">
            <AmbientBackground />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end items-stretch justify-between gap-4 rounded-[24px] sm:rounded-[28px] border border-white/60 bg-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(31,41,55,0.08)] p-4 sm:p-6 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Comparison Dashboard</h1>
                <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-end gap-2">
                    <div className="grid grid-cols-2 sm:flex sm:items-end gap-2">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1 font-medium">From</label>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="w-full border border-white/70 bg-white/60 backdrop-blur-md rounded-xl px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1 font-medium">To</label>
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="w-full border border-white/70 bg-white/60 backdrop-blur-md rounded-xl px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                            />
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        className="w-full sm:w-auto bg-blue-500/90 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-xl shadow-[0_4px_16px_rgba(59,130,246,0.4)] backdrop-blur-md transition-colors"
                    >
                        Apply
                    </button>
                </div>
            </div>

            {loading && (
                <div className="rounded-[24px] sm:rounded-[28px] border border-white/60 bg-white/40 backdrop-blur-2xl p-4 sm:p-6 text-slate-600">
                    Loading dashboard...
                </div>
            )}
            {error && (
                <div className="rounded-[24px] sm:rounded-[28px] border border-red-200/60 bg-red-50/50 backdrop-blur-2xl p-4 sm:p-6 text-red-600 break-words">
                    Error: {error}
                </div>
            )}

            {data && (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
                        <StatCard label="Total Outstanding" value={`₹${formatINR(data.collectionVsOutstanding.totalOutstanding)}`} />
                        <StatCard label="Pending Invoices" value={String(data.collectionVsOutstanding.totalPendingInvoices)} />
                        <StatCard
                            label="Total Sales (period)"
                            value={`₹${formatINR(data.monthlyComparison.reduce((s, m) => s + m.totalAmount, 0))}`}
                        />
                    </div>

                    {/* Sales vs Purchase */}
                    <Card title="Sales vs Purchase (Monthly)">
                        <ChartBox heightClass="h-[240px] sm:h-[300px]">
                            <BarChart data={data.salesVsPurchase} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                <XAxis dataKey="month" fontSize={isMobile ? 10 : 12} stroke="#64748b" />
                                <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹${formatINR(Number(v))}`} />
                                <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
                                <Bar dataKey="sales" name="Sales" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="purchase" name="Purchase" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ChartBox>
                    </Card>

                    {/* Collection vs Outstanding */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <Card title="Collections (Monthly Debit / Credit)">
                            <ChartBox heightClass="h-[220px] sm:h-[280px]">
                                <BarChart data={data.collectionVsOutstanding.collectionsMonthly} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                    <XAxis dataKey="month" fontSize={isMobile ? 10 : 12} stroke="#64748b" />
                                    <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                    <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹${formatINR(Number(v))}`} />
                                    <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
                                    <Bar dataKey="debit" name="Debit" fill="#22C55E" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="credit" name="Credit" fill="#EF4444" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ChartBox>
                        </Card>

                        <Card title="Outstanding Aging">
                            <ChartBox heightClass="h-[220px] sm:h-[280px]">
                                <BarChart data={data.collectionVsOutstanding.aging} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                    <XAxis dataKey="bucket" fontSize={isMobile ? 10 : 12} stroke="#64748b" />
                                    <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                    <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹${formatINR(Number(v))}`} />
                                    <Bar dataKey="totalBalance" name="Balance" fill="#A855F7" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ChartBox>
                        </Card>
                    </div>

                    {/* Product Comparison */}
                    <Card title="Product Comparison (Top 15 by Amount)">
                        <ChartBox heightClass="h-[380px] sm:h-[420px]">
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
                                    width={isMobile ? 90 : 180}
                                    tickFormatter={(v: string) =>
                                        isMobile && v.length > 14 ? `${v.slice(0, 12)}…` : v
                                    }
                                />
                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹${formatINR(Number(v))}`} />
                                <Bar dataKey="amount" name="Amount" fill="#3B82F6" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ChartBox>
                    </Card>

                    {/* Company Comparison + Quarterly */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <Card title="Company Comparison">
                            <ChartBox heightClass={isMobile ? "h-[420px]" : "h-[340px]"}>
                                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                    <Pie
                                        data={data.companyComparison}
                                        dataKey="amount"
                                        nameKey="company"
                                        cx={isMobile ? "50%" : "38%"}
                                        cy={isMobile ? "38%" : "50%"}
                                        outerRadius={isMobile ? 80 : 95}
                                        labelLine={false}
                                        // Only label slices big enough to fit text without colliding
                                        label={(d: any) =>
                                            d.percent > 0.05 ? `${d.company} ${(d.percent * 100).toFixed(0)}%` : ""
                                        }
                                    >
                                        {data.companyComparison.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(255,255,255,0.7)" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹${formatINR(Number(v))}`} />
                                    <Legend
                                        layout={isMobile ? "horizontal" : "vertical"}
                                        align={isMobile ? "center" : "right"}
                                        verticalAlign={isMobile ? "bottom" : "middle"}
                                        iconType="circle"
                                        formatter={(value: string, entry: any) =>
                                            `${value} — ₹${formatINR(entry?.payload?.amount ?? 0)}`
                                        }
                                        wrapperStyle={{ fontSize: isMobile ? 11 : 12, color: "#334155", lineHeight: "20px" }}
                                    />
                                </PieChart>
                            </ChartBox>
                        </Card>

                        <Card title="Quarterly Comparison (FY, Apr-Mar)">
                            <ChartBox heightClass="h-[240px] sm:h-[300px]">
                                <BarChart data={data.quarterlyComparison} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                    <XAxis dataKey="label" fontSize={isMobile ? 9 : 11} stroke="#64748b" />
                                    <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                    <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹${formatINR(Number(v))}`} />
                                    <Bar dataKey="totalAmount" name="Amount" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ChartBox>
                        </Card>
                    </div>

                    {/* Monthly Comparison */}
                    <Card title="Monthly Comparison">
                        <ChartBox heightClass="h-[240px] sm:h-[300px]">
                            <LineChart data={data.monthlyComparison} margin={{ left: isMobile ? -20 : 0, right: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                <XAxis dataKey="month" fontSize={isMobile ? 10 : 12} stroke="#64748b" />
                                <YAxis fontSize={isMobile ? 10 : 12} stroke="#64748b" tickFormatter={formatINR} width={isMobile ? 40 : 60} />
                                <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => `₹${formatINR(Number(v))}`} />
                                <Line
                                    type="monotone"
                                    dataKey="totalAmount"
                                    name="Amount"
                                    stroke="#6366F1"
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: "#6366F1" }}
                                />
                            </LineChart>
                        </ChartBox>
                    </Card>
                </>
            )}
        </div>
    );
}