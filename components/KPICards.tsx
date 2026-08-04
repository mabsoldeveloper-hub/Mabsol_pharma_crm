"use client";

import { useState } from "react";
import {
    FaRupeeSign,
    FaChartLine,
    FaUsers,
    FaBoxes,
    FaExclamationTriangle,
    FaCalendarDay,
    FaCalendarAlt,
    FaWallet,
    FaBuilding,
    FaArrowUp,
    FaArrowDown,
    FaUserCheck,
    FaFileInvoice,
    FaTruck,
    FaUndoAlt,
    FaReceipt,
    FaFileInvoiceDollar,
} from "react-icons/fa";

import CurrentStockModal from "@/components/CurrentStockModal";
import NearExpiryModal from "@/components/NearExpiryModal";
import ExpiredBatchesModal from "@/components/ExpiredBatchesModal";
import LedgerDetailsModal from "@/components/LedgerDetailsModal";
import TotalSalesModal from "@/components/TotalSalesModal";
import UniversalKPIDetailsModal from "@/components/UniversalKPIDetailsModal";

function formatCurrency(n: number) {
    return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function KPICards({ kpis }: { kpis: any }) {
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isNearExpiryModalOpen, setIsNearExpiryModalOpen] = useState(false);
    const [isExpiredBatchesModalOpen, setIsExpiredBatchesModalOpen] = useState(false);
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
    const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
    const [ledgerInitialType, setLedgerInitialType] = useState<"credit" | "debit">("credit");

    // Universal Modal State for cards that open popup instead of raw redirect
    const [universalModal, setUniversalModal] = useState<{
        isOpen: boolean;
        title: string;
        value: string | number;
        type: string;
        url?: string;
    }>({
        isOpen: false,
        title: "",
        value: "",
        type: "generic",
    });

    // Section Category Filter State ("ALL" | "SALES" | "PURCHASE" | "MASTERS")
    const [activeSection, setActiveSection] = useState<"ALL" | "SALES" | "PURCHASE" | "MASTERS">("ALL");

    // Cards List
    const cards = [
        // ==================== SALES DATA VALUE CARDS ====================
        {
            title: "Total Sales",
            value: formatCurrency(kpis?.totalSales),
            icon: <FaChartLine size={18} />,
            color: "indigo",
            isSalesModal: true,
            category: "SALES",
        },
        {
            title: "Today's Sales",
            value: formatCurrency(kpis?.todaySales),
            icon: <FaCalendarDay size={18} />,
            url: "/dashboard/sales/invoice",
            color: "blue",
            category: "SALES",
            type: "today_sales",
        },
        {
            title: "Monthly Sales",
            value: formatCurrency(kpis?.monthlySales),
            icon: <FaCalendarAlt size={18} />,
            url: "/dashboard/sales/dashboard",
            color: "cyan",
            category: "SALES",
            type: "monthly_sales",
        },
        {
            title: "Yearly Sales",
            value: formatCurrency(kpis?.yearlySales),
            icon: <FaCalendarAlt size={18} />,
            color: "teal",
            isSalesModal: true,
            category: "SALES",
        },
        {
            title: "Total Outstanding",
            value: formatCurrency(kpis?.totalOutstanding),
            icon: <FaWallet size={18} />,
            url: "/dashboard/sales/invoice",
            color: "amber",
            category: "SALES",
            isLedgerModal: true,
            ledgerType: "debit",
        },
        {
            title: "Current Year Sales Outstanding",
            value: formatCurrency(kpis?.salesOutstanding),
            icon: <FaWallet size={18} />,
            url: "/dashboard/sales/outstanding",
            color: "cyan",
            category: "SALES",
            isLedgerModal: true,
            ledgerType: "debit",
        },
        {
            title: "Overdue Amount",
            value: formatCurrency(kpis?.overdueAmount),
            icon: <FaExclamationTriangle size={18} />,
            url: "/dashboard/sales/invoice",
            color: "rose",
            category: "SALES",
            isLedgerModal: true,
            ledgerType: "debit",
        },
        {
            title: "Total Collections",
            value: formatCurrency(kpis?.totalCollections),
            icon: <FaRupeeSign size={18} />,
            url: "/dashboard/sales/dashboard",
            color: "emerald",
            category: "SALES",
            isLedgerModal: true,
            ledgerType: "credit",
        },
        {
            title: "Sales Returns (Credit Notes)",
            value: formatCurrency(kpis?.salesReturns),
            icon: <FaUndoAlt size={18} />,
            url: "/dashboard/reports/sales-return",
            color: "rose",
            category: "SALES",
            type: "sales_returns",
        },

        // ==================== PURCHASE DATA VALUE CARDS ====================
        {
            title: "Total Inward Purchases",
            value: formatCurrency(kpis?.totalPurchases || kpis?.purchaseOutstanding),
            icon: <FaFileInvoice size={18} />,
            url: "/dashboard/purchase/invoice",
            color: "amber",
            category: "PURCHASE",
            type: "purchases",
        },
        {
            title: "Current Year Purchase Outstanding",
            value: formatCurrency(kpis?.purchaseOutstanding),
            icon: <FaFileInvoiceDollar size={18} />,
            url: "/dashboard/purchase/outstanding",
            color: "orange",
            category: "PURCHASE",
            isLedgerModal: true,
            ledgerType: "debit",
        },
        {
            title: "Purchase Orders Requisitions",
            value: (kpis?.totalPurchaseOrders ?? 0) + " POs",
            icon: <FaTruck size={18} />,
            url: "/dashboard/purchase/orders",
            color: "indigo",
            category: "PURCHASE",
            type: "purchase_orders",
        },
        {
            title: "Purchase Returns (Debit Notes)",
            value: formatCurrency(kpis?.purchaseReturns),
            icon: <FaUndoAlt size={18} />,
            url: "/dashboard/purchase/purchase-return",
            color: "orange",
            category: "PURCHASE",
            type: "purchase_returns",
        },
        {
            title: "Supplier Payments Made",
            value: formatCurrency(kpis?.totalSupplierPayments || kpis?.totalDebit),
            icon: <FaReceipt size={18} />,
            url: "/dashboard/purchase/payment",
            color: "emerald",
            category: "PURCHASE",
            type: "payments",
        },

        // ==================== MASTERS & INVENTORY COUNT CARDS ====================
        {
            title: "Total Customers",
            value: kpis?.totalCustomers ?? 0,
            icon: <FaUsers size={18} />,
            url: "/dashboard/customers",
            color: "violet",
            category: "MASTERS",
            type: "customers",
        },
        {
            title: "Total Products",
            value: kpis?.totalProducts ?? 0,
            icon: <FaBoxes size={18} />,
            url: "/dashboard/inventory/products",
            color: "sky",
            category: "MASTERS",
            type: "products",
        },
        {
            title: "Current Stock (Qty)",
            value: (kpis?.currentStock ?? 0).toLocaleString("en-IN"),
            icon: <FaBoxes size={18} />,
            color: "green",
            isStockModal: true,
            category: "MASTERS",
        },
        {
            title: "Near Expiry Batches",
            value: kpis?.nearExpiryBatches ?? 0,
            icon: <FaExclamationTriangle size={18} />,
            color: "orange",
            isNearExpiryModal: true,
            category: "MASTERS",
        },
        {
            title: "Expired Batches",
            value: kpis?.expiredBatches ?? 0,
            icon: <FaExclamationTriangle size={18} />,
            color: "red",
            isExpiredBatchesModal: true,
            category: "MASTERS",
        },
        {
            title: "Total Users",
            value: kpis?.totalUsers ?? 0,
            icon: <FaUsers size={18} />,
            url: "/dashboard/users",
            color: "purple",
            category: "MASTERS",
            type: "users",
        },
        {
            title: "Total Companies",
            value: kpis?.totalCompanies ?? 0,
            icon: <FaBuilding size={18} />,
            url: "/dashboard/company/list",
            color: "pink",
            category: "MASTERS",
            type: "companies",
        },
        {
            title: "Total Credit (Receipt/ Collections)",
            value: formatCurrency(kpis?.totalCredit),
            icon: <FaArrowUp size={18} />,
            color: "lime",
            isCreditModal: true,
            category: "MASTERS",
        },
        {
            title: "Total Debit (Payment)",
            value: formatCurrency(kpis?.totalDebit),
            icon: <FaArrowDown size={18} />,
            color: "fuchsia",
            isDebitModal: true,
            category: "MASTERS",
        },
        {
            title: "Active Customers",
            value: kpis?.activeCustomers ?? 0,
            icon: <FaUserCheck size={18} />,
            url: "/dashboard/customers",
            color: "yellow",
            category: "MASTERS",
            type: "customers",
        },
    ];

    // Color mapping for cards matching cute soft pastel aesthetic
    const colorMap: Record<
        string,
        { iconBg: string; iconText: string; dotColor?: string; ring: string; badgeBorder: string }
    > = {
        indigo: { iconBg: "bg-indigo-50/90 dark:bg-indigo-950/60", iconText: "text-indigo-500 dark:text-indigo-400", ring: "ring-indigo-200/40", badgeBorder: "border-indigo-100 dark:border-indigo-900/40" },
        blue: { iconBg: "bg-sky-50/90 dark:bg-sky-950/60", iconText: "text-sky-500 dark:text-sky-400", ring: "ring-sky-200/40", badgeBorder: "border-sky-100 dark:border-sky-900/40" },
        cyan: { iconBg: "bg-cyan-50/90 dark:bg-cyan-950/60", iconText: "text-cyan-600 dark:text-cyan-400", ring: "ring-cyan-200/40", badgeBorder: "border-cyan-100 dark:border-cyan-900/40" },
        teal: { iconBg: "bg-teal-50/90 dark:bg-teal-950/60", iconText: "text-teal-600 dark:text-teal-400", ring: "ring-teal-200/40", badgeBorder: "border-teal-100 dark:border-teal-900/40" },
        amber: { iconBg: "bg-amber-50/90 dark:bg-amber-950/60", iconText: "text-amber-500 dark:text-amber-400", ring: "ring-amber-200/40", dotColor: "bg-amber-400", badgeBorder: "border-amber-100 dark:border-amber-900/40" },
        rose: { iconBg: "bg-rose-50/90 dark:bg-rose-950/60", iconText: "text-rose-500 dark:text-rose-400", ring: "ring-rose-200/40", dotColor: "bg-rose-400", badgeBorder: "border-rose-100 dark:border-rose-900/40" },
        emerald: { iconBg: "bg-emerald-50/90 dark:bg-emerald-950/60", iconText: "text-emerald-500 dark:text-emerald-400", ring: "ring-emerald-200/40", dotColor: "bg-emerald-400", badgeBorder: "border-emerald-100 dark:border-emerald-900/40" },
        violet: { iconBg: "bg-violet-50/90 dark:bg-violet-950/60", iconText: "text-violet-500 dark:text-violet-400", ring: "ring-violet-200/40", badgeBorder: "border-violet-100 dark:border-violet-900/40" },
        sky: { iconBg: "bg-sky-50/90 dark:bg-sky-950/60", iconText: "text-sky-500 dark:text-sky-400", ring: "ring-sky-200/40", badgeBorder: "border-sky-100 dark:border-sky-900/40" },
        green: { iconBg: "bg-emerald-50/90 dark:bg-emerald-950/60", iconText: "text-emerald-500 dark:text-emerald-400", ring: "ring-emerald-200/40", dotColor: "bg-emerald-400", badgeBorder: "border-emerald-100 dark:border-emerald-900/40" },
        orange: { iconBg: "bg-orange-50/90 dark:bg-orange-950/60", iconText: "text-orange-500 dark:text-orange-400", ring: "ring-orange-200/40", dotColor: "bg-amber-400", badgeBorder: "border-orange-100 dark:border-orange-900/40" },
        red: { iconBg: "bg-rose-50/90 dark:bg-rose-950/60", iconText: "text-rose-500 dark:text-rose-400", ring: "ring-rose-200/40", dotColor: "bg-rose-400", badgeBorder: "border-rose-100 dark:border-rose-900/40" },
        purple: { iconBg: "bg-purple-50/90 dark:bg-purple-950/60", iconText: "text-purple-500 dark:text-purple-400", ring: "ring-purple-200/40", badgeBorder: "border-purple-100 dark:border-purple-900/40" },
        pink: { iconBg: "bg-pink-50/90 dark:bg-pink-950/60", iconText: "text-pink-500 dark:text-pink-400", ring: "ring-pink-200/40", badgeBorder: "border-pink-100 dark:border-pink-900/40" },
        lime: { iconBg: "bg-lime-50/90 dark:bg-lime-950/60", iconText: "text-lime-600 dark:text-lime-400", ring: "ring-lime-200/40", dotColor: "bg-emerald-400", badgeBorder: "border-lime-100 dark:border-lime-900/40" },
        fuchsia: { iconBg: "bg-fuchsia-50/90 dark:bg-fuchsia-950/60", iconText: "text-fuchsia-500 dark:text-fuchsia-400", ring: "ring-fuchsia-200/40", dotColor: "bg-fuchsia-400", badgeBorder: "border-fuchsia-100 dark:border-fuchsia-900/40" },
        yellow: { iconBg: "bg-amber-50/90 dark:bg-amber-950/60", iconText: "text-amber-500 dark:text-amber-400", ring: "ring-yellow-200/40", badgeBorder: "border-amber-100 dark:border-amber-900/40" },
    };

    const handleCardClick = (card: (typeof cards)[number]) => {
        if (card.isSalesModal) {
            setIsSalesModalOpen(true);
        } else if (card.isStockModal) {
            setIsStockModalOpen(true);
        } else if (card.isNearExpiryModal) {
            setIsNearExpiryModalOpen(true);
        } else if (card.isExpiredBatchesModal) {
            setIsExpiredBatchesModalOpen(true);
        } else if (card.isCreditModal || card.ledgerType === "credit") {
            setLedgerInitialType("credit");
            setIsLedgerModalOpen(true);
        } else if (card.isDebitModal || card.ledgerType === "debit") {
            setLedgerInitialType("debit");
            setIsLedgerModalOpen(true);
        } else {
            setUniversalModal({
                isOpen: true,
                title: card.title,
                value: card.value,
                type: card.type || "generic",
                url: card.url,
            });
        }
    };

    // Search Filter state inside KPICards
    const [searchQuery, setSearchQuery] = useState("");

    const filteredCards = cards.filter((card) => {
        const matchesCategory = activeSection === "ALL" || card.category === activeSection;
        const matchesSearch = searchQuery === "" || card.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="space-y-4">
            {/* Apple Liquid Glass Category Filter & Search Control */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-gradient-to-br from-white/70 via-white/45 to-white/60 dark:from-slate-900/80 dark:via-slate-900/50 dark:to-slate-900/70 p-2 rounded-[1.25rem] border border-white/80 dark:border-slate-800/80 backdrop-blur-2xl backdrop-saturate-180 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_20px_rgba(0,0,0,0.03)]">
                <div className="flex flex-wrap items-center gap-1 text-xs">
                    <span className="text-slate-400 font-normal px-2 uppercase text-[10px] tracking-wider hidden sm:inline">Category:</span>
                    {[
                        { id: "ALL", label: "All KPI Values", count: cards.length },
                        { id: "SALES", label: "Sales Data", count: cards.filter(c => c.category === "SALES").length },
                        { id: "PURCHASE", label: "Purchase Data", count: cards.filter(c => c.category === "PURCHASE").length },
                        { id: "MASTERS", label: "Inventory & Masters", count: cards.filter(c => c.category === "MASTERS").length },
                    ].map((sec) => (
                        <button
                            key={sec.id}
                            onClick={() => setActiveSection(sec.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${activeSection === sec.id
                                ? "bg-white/90 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.04)] border border-white dark:border-slate-700"
                                : "text-slate-500 dark:text-slate-400 font-normal hover:text-slate-800 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40"
                                }`}
                        >
                            <span>{sec.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-normal ${activeSection === sec.id
                                ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300"
                                : "bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400"
                                }`}>
                                {sec.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Apple Glass Search Input */}
                <div className="relative min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Search KPIs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-normal shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] transition-all"
                    />
                    <svg className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-normal"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Pure Apple Liquid Glass Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3.5">
                {filteredCards.map((card, index) => {
                    const c = colorMap[card.color] ?? colorMap.indigo;
                    return (
                        <div
                            key={index}
                            onClick={() => handleCardClick(card)}
                            style={{ animationDelay: `${(index % 10) * 20}ms` }}
                            className={`
                                group relative isolate overflow-hidden rounded-[1.35rem]
                                bg-gradient-to-br from-white/75 via-white/45 to-white/60 dark:from-slate-900/80 dark:via-slate-900/50 dark:to-slate-900/70
                                backdrop-blur-2xl backdrop-saturate-180 backdrop-brightness-105
                                border border-white/70 dark:border-slate-800/80
                                shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-6px_12px_-6px_rgba(255,255,255,0.4),0_6px_20px_-4px_rgba(31,38,135,0.07)]
                                hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),inset_0_-6px_12px_-6px_rgba(255,255,255,0.5),0_14px_32px_-6px_rgba(31,38,135,0.14)]
                                hover:border-indigo-300/80 dark:hover:border-indigo-700/80
                                animate-[fadeSlideIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]
                                transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
                                hover:-translate-y-1.5 hover:scale-[1.015] active:scale-[0.98]
                                cursor-pointer p-3.5 sm:p-4 flex flex-col justify-between min-h-[92px] sm:min-h-[98px]
                            `}
                        >
                            {/* Apple Specular Highlight Top Edge Catch-Light */}
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white dark:via-slate-600 to-transparent group-hover:via-indigo-400 transition-colors" />

                            {/* Apple Corner Curved Specular Reflection Layer */}
                            <div className="pointer-events-none absolute inset-0 rounded-[1.35rem] bg-[radial-gradient(120%_100%_at_15%_0%,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0.2)_35%,transparent_65%)] dark:bg-[radial-gradient(120%_100%_at_15%_0%,rgba(255,255,255,0.15)_0%,transparent_50%)] mix-blend-overlay opacity-90 group-hover:opacity-100 transition-opacity" />

                            {/* Apple Liquid Light Sweep Reflection on Hover */}
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-indigo-500/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

                            {/* Soft colored ambient glow behind glass */}
                            <div
                                className={`
                                    pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full
                                    bg-gradient-to-br ${c.iconBg} to-transparent blur-2xl
                                    opacity-40 scale-75 transition-all duration-500 ease-out
                                    group-hover:opacity-80 group-hover:scale-125
                                `}
                            />

                            {/* TOP ROW: Small Heading Title & Glass Icon Badge */}
                            <div className="relative flex items-start justify-between gap-1.5">
                                <div className="flex items-center gap-1 min-w-0 pr-1">
                                    <h6 className="text-[6px] sm:text-[5px] font-normal text-slate-500 dark:text-slate-400 leading-tight truncate group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                                        {card.title}
                                    </h6>
                                    {c.dotColor && (
                                        <span className={`w-1.5 h-1.5 rounded-full ${c.dotColor} flex-shrink-0 animate-pulse`} />
                                    )}
                                </div>

                                <div
                                    className={`
                                        flex-shrink-0 w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-2xl flex items-center justify-center
                                        ${c.iconBg} ${c.iconText} ${c.badgeBorder}
                                        border text-xs backdrop-blur-md
                                        shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(0,0,0,0.04)]
                                        transition-transform duration-300 ease-out
                                        group-hover:scale-110 group-hover:rotate-3
                                    `}
                                >
                                    {card.icon}
                                </div>
                            </div>

                            {/* BOTTOM ROW: Proper Size Value (Normal font) */}
                            <div className="relative mt-2 sm:mt-2.5">
                                <p className="text-lg sm:text-xl font-normal text-slate-800 dark:text-slate-100 tracking-tight font-sans truncate">
                                    {card.value}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modals */}
            <CurrentStockModal
                isOpen={isStockModalOpen}
                onClose={() => setIsStockModalOpen(false)}
            />

            <NearExpiryModal
                isOpen={isNearExpiryModalOpen}
                onClose={() => setIsNearExpiryModalOpen(false)}
            />

            <ExpiredBatchesModal
                isOpen={isExpiredBatchesModalOpen}
                onClose={() => setIsExpiredBatchesModalOpen(false)}
            />

            <LedgerDetailsModal
                isOpen={isLedgerModalOpen}
                onClose={() => setIsLedgerModalOpen(false)}
                initialType={ledgerInitialType}
            />

            <TotalSalesModal
                isOpen={isSalesModalOpen}
                onClose={() => setIsSalesModalOpen(false)}
            />

            <UniversalKPIDetailsModal
                isOpen={universalModal.isOpen}
                onClose={() => setUniversalModal((prev) => ({ ...prev, isOpen: false }))}
                title={universalModal.title}
                value={universalModal.value}
                type={universalModal.type}
                url={universalModal.url}
            />

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