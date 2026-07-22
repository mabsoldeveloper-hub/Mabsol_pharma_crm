"use client";

import {
    FaRupeeSign,
    FaChartLine,
    FaUsers,
    FaBoxes,
    FaExclamationTriangle,
    FaCalendarDay,
    FaCalendarAlt,
    FaWallet,
    // ---- NEW: icons for the 5 new cards ----
    FaBuilding,
    FaArrowUp,
    FaArrowDown,
    FaUserCheck,
} from "react-icons/fa";
import { useRouter } from "next/navigation";

function formatCurrency(n: number) {
    return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function KPICards({ kpis }: { kpis: any }) {
    const router = useRouter();

    // Har card ka apna alag color — koi bhi 2 cards ka color repeat nahi hota
    const cards = [
        {
            title: "Total Sales",
            value: kpis?.totalSales ?? 0,
            icon: <FaChartLine size={20} />,
            url: "/dashboard/sales/dashboard",
            color: "indigo",
        },
        {
            title: "Today's Sales",
            value: formatCurrency(kpis?.todaySales),
            icon: <FaCalendarDay size={20} />,
            color: "blue",
        },
        {
            title: "Monthly Sales",
            value: formatCurrency(kpis?.monthlySales),
            icon: <FaCalendarAlt size={20} />,
            color: "cyan",
        },
        {
            title: "Yearly Sales",
            value: formatCurrency(kpis?.yearlySales),
            icon: <FaCalendarAlt size={20} />,
            color: "teal",
        },
        {
            title: "Outstanding",
            value: formatCurrency(kpis?.totalOutstanding),
            icon: <FaWallet size={20} />,
            color: "amber",
        },
        {
            title: "Overdue Amount",
            value: formatCurrency(kpis?.overdueAmount),
            icon: <FaExclamationTriangle size={20} />,
            color: "rose",
        },
        {
            title: "Total Collections",
            value: formatCurrency(kpis?.totalCollections),
            icon: <FaRupeeSign size={20} />,
            color: "emerald",
        },
        {
            title: "Total Customers",
            value: kpis?.totalCustomers ?? 0,
            icon: <FaUsers size={20} />,
            url: "/dashboard/customers",
            color: "violet",
        },
        {
            title: "Total Products",
            value: kpis?.totalProducts ?? 0,
            icon: <FaBoxes size={20} />,
            url: "/dashboard/inventory/products",
            color: "sky",
        },
        {
            title: "Current Stock",
            value: (kpis?.currentStock ?? 0).toLocaleString("en-IN"),
            icon: <FaBoxes size={20} />,
            color: "green",
        },
        {
            title: "Near Expiry Batches",
            value: kpis?.nearExpiryBatches ?? 0,
            icon: <FaExclamationTriangle size={20} />,
            color: "orange",
        },
        {
            title: "Expired Batches",
            value: kpis?.expiredBatches ?? 0,
            icon: <FaExclamationTriangle size={20} />,
            color: "red",
        },

        // ---- NEW: 5 new dashboard cards ----
        {
            title: "Total Users",
            value: kpis?.totalUsers ?? 0,
            icon: <FaUsers size={20} />,
            url: "/dashboard/users",
            color: "purple",
        },
        {
            title: "Total Companies",
            value: kpis?.totalCompanies ?? 0,
            icon: <FaBuilding size={20} />,
            url: "/dashboard/company/list",
            color: "pink",
        },
        {
            title: "Total Credit",
            value: formatCurrency(kpis?.totalCredit),
            icon: <FaArrowUp size={20} />,
            color: "lime",
        },
        {
            title: "Total Debit",
            value: formatCurrency(kpis?.totalDebit),
            icon: <FaArrowDown size={20} />,
            color: "fuchsia",
        },
        {
            title: "Active Customers",
            value: kpis?.activeCustomers ?? 0,
            icon: <FaUserCheck size={20} />,
            url: "/dashboard/customers",
            color: "yellow",
        },
    ];

    // Tailwind ka JIT purely dynamic class string resolve nahi karta,
    // isliye har color ka mapping explicitly likha hai — safe way for production build.
    const colorMap: Record<
        string,
        { iconText: string; glowFrom: string; ring: string }
    > = {
        indigo: { iconText: "text-indigo-600", glowFrom: "from-indigo-400/40", ring: "ring-indigo-300/40" },
        blue: { iconText: "text-blue-600", glowFrom: "from-blue-400/40", ring: "ring-blue-300/40" },
        cyan: { iconText: "text-cyan-600", glowFrom: "from-cyan-400/40", ring: "ring-cyan-300/40" },
        teal: { iconText: "text-teal-600", glowFrom: "from-teal-400/40", ring: "ring-teal-300/40" },
        amber: { iconText: "text-amber-600", glowFrom: "from-amber-400/40", ring: "ring-amber-300/40" },
        rose: { iconText: "text-rose-600", glowFrom: "from-rose-400/40", ring: "ring-rose-300/40" },
        emerald: { iconText: "text-emerald-600", glowFrom: "from-emerald-400/40", ring: "ring-emerald-300/40" },
        violet: { iconText: "text-violet-600", glowFrom: "from-violet-400/40", ring: "ring-violet-300/40" },
        sky: { iconText: "text-sky-600", glowFrom: "from-sky-400/40", ring: "ring-sky-300/40" },
        green: { iconText: "text-green-600", glowFrom: "from-green-400/40", ring: "ring-green-300/40" },
        orange: { iconText: "text-orange-600", glowFrom: "from-orange-400/40", ring: "ring-orange-300/40" },
        red: { iconText: "text-red-600", glowFrom: "from-red-400/40", ring: "ring-red-300/40" },
        purple: { iconText: "text-purple-600", glowFrom: "from-purple-400/40", ring: "ring-purple-300/40" },
        pink: { iconText: "text-pink-600", glowFrom: "from-pink-400/40", ring: "ring-pink-300/40" },
        lime: { iconText: "text-lime-600", glowFrom: "from-lime-400/40", ring: "ring-lime-300/40" },
        fuchsia: { iconText: "text-fuchsia-600", glowFrom: "from-fuchsia-400/40", ring: "ring-fuchsia-300/40" },
        yellow: { iconText: "text-yellow-600", glowFrom: "from-yellow-400/40", ring: "ring-yellow-300/40" },
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cards.map((card, index) => {
                const c = colorMap[card.color] ?? colorMap.indigo;
                return (
                    <div
                        key={index}
                        onClick={() => card.url && router.push(card.url)}
                        style={{ animationDelay: `${index * 40}ms` }}
                        className={`
                            group relative isolate overflow-hidden rounded-2xl
                            bg-white/40 backdrop-blur-xl backdrop-saturate-150
                            border border-white/60
                            shadow-[0_8px_32px_rgba(31,38,135,0.12)]
                            ring-1 ${c.ring}
                            animate-[fadeSlideIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]
                            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                            hover:-translate-y-1.5 hover:scale-[1.02]
                            hover:shadow-[0_16px_40px_rgba(31,38,135,0.18)]
                            active:scale-[0.98] active:duration-150
                            ${card.url ? "cursor-pointer" : "cursor-default"}
                            p-4 sm:p-5
                        `}
                    >
                        {/* liquid glass top-sheen */}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent" />

                        {/* soft colored glow blob, apple-style, expands on hover */}
                        <div
                            className={`
                                pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full
                                bg-gradient-to-br ${c.glowFrom} to-transparent blur-2xl
                                opacity-60 scale-90
                                transition-all duration-700 ease-out
                                group-hover:opacity-100 group-hover:scale-125
                            `}
                        />

                        {/* faint inner top border for the "glass edge" highlight */}
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

                        <div className="relative flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-600/90 truncate mb-1 tracking-wide">
                                    {card.title}
                                </p>
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 truncate transition-transform duration-500 group-hover:translate-x-0.5">
                                    {card.value}
                                </h3>
                            </div>

                            <div
                                className={`
                                    flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
                                    bg-white/60 backdrop-blur-md ${c.iconText}
                                    border border-white/70
                                    shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                                    transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                    group-hover:scale-110 group-hover:rotate-6
                                    group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]
                                `}
                            >
                                {card.icon}
                            </div>
                        </div>
                    </div>
                );
            })}

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