"use client";

import {
    Receipt,
    CalendarDays,
    Users,
    Boxes,
    AlertTriangle,
    Clock,
    PiggyBank,
    Target,
    LucideIcon,
} from "lucide-react";

function formatCurrency(n: number) {
    return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

type AnalyticsCard = {
    title: string;
    value: string;
    icon: LucideIcon;
    color: string;
};

export default function AnalyticsCards({ analytics }: { analytics: any }) {
    const collectionEfficiency = analytics?.collectionEfficiency ?? 0;

    const cards: AnalyticsCard[] = [
        {
            title: "Average Invoice Value",
            value: formatCurrency(analytics?.avgInvoiceValue),
            icon: Receipt,
            color: "#343872",
        },
        {
            title: "Average Daily Sales",
            value: formatCurrency(analytics?.avgDailySales),
            icon: CalendarDays,
            color: "#3498db",
        },
        {
            title: "Average Customer Sale",
            value: formatCurrency(analytics?.avgCustomerSale),
            icon: Users,
            color: "#9b59b6",
        },
        {
            title: "Stock Value",
            value: formatCurrency(analytics?.stockValue),
            icon: Boxes,
            color: "#1abc9c",
        },
        {
            title: "Expired Stock Value",
            value: formatCurrency(analytics?.expiredStockValue),
            icon: AlertTriangle,
            color: "#e74c3c",
        },
        {
            title: "Near Expiry Stock Value",
            value: formatCurrency(analytics?.nearExpiryStockValue),
            icon: Clock,
            color: "#f1c40f",
        },
        {
            title: "Gross Estimated Margin",
            value: formatCurrency(analytics?.grossMargin),
            icon: PiggyBank,
            color: "#2ecc71",
        },
        {
            title: "Collection Efficiency",
            value: `${collectionEfficiency.toFixed(1)}%`,
            icon: Target,
            color: "#fb8c00",
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, i) => (
                <div
                    key={i}
                    className="group flex cursor-default flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg sm:p-5"
                    style={{ "--accent": card.color } as React.CSSProperties}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-slate-400 transition-colors duration-300 group-hover:text-slate-500">
                                {card.title}
                            </p>
                            <p className="mt-1.5 truncate text-xl font-bold text-slate-800 transition-colors duration-300 group-hover:text-[color:var(--accent)]">
                                {card.value}
                            </p>
                        </div>
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ease-out group-hover:scale-110"
                            style={{ backgroundColor: `${card.color}14` }}
                        >
                            <card.icon className="h-4.5 w-4.5" style={{ color: card.color }} strokeWidth={2} />
                        </div>
                    </div>

                    {/* accent line that grows in on hover */}
                    <div
                        className="mt-3 h-0.5 w-0 rounded-full transition-all duration-300 ease-out group-hover:w-full"
                        style={{ backgroundColor: card.color }}
                    />
                </div>
            ))}
        </div>
    );
}