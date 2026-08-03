"use client";

import Link from "next/link";
import {
    FaUsers,
    FaShoppingCart,
    FaBoxOpen,
    FaFileInvoiceDollar,
    FaReceipt,
    FaArrowRight,
    FaBullseye,
    FaUndoAlt,
    FaHandHoldingUsd,
    FaChartBar,
    FaFileInvoice,
    FaTruck,
} from "react-icons/fa";

export default function ReportsPage() {
    // Separate Executive Purchase Reports Cards
    const purchaseReports = [
        {
            title: "Purchase Reports Hub",
            desc: "Central executive purchase analytics, 5 summary KPI cards & multidirectional filters",
            icon: <FaChartBar size={16} />,
            link: "/dashboard/purchase/reports",
            color: "purple",
        },
        {
            title: "Purchase Invoices Report",
            desc: "Inward stock entry, bill payment statuses, settled paid value & balance dues",
            icon: <FaFileInvoice size={16} />,
            link: "/dashboard/purchase/reports/invoices",
            color: "amber",
        },
        {
            title: "Purchase Orders Report",
            desc: "Supplier requisitions, priority matrix, fulfillment status & pending POs",
            icon: <FaTruck size={16} />,
            link: "/dashboard/purchase/reports/orders",
            color: "indigo",
        },
        {
            title: "Purchase Returns Report",
            desc: "Debit note vouchers, damaged & expired stock returns & bill references",
            icon: <FaUndoAlt size={16} />,
            link: "/dashboard/purchase/reports/returns",
            color: "orange",
        },
        {
            title: "Supplier Payments Report",
            desc: "Payment receipts, UTR bank transfers, Cash Discounts & ledger settlements",
            icon: <FaReceipt size={16} />,
            link: "/dashboard/purchase/reports/payments",
            color: "emerald",
        },
    ];

    // Standard General & Sales Reports Cards
    const generalReports = [
        {
            title: "Party vs MR Target Report",
            desc: "Sales vs Collection targets (Monthly, Weekly, Day-Wise)",
            icon: <FaBullseye size={16} />,
            link: "/dashboard/reports/target-vs-actual",
            color: "rose",
        },
        {
            title: "Sales Return Report",
            desc: "Credit note & return analysis by Area, Route, Salesman & Party",
            icon: <FaUndoAlt size={16} />,
            link: "/dashboard/reports/sales-return",
            color: "rose",
        },
        {
            title: "Purchase Return Report (Legacy)",
            desc: "Debit note & return analysis by Area, Route, Salesman & Party",
            icon: <FaUndoAlt size={16} />,
            link: "/dashboard/reports/purchase-return",
            color: "rose",
        },
        {
            title: "Sales Receipt (Collection) Report",
            desc: "Payment collections & discount report with executive filters",
            icon: <FaHandHoldingUsd size={16} />,
            link: "/dashboard/reports/sales-receipt",
            color: "emerald",
        },
        {
            title: "Customer Report",
            desc: "Customer-wise sales & ledger summary",
            icon: <FaUsers size={16} />,
            link: "/dashboard/reports/customer",
            color: "indigo",
        },
        {
            title: "Batch Report",
            desc: "Batch-wise stock movement",
            icon: <FaShoppingCart size={16} />,
            link: "/dashboard/reports/batch",
            color: "cyan",
        },
        {
            title: "Product Report",
            desc: "Product-wise sales & stock",
            icon: <FaBoxOpen size={16} />,
            link: "/dashboard/reports/product",
            color: "emerald",
        },
        {
            title: "Outstanding Report",
            desc: "Pending payments & dues",
            icon: <FaFileInvoiceDollar size={16} />,
            link: "/dashboard/reports/outstanding",
            color: "amber",
        },
        {
            title: "GST Report",
            desc: "Tax summary for filing",
            icon: <FaReceipt size={16} />,
            link: "/dashboard/reports/gst",
            color: "violet",
        },
    ];

    // Explicit Tailwind Color Mapping
    const colorMap: Record<
        string,
        { iconText: string; glowFrom: string; ring: string }
    > = {
        purple: { iconText: "text-purple-600", glowFrom: "from-purple-400/40", ring: "ring-purple-300/40" },
        amber: { iconText: "text-amber-600", glowFrom: "from-amber-400/40", ring: "ring-amber-300/40" },
        indigo: { iconText: "text-indigo-600", glowFrom: "from-indigo-400/40", ring: "ring-indigo-300/40" },
        orange: { iconText: "text-orange-600", glowFrom: "from-orange-400/40", ring: "ring-orange-300/40" },
        emerald: { iconText: "text-emerald-600", glowFrom: "from-emerald-400/40", ring: "ring-emerald-300/40" },
        rose: { iconText: "text-rose-600", glowFrom: "from-rose-400/40", ring: "ring-rose-300/40" },
        cyan: { iconText: "text-cyan-600", glowFrom: "from-cyan-400/40", ring: "ring-cyan-300/40" },
        violet: { iconText: "text-violet-600", glowFrom: "from-violet-400/40", ring: "ring-violet-300/40" },
    };

    return (
        <div className="space-y-8">
            {/* 1. PURCHASE EXECUTIVE REPORTS SECTION */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 tracking-wide flex items-center gap-2">
                            <FaChartBar className="text-purple-600" /> Purchase Executive & Module Reports
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Dedicated reporting modules for Purchase Invoices, Orders, Returns, Payments & Supplier Analytics
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {purchaseReports.map((report, index) => {
                        const c = colorMap[report.color] ?? colorMap.indigo;
                        return (
                            <Link
                                key={index}
                                href={report.link}
                                style={{ animationDelay: `${index * 40}ms` }}
                                className={`
                                    group relative isolate overflow-hidden rounded-2xl block
                                    bg-white/70 dark:bg-slate-800/80 backdrop-blur-xl backdrop-saturate-150
                                    border border-white/60 dark:border-slate-700
                                    shadow-[0_8px_32px_rgba(31,38,135,0.12)]
                                    ring-1 ${c.ring}
                                    animate-[fadeSlideIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]
                                    transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                    hover:-translate-y-1.5 hover:scale-[1.02]
                                    hover:shadow-[0_16px_40px_rgba(31,38,135,0.18)]
                                    active:scale-[0.98] active:duration-150
                                    cursor-pointer p-4
                                `}
                            >
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent" />
                                <div
                                    className={`
                                        pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full
                                        bg-gradient-to-br ${c.glowFrom} to-transparent blur-2xl
                                        opacity-60 scale-90
                                        transition-all duration-700 ease-out
                                        group-hover:opacity-100 group-hover:scale-125
                                    `}
                                />
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

                                <div className="relative flex flex-col items-center text-center gap-2">
                                    <div
                                        className={`
                                            flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                                            bg-white/80 dark:bg-slate-900 ${c.iconText}
                                            border border-white/70 dark:border-slate-700
                                            shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                                            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                            group-hover:scale-110 group-hover:rotate-6
                                        `}
                                    >
                                        {report.icon}
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="text-xs font-bold text-gray-900 dark:text-white transition-transform duration-500">
                                            {report.title}
                                        </h3>
                                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-tight">
                                            {report.desc}
                                        </p>

                                        <div
                                            className={`
                                                inline-flex items-center gap-1 mt-3 text-[11px] font-bold ${c.iconText}
                                                transition-all duration-300
                                                group-hover:gap-1.5
                                            `}
                                        >
                                            View Report
                                            <FaArrowRight
                                                size={8}
                                                className="transition-transform duration-300 group-hover:translate-x-0.5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* 2. GENERAL & SALES REPORTS SECTION */}
            <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 tracking-wide">
                    Sales & General System Reports
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {generalReports.map((report, index) => {
                        const c = colorMap[report.color] ?? colorMap.indigo;
                        return (
                            <Link
                                key={index}
                                href={report.link}
                                style={{ animationDelay: `${index * 40}ms` }}
                                className={`
                                    group relative isolate overflow-hidden rounded-2xl block
                                    bg-white/40 dark:bg-slate-800/60 backdrop-blur-xl backdrop-saturate-150
                                    border border-white/60 dark:border-slate-700
                                    shadow-[0_8px_32px_rgba(31,38,135,0.12)]
                                    ring-1 ${c.ring}
                                    animate-[fadeSlideIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]
                                    transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                    hover:-translate-y-1.5 hover:scale-[1.02]
                                    hover:shadow-[0_16px_40px_rgba(31,38,135,0.18)]
                                    active:scale-[0.98] active:duration-150
                                    cursor-pointer p-3
                                `}
                            >
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent" />
                                <div
                                    className={`
                                        pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full
                                        bg-gradient-to-br ${c.glowFrom} to-transparent blur-2xl
                                        opacity-60 scale-90
                                        transition-all duration-700 ease-out
                                        group-hover:opacity-100 group-hover:scale-125
                                    `}
                                />
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

                                <div className="relative flex flex-col items-center text-center gap-2">
                                    <div
                                        className={`
                                            flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
                                            bg-white/60 dark:bg-slate-900 ${c.iconText}
                                            border border-white/70 dark:border-slate-700
                                            shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                                            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                            group-hover:scale-110 group-hover:rotate-6
                                        `}
                                    >
                                        {report.icon}
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="text-xs font-semibold text-gray-800 dark:text-slate-200 transition-transform duration-500">
                                            {report.title}
                                        </h3>
                                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                            {report.desc}
                                        </p>

                                        <div
                                            className={`
                                                inline-flex items-center gap-1 mt-2 text-[11px] font-medium ${c.iconText}
                                                transition-all duration-300
                                                group-hover:gap-1.5
                                            `}
                                        >
                                            View Report
                                            <FaArrowRight
                                                size={8}
                                                className="transition-transform duration-300 group-hover:translate-x-0.5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

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