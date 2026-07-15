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
        <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
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

// ---------- Card shell ----------
function ChartCard({
    title,
    subtitle,
    icon: Icon,
    iconColor = "#343872",
    children,
    emptyMessage,
    span,
}: {
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    iconColor?: string;
    children: React.ReactNode;
    emptyMessage?: string;
    span?: "full";
}) {
    return (
        <div
            className={`group cursor-default rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-slate-200 hover:shadow-lg sm:p-6 ${span === "full" ? "xl:col-span-2" : ""
                }`}
        >
            <div className="mb-4 flex items-start gap-3">
                <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ease-out group-hover:scale-110"
                    style={{ backgroundColor: `${iconColor}14` }}
                >
                    <Icon className="h-4.5 w-4.5" style={{ color: iconColor }} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                    <h5 className="truncate text-sm font-semibold text-slate-800">{title}</h5>
                    {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
                </div>
            </div>

            {emptyMessage ? (
                <div className="flex h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
                    <AlertTriangle className="h-5 w-5 text-slate-300" strokeWidth={1.75} />
                    <p className="text-xs leading-relaxed text-slate-400">{emptyMessage}</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    {children as any}
                </ResponsiveContainer>
            )}
        </div>
    );
}

export default function DashboardCharts({ charts }: { charts: any }) {
    if (!charts) return null;

    const growthPositive = charts.monthlyGrowth >= 0;

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ChartCard title="Sales Trend" subtitle="Monthly totals" icon={TrendingUp} iconColor="#343872">
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

            <ChartCard title="Sales vs Collection" subtitle="Cash flow comparison" icon={ArrowLeftRight} iconColor="#fb8c00">
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

            <ChartCard title="Outstanding Aging" subtitle="Bucket-wise dues" icon={Wallet} iconColor="#e74c3c">
                <BarChart data={charts.outstandingAging}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="bucket" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} tickLine={false} />
                    <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="total" name="Outstanding" fill="#e74c3c" radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
            </ChartCard>

            <ChartCard title="Collection Trend" subtitle="Monthly recoveries" icon={LineIcon} iconColor="#2ecc71">
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

            <ChartCard title="Top 10 Products" subtitle="By sale amount" icon={Package} iconColor="#3498db">
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
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="amount" name="Amount" fill="#3498db" radius={[0, 8, 8, 0]} maxBarSize={18} />
                </BarChart>
            </ChartCard>

            <ChartCard
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
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="amount" name="Amount" fill="#9b59b6" radius={[0, 8, 8, 0]} maxBarSize={18} />
                </BarChart>
            </ChartCard>

            <ChartCard title="Stock Status" subtitle="Current inventory split" icon={Boxes} iconColor="#1abc9c">
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

            <ChartCard title="Expiry Analysis" subtitle="Batch expiry breakdown" icon={CalendarClock} iconColor="#f1c40f">
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