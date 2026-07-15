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
            url: "/dashboard/companies",
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

    // Tailwind ka JIT purely dynamic class string (`border-${color}-500`) resolve nahi karta,
    // isliye har color ka mapping explicitly likha hai — safe way for production build.
    const colorMap: Record<string, { border: string; iconBg: string; iconText: string; hoverBg: string }> = {
        indigo: { border: "border-indigo-500", iconBg: "bg-indigo-50", iconText: "text-indigo-600", hoverBg: "group-hover:bg-indigo-500" },
        blue: { border: "border-blue-500", iconBg: "bg-blue-50", iconText: "text-blue-600", hoverBg: "group-hover:bg-blue-500" },
        cyan: { border: "border-cyan-500", iconBg: "bg-cyan-50", iconText: "text-cyan-600", hoverBg: "group-hover:bg-cyan-500" },
        teal: { border: "border-teal-500", iconBg: "bg-teal-50", iconText: "text-teal-600", hoverBg: "group-hover:bg-teal-500" },
        amber: { border: "border-amber-500", iconBg: "bg-amber-50", iconText: "text-amber-600", hoverBg: "group-hover:bg-amber-500" },
        rose: { border: "border-rose-500", iconBg: "bg-rose-50", iconText: "text-rose-600", hoverBg: "group-hover:bg-rose-500" },
        emerald: { border: "border-emerald-500", iconBg: "bg-emerald-50", iconText: "text-emerald-600", hoverBg: "group-hover:bg-emerald-500" },
        violet: { border: "border-violet-500", iconBg: "bg-violet-50", iconText: "text-violet-600", hoverBg: "group-hover:bg-violet-500" },
        sky: { border: "border-sky-500", iconBg: "bg-sky-50", iconText: "text-sky-600", hoverBg: "group-hover:bg-sky-500" },
        green: { border: "border-green-500", iconBg: "bg-green-50", iconText: "text-green-600", hoverBg: "group-hover:bg-green-500" },
        orange: { border: "border-orange-500", iconBg: "bg-orange-50", iconText: "text-orange-600", hoverBg: "group-hover:bg-orange-500" },
        red: { border: "border-red-500", iconBg: "bg-red-50", iconText: "text-red-600", hoverBg: "group-hover:bg-red-500" },
        purple: { border: "border-purple-500", iconBg: "bg-purple-50", iconText: "text-purple-600", hoverBg: "group-hover:bg-purple-500" },
        pink: { border: "border-pink-500", iconBg: "bg-pink-50", iconText: "text-pink-600", hoverBg: "group-hover:bg-pink-500" },
        lime: { border: "border-lime-500", iconBg: "bg-lime-50", iconText: "text-lime-600", hoverBg: "group-hover:bg-lime-500" },
        fuchsia: { border: "border-fuchsia-500", iconBg: "bg-fuchsia-50", iconText: "text-fuchsia-600", hoverBg: "group-hover:bg-fuchsia-500" },
        yellow: { border: "border-yellow-500", iconBg: "bg-yellow-50", iconText: "text-yellow-600", hoverBg: "group-hover:bg-yellow-500" },
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cards.map((card, index) => {
                const c = colorMap[card.color] ?? colorMap.indigo;
                return (
                    <div
                        key={index}
                        onClick={() => card.url && router.push(card.url)}
                        className={`
                            group relative bg-white rounded-xl border-l-4 ${c.border}
                            shadow-sm hover:shadow-lg
                            transition-all duration-300 ease-out
                            hover:-translate-y-1
                            ${card.url ? "cursor-pointer" : "cursor-default"}
                            p-4 sm:p-5
                        `}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-500 truncate mb-1">
                                    {card.title}
                                </p>
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">
                                    {card.value}
                                </h3>
                            </div>

                            <div
                                className={`
                                    flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center
                                    ${c.iconBg} ${c.iconText}
                                    transition-all duration-300
                                    group-hover:text-white ${c.hoverBg}
                                    group-hover:scale-110 group-hover:rotate-3
                                `}
                            >
                                {card.icon}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}