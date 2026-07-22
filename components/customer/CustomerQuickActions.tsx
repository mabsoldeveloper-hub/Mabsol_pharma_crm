"use client";

import Link from "next/link";
import { FaEdit, FaBook, FaFileInvoice, FaPlusCircle, FaPrint } from "react-icons/fa";

interface Props {
    customer: any;
}

export default function CustomerQuickActions({ customer }: Props) {
    const actions = [
        {
            label: "Edit",
            href: `/dashboard/customers/edit/${customer._id}`,
            icon: <FaEdit size={12} />,
            style: "bg-amber-100/80 text-amber-700 hover:bg-amber-200/80 ring-amber-300/50",
        },
        {
            label: "Ledger",
            href: `/dashboard/customers/ledger/${customer._id}`,
            icon: <FaBook size={12} />,
            style: "bg-emerald-100/80 text-emerald-700 hover:bg-emerald-200/80 ring-emerald-300/50",
        },
        {
            label: "Statement",
            href: `/dashboard/customers/statement/${customer._id}`,
            icon: <FaFileInvoice size={12} />,
            style: "bg-sky-100/80 text-sky-700 hover:bg-sky-200/80 ring-sky-300/50",
        },
        {
            label: "New Order",
            href: `/dashboard/orders/create?customer=${customer._id}`,
            icon: <FaPlusCircle size={12} />,
            style: "bg-[#343872] text-white hover:bg-[#2a2d5c] ring-transparent",
        },
    ];

    return (
        <div className="relative isolate overflow-hidden rounded-xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_rgba(52,56,114,0.08)] h-full">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />

            <div className="relative p-3.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Actions</p>

                <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                    {actions.map((a) => (
                        <Link
                            key={a.label}
                            href={a.href}
                            className={`inline-flex items-center justify-center lg:justify-start gap-2 rounded-lg text-xs font-medium px-3 py-2 ring-1 transition-colors ${a.style}`}
                        >
                            {a.icon} {a.label}
                        </Link>
                    ))}

                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center justify-center lg:justify-start gap-2 rounded-lg bg-slate-100/80 text-slate-600 ring-1 ring-slate-300/50 text-xs font-medium px-3 py-2 hover:bg-slate-200/80 transition-colors"
                    >
                        <FaPrint size={12} /> Print
                    </button>
                </div>
            </div>
        </div>
    );
}