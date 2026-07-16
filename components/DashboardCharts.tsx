"use client";

import {
    LineChart,
    Line,
    AreaChart,
    Area,
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
} from "lucide-react";

const COLORS = ["#343872", "#fb8c00", "#2ecc71", "#e74c3c", "#3498db", "#9b59b6", "#1abc9c", "#f1c40f"];

const AXIS_STYLE = { fontSize: 12, fill: "#64748b" };
const GRID_STROKE = "#e2e8f0";

// Truncate long bar-chart labels (product/customer names) so they don't overlap
function truncateLabel(value: string, max = 16) {
    if (!value) return value;
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

// ---------- Shared custom tooltip so every chart matches ----------
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

// ---------- Card shell — liquid glass ----------
function ChartCard({
    title,
    subtitle,
    icon: Icon,
    iconColor = "#343872",
    children,
    emptyMessage,
    span,
    index = 0,
}: {
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    iconColor?: string;
    children: React.ReactNode;
    emptyMessage?: string;
    span?: "full";
    index?: number;
}) {
    return (
        <div
            style={{ animationDelay: `${index * 60}ms` }}
            className={`
                group relative isolate overflow-hidden cursor-default rounded-2xl
                bg-white/40 backdrop-blur-xl backdrop-saturate-150
                border border-white/60
                shadow-[0_8px_32px_rgba(31,38,135,0.10)]
                ring-1 ring-white/40
                animate-[fadeSlideIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]
                transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(31,38,135,0.16)]
                p-5 sm:p-6
                ${span === "full" ? "xl:col-span-2" : ""}
            `}
        >
            {/* liquid glass top-sheen */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent" />

            {/* soft colored glow blob, apple-style */}
            <div
                className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-50 scale-90 transition-all duration-700 ease-out group-hover:opacity-90 group-hover:scale-125"
                style={{ background: `radial-gradient(circle, ${iconColor}55, transparent 70%)` }}
            />

            {/* glass edge highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

            <div className="relative mb-4 flex items-start gap-3">
                <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/60 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:rotate-6"
                >
                    <Icon className="h-4.5 w-4.5" style={{ color: iconColor }} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                    <h5 className="truncate text-sm font-semibold text-slate-800">{title}</h5>
                    {subtitle && <p className="mt-0.5 text-xs text-slate-500/90">{subtitle}</p>}
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

            <style jsx global>{`
                @keyframes fadeSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(12px) scale(0.97);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </div>
    );
}

export default function DashboardCharts({ charts }: { charts: any }) {
    if (!charts) return null;

    const growthPositive = charts.monthlyGrowth >= 0;

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ChartCard index={0} title="Sales Trend" subtitle="Monthly totals" icon={TrendingUp} iconColor="#343872">
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

            <ChartCard index={1} title="Sales vs Collection" subtitle="Cash flow comparison" icon={ArrowLeftRight} iconColor="#fb8c00">
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

            <ChartCard index={2} title="Outstanding Aging" subtitle="Bucket-wise dues" icon={Wallet} iconColor="#e74c3c">
                <BarChart data={charts.outstandingAging}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="bucket" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                    <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.15)" }} />
                    <Bar dataKey="total" name="Outstanding" fill="#e74c3c" radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
            </ChartCard>

            <ChartCard index={3} title="Collection Trend" subtitle="Monthly recoveries" icon={LineIcon} iconColor="#2ecc71">
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

            <ChartCard index={4} title="Top 10 Products" subtitle="By sale amount" icon={Package} iconColor="#3498db">
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

            <ChartCard
                index={5}
                title="Top 10 Customers"
                subtitle="By sale amount"
                icon={Users}
                iconColor="#9b59b6"
                emptyMessage={
                    charts.topCustomers?.length
                        ? undefined
                        : "Pending: needs the customer-link field on MDIS confirmed (see MDIS_CUSTOMER_FIELD in the API route)."
                }
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

            <ChartCard index={6} title="Stock Status" subtitle="Current inventory split" icon={Boxes} iconColor="#1abc9c">
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

            <ChartCard index={7} title="Expiry Analysis" subtitle="Batch expiry breakdown" icon={CalendarClock} iconColor="#f1c40f">
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

            <ChartCard
                index={8}
                title="Sales Type Distribution"
                subtitle="Share by sale type"
                icon={PieIcon}
                iconColor="#e67e22"
                emptyMessage={
                    charts.saleTypeDistribution?.length
                        ? undefined
                        : "Pending: SALETYPE.AMOUNT is a config field (mostly 0 in your data), not a transaction total. Need the field on MDIS/DIS that links a sale row to its SALETYPE code to chart this properly."
                }
            >
                <PieChart>
                    <Pie
                        data={charts.saleTypeDistribution}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        paddingAngle={2}
                        stroke="#fff"
                        strokeWidth={2}
                    >
                        {charts.saleTypeDistribution?.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                </PieChart>
            </ChartCard>

            <ChartCard
                index={9}
                title="Monthly Growth"
                subtitle={`${growthPositive ? "Up" : "Down"} vs last month`}
                icon={TrendingUp}
                iconColor={growthPositive ? "#2ecc71" : "#e74c3c"}
            >
                <AreaChart data={[{ label: "This Month", growth: charts.monthlyGrowth }]}>
                    <defs>
                        <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={growthPositive ? "#2ecc71" : "#e74c3c"} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={growthPositive ? "#2ecc71" : "#e74c3c"} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                    <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="growth"
                        name="Growth %"
                        stroke={growthPositive ? "#2ecc71" : "#e74c3c"}
                        strokeWidth={2.5}
                        fill="url(#growthFill)"
                    />
                </AreaChart>
            </ChartCard>
        </div>
    );
}

function mergeByMonth(sales: any[] = [], collection: any[] = []) {
    const map: Record<string, { month: string; sales: number; collection: number }> = {};
    for (const s of sales) {
        map[s.month] = map[s.month] || { month: s.month, sales: 0, collection: 0 };
        map[s.month].sales = s.total;
    }
    for (const c of collection) {
        map[c.month] = map[c.month] || { month: c.month, sales: 0, collection: 0 };
        map[c.month].collection = c.total;
    }
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}