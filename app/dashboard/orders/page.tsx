"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
    ShoppingCart,
    CalendarDays,
    CalendarRange,
    CalendarClock,
    IndianRupee,
    Clock,
    Truck,
    XCircle,
    Users,
    Package,
    Wallet,
    AlertCircle,
    RefreshCw,
} from "lucide-react";

interface DashboardData {
    kpiCards: {
        totalOrders: number;
        todaysOrders: number;
        monthlyOrders: number;
        yearlyOrders: number;
        totalSales: number;
        pendingOrders: number;
        deliveredOrders: number;
        cancelledOrders: number | null;
        totalCustomers: number;
        totalProductsSold: number;
        totalCollection: number;
        outstanding: number;
    };
    orderSummary: any[];
    latestOrders: any[];
    orderItems: any[];
    paymentDetails: any[];
    dispatchDetails: any[];
    charts: {
        ordersTrend: any[];
        dailySales: any[];
        topCustomers: any[];
        topProducts: any[];
        collectionTrend: any[];
        orderStatus: any | null;
    };
    filterOptions: {
        dsm: string[];
        area: string[];
        route: string[];
    };
}

function formatINR(value: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(value || 0);
}

export default function OrdersDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);

    // ---- Filter state (all wired to the API as query params) ----
    const [customer, setCustomer] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [invoice, setInvoice] = useState("");
    const [area, setArea] = useState("");
    const [route, setRoute] = useState("");
    const [dsm, setDsm] = useState("");

    const loadDashboard = async () => {
        try {
            setLoading(true);

            const res = await axios.get("/api/dashboard/orders", {
                params: {
                    customer: customer || undefined,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                    invoice: invoice || undefined,
                    area: area || undefined,
                    route: route || undefined,
                    dsm: dsm || undefined,
                },
            });

            setDashboard(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Initial load (no filters)
    useEffect(() => {
        loadDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleClearFilters = () => {
        setCustomer("");
        setDateFrom("");
        setDateTo("");
        setInvoice("");
        setArea("");
        setRoute("");
        setDsm("");
        // reload immediately with cleared filters
        setTimeout(loadDashboard, 0);
    };

    if (loading && !dashboard) {
        return (
            <div className="flex items-center justify-center h-[70vh] text-lg font-semibold text-gray-500">
                Loading Dashboard...
            </div>
        );
    }

    const kpi = dashboard?.kpiCards;
    const options = dashboard?.filterOptions;

    const cards = [
        { title: "Total Orders", value: kpi?.totalOrders ?? 0, icon: <ShoppingCart size={22} /> },
        { title: "Today's Orders", value: kpi?.todaysOrders ?? 0, icon: <CalendarDays size={22} /> },
        { title: "Monthly Orders", value: kpi?.monthlyOrders ?? 0, icon: <CalendarRange size={22} /> },
        { title: "Yearly Orders", value: kpi?.yearlyOrders ?? 0, icon: <CalendarClock size={22} /> },
        { title: "Total Sales", value: formatINR(kpi?.totalSales ?? 0), icon: <IndianRupee size={22} /> },
        { title: "Pending Orders", value: kpi?.pendingOrders ?? 0, icon: <Clock size={22} /> },
        {
            title: "Delivered Orders",
            value: kpi?.deliveredOrders ?? 0,
            icon: <Truck size={22} />,
            note: "Proxy: total dispatch records (no status field yet)",
        },
        {
            title: "Cancelled Orders",
            value: kpi?.cancelledOrders ?? "N/A",
            icon: <XCircle size={22} />,
            note: "MDIS TYPE = \"V\" (unposted/void vouchers)",
        },
        { title: "Total Customers", value: kpi?.totalCustomers ?? 0, icon: <Users size={22} /> },
        { title: "Products Sold (Qty)", value: kpi?.totalProductsSold ?? 0, icon: <Package size={22} /> },
        { title: "Total Collection", value: formatINR(kpi?.totalCollection ?? 0), icon: <Wallet size={22} /> },
        { title: "Outstanding", value: formatINR(kpi?.outstanding ?? 0), icon: <AlertCircle size={22} /> },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow p-5">
                <div className="flex flex-wrap gap-3 items-center">
                    <input
                        className="border rounded-lg px-4 py-2 w-56"
                        placeholder="Search Customer..."
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && loadDashboard()}
                    />

                    <input
                        type="date"
                        className="border rounded-lg px-4 py-2"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                    />

                    <input
                        type="date"
                        className="border rounded-lg px-4 py-2"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                    />

                    <input
                        className="border rounded-lg px-4 py-2 w-40"
                        placeholder="Invoice No..."
                        value={invoice}
                        onChange={(e) => setInvoice(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && loadDashboard()}
                    />

                    <select
                        className="border rounded-lg px-4 py-2"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                    >
                        <option value="">All Areas</option>
                        {options?.area?.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>

                    <select
                        className="border rounded-lg px-4 py-2"
                        value={route}
                        onChange={(e) => setRoute(e.target.value)}
                        disabled={!options?.route?.length}
                        title={!options?.route?.length ? "ROUT is not populated in source data yet" : ""}
                    >
                        <option value="">All Routes</option>
                        {options?.route?.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>

                    <select
                        className="border rounded-lg px-4 py-2"
                        value={dsm}
                        onChange={(e) => setDsm(e.target.value)}
                    >
                        <option value="">All DSM</option>
                        {options?.dsm?.map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={loadDashboard}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center gap-2"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        {loading ? "Loading..." : "Apply / Refresh"}
                    </button>

                    <button
                        onClick={handleClearFilters}
                        className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm"
                    >
                        Clear filters
                    </button>
                </div>

                {!options?.route?.length && (
                    <p className="text-[11px] text-amber-600 mt-3">
                        Note: Route and Area filters are disabled/empty because the
                        ROUT/AREA fields are 100% NULL across every table in the source
                        data (verified) — this isn't a bug, there's simply nothing to
                        filter on until the client starts capturing that in VFP.
                    </p>
                )}
            </div>

            {/* 12 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {cards.map((card, index) => (
                    <div key={index} className="bg-white rounded-xl shadow hover:shadow-lg transition p-5">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-sm">{card.title}</p>
                                <h2 className="text-2xl font-bold mt-2">{card.value}</h2>
                                {card.note && (
                                    <p className="text-[11px] text-amber-600 mt-1">{card.note}</p>
                                )}
                            </div>
                            <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                                {card.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Order Summary */}
            <Section title="Order Summary">
                <Table
                    columns={["Invoice", "Date", "Customer", "Route", "DSM", "Items", "Net Amount"]}
                    rows={dashboard?.orderSummary?.map((r) => [
                        r.VCN,
                        r.DATE,
                        r.CODEP,
                        r.ROUT ?? "-",
                        r.DSM ?? "-",
                        r.NOCS ?? "-",
                        formatINR(r.FINAL),
                    ])}
                />
            </Section>

            {/* Latest Orders */}
            <Section title="Latest Orders (Last 10)">
                <Table
                    columns={["Invoice", "Voucher", "Date", "Customer", "Net Amount"]}
                    rows={dashboard?.latestOrders?.map((r) => [
                        r.VCN,
                        r.VOUCHER,
                        r.DATE,
                        r.CODEP,
                        formatINR(r.FINAL),
                    ])}
                />
            </Section>

            {/* Order Items */}
            <Section title="Order Items">
                <Table
                    columns={["Invoice", "Product", "Batch", "Expiry", "Qty", "Rate", "MRP", "Amount"]}
                    rows={dashboard?.orderItems?.map((r) => [
                        r.VCN,
                        r.productName ?? r.CODE,
                        r.BATCH,
                        r.batchExpiry ?? "-",
                        r.QTY,
                        r.RATE,
                        r.batchMrp ?? r.MRP,
                        formatINR(r.AMMMOUNT),
                    ])}
                />
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Details */}
                <Section title="Payment Details">
                    <Table
                        columns={["Voucher", "Party", "Date", "Debit", "Credit"]}
                        rows={dashboard?.paymentDetails?.map((r) => [
                            r.VOUCHER,
                            r.CODE,
                            r.DATE,
                            formatINR(r.DEBIT),
                            formatINR(r.CREDIT),
                        ])}
                    />
                </Section>

                {/* Dispatch Details */}
                <Section title="Dispatch Details">
                    <Table
                        columns={["Invoice", "Voucher", "Date", "Customer", "DSM"]}
                        rows={dashboard?.dispatchDetails?.map((r) => [
                            r.VCN,
                            r.VOUCHER,
                            r.DATE,
                            r.CODEP,
                            r.DSM ?? "-",
                        ])}
                    />
                </Section>
            </div>

            <p className="text-xs text-gray-400">
                Note: "Delivered" is still a dispatch-count proxy until the client
                confirms a real status field on SUBDIS. "Cancelled" now reflects
                MDIS records with TYPE = "V" (unposted/void vouchers, verified to
                always have a null date and null invoice number).
            </p>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl shadow p-5">
            <h3 className="text-base font-semibold mb-4">{title}</h3>
            {children}
        </div>
    );
}

function Table({ columns, rows }: { columns: string[]; rows?: any[][] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-500 border-b">
                        {columns.map((c) => (
                            <th key={c} className="py-2 pr-4 font-medium">
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows && rows.length > 0 ? (
                        rows.map((row, i) => (
                            <tr key={i} className="border-b last:border-0">
                                {row.map((cell, j) => (
                                    <td key={j} className="py-2 pr-4 whitespace-nowrap">
                                        {cell ?? "-"}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="py-4 text-center text-gray-400">
                                No data
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}