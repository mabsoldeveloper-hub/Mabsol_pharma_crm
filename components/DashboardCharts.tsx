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

const COLORS = ["#343872", "#fb8c00", "#2ecc71", "#e74c3c", "#3498db", "#9b59b6", "#1abc9c", "#f1c40f"];

function ChartCard({
    title,
    children,
    emptyMessage,
}: {
    title: string;
    children: React.ReactNode;
    emptyMessage?: string;
}) {
    return (
        <div className="col-xl-6 col-12 mb-4">
            <div className="card border-0 shadow h-100">
                <div className="card-body p-4">
                    <h5 className="mb-3">{title}</h5>
                    {emptyMessage ? (
                        // Plain text fallback — never put non-chart HTML inside
                        // ResponsiveContainer, it expects a single chart child and
                        // will mis-measure/collapse around arbitrary elements.
                        <div
                            className="text-muted small d-flex align-items-center justify-content-center text-center"
                            style={{ height: 280 }}
                        >
                            {emptyMessage}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            {children as any}
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DashboardCharts({ charts }: { charts: any }) {
    if (!charts) return null;

    return (
        <div className="row g-4">
            <ChartCard title="Sales Trend">
                <LineChart data={charts.salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" name="Sales" stroke="#343872" strokeWidth={2} />
                </LineChart>
            </ChartCard>

            <ChartCard title="Sales vs Collection">
                <LineChart data={mergeByMonth(charts.salesTrend, charts.collectionTrend)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sales" name="Sales" stroke="#343872" strokeWidth={2} />
                    <Line type="monotone" dataKey="collection" name="Collection" stroke="#fb8c00" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
            </ChartCard>

            <ChartCard title="Outstanding Aging">
                <BarChart data={charts.outstandingAging}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" name="Outstanding" fill="#e74c3c" radius={[6, 6, 0, 0]} />
                </BarChart>
            </ChartCard>

            <ChartCard title="Collection Trend">
                <LineChart data={charts.collectionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" name="Collection" stroke="#2ecc71" strokeWidth={2} />
                </LineChart>
            </ChartCard>

            <ChartCard title="Top 10 Products">
                <BarChart data={charts.topProducts} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip />
                    <Bar dataKey="amount" name="Amount" fill="#3498db" radius={[0, 6, 6, 0]} />
                </BarChart>
            </ChartCard>

            <ChartCard
                title="Top 10 Customers"
                emptyMessage={
                    charts.topCustomers?.length
                        ? undefined
                        : "Pending: needs the customer-link field on MDIS confirmed (see MDIS_CUSTOMER_FIELD in the API route)."
                }
            >
                <BarChart data={charts.topCustomers} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip />
                    <Bar dataKey="amount" name="Amount" fill="#9b59b6" radius={[0, 6, 6, 0]} />
                </BarChart>
            </ChartCard>

            <ChartCard title="Stock Status">
                <PieChart>
                    <Pie data={charts.stockStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
                        {charts.stockStatus?.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ChartCard>

            <ChartCard title="Expiry Analysis">
                <PieChart>
                    <Pie data={charts.expiryStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
                        {charts.expiryStatus?.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ChartCard>

            <ChartCard
                title="Sales Type Distribution"
                emptyMessage={
                    charts.saleTypeDistribution?.length
                        ? undefined
                        : "Pending: SALETYPE.AMOUNT is a config field (mostly 0 in your data), not a transaction total. Need the field on MDIS/DIS that links a sale row to its SALETYPE code to chart this properly."
                }
            >
                <PieChart>
                    <Pie data={charts.saleTypeDistribution} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                        {charts.saleTypeDistribution?.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ChartCard>

            <ChartCard title="Monthly Growth">
                <AreaChart data={[{ label: "This Month", growth: charts.monthlyGrowth }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Area
                        type="monotone"
                        dataKey="growth"
                        name="Growth %"
                        stroke={charts.monthlyGrowth >= 0 ? "#2ecc71" : "#e74c3c"}
                        fill={charts.monthlyGrowth >= 0 ? "#2ecc71" : "#e74c3c"}
                        fillOpacity={0.2}
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