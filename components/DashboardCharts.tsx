"use client";

import { useState } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
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
import {
    TrendingUp,
    ArrowLeftRight,
    AlertTriangle,
    Wallet,
    Package,
    Users,
    Boxes,
    CalendarClock,
    PieChart as PieIcon,
    LineChart as LineIcon,
    LucideIcon,
    X,
    Maximize2,
    Table as TableIcon,
} from "lucide-react";

const COLORS = ["#343872", "#fb8c00", "#2ecc71", "#e74c3c", "#3498db", "#9b59b6", "#1abc9c", "#f1c40f"];

const AXIS_STYLE = { fontSize: 12, fill: "#64748b" };
const GRID_STROKE = "#e2e8f0";

function truncateLabel(value: string, max = 16) {
    if (!value) return value;
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-white/60 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-md">
            {label && <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>}
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                    <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: p.color || p.fill }}
                    />
                    <span className="text-slate-600">{p.name}:</span>
                    <span className="font-semibold text-slate-900">
                        {typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

// Card shell — liquid glass with click popover
function ChartCard({
    title,
    subtitle,
    icon: Icon,
    iconColor = "#343872",
    children,
    emptyMessage,
    span,
    index = 0,
    onClick,
}: {
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    iconColor?: string;
    children: React.ReactNode;
    emptyMessage?: string;
    span?: "full";
    index?: number;
    onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            style={{ animationDelay: `${index * 60}ms` }}
            className={`
                group relative isolate overflow-hidden cursor-pointer rounded-2xl
                bg-white/40 dark:bg-slate-800/60 backdrop-blur-xl backdrop-saturate-150
                border border-white/60 dark:border-slate-700
                shadow-[0_8px_32px_rgba(31,38,135,0.10)]
                ring-1 ring-white/40
                animate-[fadeSlideIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]
                transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(31,38,135,0.18)]
                p-5 sm:p-6
                ${span === "full" ? "xl:col-span-2" : ""}
            `}
        >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent" />

            <div
                className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-50 scale-90 transition-all duration-700 ease-out group-hover:opacity-90 group-hover:scale-125"
                style={{ background: `radial-gradient(circle, ${iconColor}55, transparent 70%)` }}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

            <div className="relative mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/60 dark:bg-slate-900 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:rotate-6"
                    >
                        <Icon className="h-4.5 w-4.5" style={{ color: iconColor }} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <h5 className="truncate text-xs sm:text-sm font-normal text-slate-700 dark:text-slate-300">{title}</h5>
                        {subtitle && <p className="mt-0.5 text-[10.5px] sm:text-xs font-normal text-slate-400">{subtitle}</p>}
                    </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[11px] font-bold">
                    <span>Expand</span> <Maximize2 size={12} />
                </div>
            </div>

            {emptyMessage ? (
                <div className="relative flex h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/70 bg-white/30 backdrop-blur-sm px-6 text-center">
                    <AlertTriangle className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
                    <p className="text-xs leading-relaxed text-slate-500">{emptyMessage}</p>
                </div>
            ) : (
                <div className="relative">
                    <ResponsiveContainer width="100%" height={260}>
                        {children as any}
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

function mergeByMonth(sales: any[] = [], collection: any[] = []) {
    const map = new Map<string, { month: string; sales: number; collection: number }>();
    for (const item of sales) {
        map.set(item.month, { month: item.month, sales: item.total || 0, collection: 0 });
    }
    for (const item of collection) {
        const existing = map.get(item.month);
        if (existing) {
            existing.collection = item.total || 0;
        } else {
            map.set(item.month, { month: item.month, sales: 0, collection: item.total || 0 });
        }
    }
    return Array.from(map.values());
}

export default function DashboardCharts({ charts }: { charts: any }) {
    const [chartModal, setChartModal] = useState<{
        isOpen: boolean;
        title: string;
        subtitle: string;
        data: any[];
    }>({
        isOpen: false,
        title: "",
        subtitle: "",
        data: [],
    });

    if (!charts) return null;

    const openModal = (title: string, subtitle: string, data: any[]) => {
        setChartModal({
            isOpen: true,
            title,
            subtitle,
            data: data || [],
        });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {/* 1. Sales Trend */}
                <ChartCard
                    index={0}
                    title="Sales Trend"
                    subtitle="Monthly totals"
                    icon={TrendingUp}
                    iconColor="#343872"
                    onClick={() => openModal("Sales Trend", "Monthly Sales Performance", charts.salesTrend)}
                >
                    <LineChart data={charts.salesTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="total"
                            name="Sales"
                            stroke="#343872"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: "#343872" }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ChartCard>

                {/* 2. Sales vs Collection */}
                <ChartCard
                    index={1}
                    title="Sales vs Collection"
                    subtitle="Cash flow comparison"
                    icon={ArrowLeftRight}
                    iconColor="#fb8c00"
                    onClick={() => openModal("Sales vs Collection", "Cashflow Breakdown", mergeByMonth(charts.salesTrend, charts.collectionTrend))}
                >
                    <LineChart data={mergeByMonth(charts.salesTrend, charts.collectionTrend)}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                        <Line type="monotone" dataKey="sales" name="Sales" stroke="#343872" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line
                            type="monotone"
                            dataKey="collection"
                            name="Collection"
                            stroke="#fb8c00"
                            strokeWidth={2.5}
                            strokeDasharray="5 5"
                            dot={{ r: 3 }}
                        />
                    </LineChart>
                </ChartCard>

                {/* 3. Outstanding Aging */}
                <ChartCard
                    index={2}
                    title="Outstanding Aging"
                    subtitle="Bucket-wise dues"
                    icon={Wallet}
                    iconColor="#e74c3c"
                    onClick={() => openModal("Outstanding Aging", "Aging Bucket Analysis", charts.outstandingAging)}
                >
                    <BarChart data={charts.outstandingAging}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="bucket" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                        <Bar dataKey="total" name="Outstanding" fill="#e74c3c" radius={[8, 8, 0, 0]} maxBarSize={48} />
                    </BarChart>
                </ChartCard>

                {/* 4. Collection Trend */}
                <ChartCard
                    index={3}
                    title="Collection Trend"
                    subtitle="Monthly recoveries"
                    icon={LineIcon}
                    iconColor="#2ecc71"
                    onClick={() => openModal("Collection Trend", "Monthly Collection Receipts", charts.collectionTrend)}
                >
                    <LineChart data={charts.collectionTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="total"
                            name="Collection"
                            stroke="#2ecc71"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: "#2ecc71" }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ChartCard>

                {/* 5. Top 10 Products */}
                <ChartCard
                    index={4}
                    title="Top 10 Products"
                    subtitle="By sale amount"
                    icon={Package}
                    iconColor="#3498db"
                    onClick={() => openModal("Top 10 Products", "Best Selling Products", charts.topProducts)}
                >
                    <BarChart data={charts.topProducts} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                        <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={130}
                            tick={{ ...AXIS_STYLE, fontSize: 11 }}
                            tickFormatter={truncateLabel}
                            interval={0}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                        <Bar dataKey="amount" name="Amount" fill="#3498db" radius={[0, 8, 8, 0]} maxBarSize={18} />
                    </BarChart>
                </ChartCard>

                {/* 6. Top 10 Customers */}
                <ChartCard
                    index={5}
                    title="Top 10 Customers"
                    subtitle="By sale amount"
                    icon={Users}
                    iconColor="#9b59b6"
                    onClick={() => openModal("Top 10 Customers", "Highest Revenue Customers", charts.topCustomers)}
                >
                    <BarChart data={charts.topCustomers} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                        <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={130}
                            tick={{ ...AXIS_STYLE, fontSize: 11 }}
                            tickFormatter={truncateLabel}
                            interval={0}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                        <Bar dataKey="amount" name="Amount" fill="#9b59b6" radius={[0, 8, 8, 0]} maxBarSize={18} />
                    </BarChart>
                </ChartCard>

                {/* 7. Stock Status */}
                <ChartCard
                    index={6}
                    title="Stock Status"
                    subtitle="Current inventory split"
                    icon={Boxes}
                    iconColor="#1abc9c"
                    onClick={() => openModal("Stock Status", "Inventory Distribution", charts.stockStatus)}
                >
                    <PieChart>
                        <Pie
                            data={charts.stockStatus}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={2}
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            {charts.stockStatus?.map((_: any, i: number) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    </PieChart>
                </ChartCard>

                {/* 8. Expiry Status */}
                <ChartCard
                    index={7}
                    title="Expiry Status"
                    subtitle="Batch expiration timeline"
                    icon={CalendarClock}
                    iconColor="#f1c40f"
                    onClick={() => openModal("Expiry Status", "Batch Expiration Timeline", charts.expiryStatus)}
                >
                    <PieChart>
                        <Pie
                            data={charts.expiryStatus}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={2}
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            {charts.expiryStatus?.map((_: any, i: number) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    </PieChart>
                </ChartCard>

                {/* 9. Sale Type Distribution */}
                <ChartCard
                    index={8}
                    title="Sale Type Distribution"
                    subtitle="Breakdown by transaction type"
                    icon={PieIcon}
                    iconColor="#8e44ad"
                    onClick={() => openModal("Sale Type Distribution", "Transaction Volume Breakdown", charts.saleTypeDistribution)}
                >
                    <PieChart>
                        <Pie
                            data={charts.saleTypeDistribution}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={3}
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            {charts.saleTypeDistribution?.map((_: any, i: number) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                    </PieChart>
                </ChartCard>

                {/* 10. Monthly Sales Growth (%) */}
                <ChartCard
                    index={9}
                    title="Monthly Sales Growth (%)"
                    subtitle="Month-over-month growth rate"
                    icon={TrendingUp}
                    iconColor="#16a085"
                    onClick={() => openModal("Monthly Sales Growth", "Month-over-Month Growth Rate (%)", charts.monthlyGrowth)}
                >
                    <LineChart data={charts.monthlyGrowth}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="%" />
                        <Tooltip content={<ChartTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="growth"
                            name="Growth %"
                            stroke="#16a085"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: "#16a085" }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ChartCard>
            </div>

            {/* Apple Liquid Glass Drilldown Chart Modal */}
            {chartModal.isOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-[fadeSlideIn_0.3s_ease-out]">
                    <div className="bg-white/90 dark:bg-slate-900/90 w-full max-w-4xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-white/60 dark:border-slate-700/60 overflow-hidden backdrop-blur-2xl flex flex-col max-h-[85vh]">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <TableIcon className="text-indigo-600" /> {chartModal.title} Drilldown
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">{chartModal.subtitle}</p>
                            </div>
                            <button
                                onClick={() => setChartModal((prev) => ({ ...prev, isOpen: false }))}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:text-slate-800 dark:hover:text-white transition"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-slate-400">
                                            <th className="py-2.5 px-3">Item / Period / Bucket</th>
                                            <th className="py-2.5 px-3 text-right">Value / Count</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {chartModal.data.map((row: any, idx: number) => {
                                            const label = row.name || row.month || row.bucket || row.status || `Item ${idx + 1}`;
                                            const val = row.total ?? row.amount ?? row.count ?? row.sales ?? 0;
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{label}</td>
                                                    <td className="py-3 px-3 text-right font-black text-indigo-600 dark:text-indigo-400">
                                                        {typeof val === "number" ? val.toLocaleString("en-IN") : val}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
                            <button
                                onClick={() => setChartModal((prev) => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}