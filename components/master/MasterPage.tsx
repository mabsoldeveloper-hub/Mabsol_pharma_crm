"use client";

import Link from "next/link";
import React from "react";
import {
    FaBoxOpen,
    FaUsers,
    FaBarcode,
    FaMapMarkedAlt,
    FaSitemap,
    FaArrowRight,
    FaLayerGroup,
} from "react-icons/fa";

const colorMap = {
    indigo: {
        iconText: "text-indigo-600",
        glowFrom: "from-indigo-400/40",
        ring: "ring-indigo-300/40",
    },
    cyan: {
        iconText: "text-cyan-600",
        glowFrom: "from-cyan-400/40",
        ring: "ring-cyan-300/40",
    },
    emerald: {
        iconText: "text-emerald-600",
        glowFrom: "from-emerald-400/40",
        ring: "ring-emerald-300/40",
    },
    amber: {
        iconText: "text-amber-600",
        glowFrom: "from-amber-400/40",
        ring: "ring-amber-300/40",
    },
    violet: {
        iconText: "text-violet-600",
        glowFrom: "from-violet-400/40",
        ring: "ring-violet-300/40",
    },
    rose: {
        iconText: "text-rose-600",
        glowFrom: "from-rose-400/40",
        ring: "ring-rose-300/40",
    },
};

type ColorKey = keyof typeof colorMap;

interface MasterItem {
    title: string;
    desc: string;
    icon: React.ReactNode;
    link: string;
    color: ColorKey;
}

export default function MasterPage() {
    const masters: MasterItem[] = [
        {
            title: "Accounting Group",
            desc: "Manage accounting groups",
            icon: <FaLayerGroup size={16} />,
            link: "/dashboard/master/accounting-group-master",
            color: "rose",
        },
        {
            title: "Product Master",
            desc: "Manage products and inventory items",
            icon: <FaBoxOpen size={16} />,
            link: "/dashboard/master/product-master",
            color: "indigo",
        },
        {
            title: "Ledger Master",
            desc: "Manage ledger/customer records",
            icon: <FaUsers size={16} />,
            link: "/dashboard/master/customer-master",
            color: "cyan",
        },
        {
            title: "HSN Master",
            desc: "Manage HSN / SAC codes",
            icon: <FaBarcode size={16} />,
            link: "/dashboard/master/hsn-master",
            color: "emerald",
        },
        {
            title: "Area Master",
            desc: "Manage area information",
            icon: <FaMapMarkedAlt size={16} />,
            link: "/dashboard/master/area-master",
            color: "amber",
        },
        {
            title: "Division Master",
            desc: "Manage divisions & regions",
            icon: <FaSitemap size={16} />,
            link: "/dashboard/master/division-master",
            color: "violet",
        },
    ];

    return (
        <div className="p-4">
            <h3 className="text-xl font-bold text-gray-800 mb-5 tracking-wide">
                Masters
            </h3>

            {/* 5 Cards in One Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {masters.map((master, index) => {
                    const c = colorMap[master.color];

                    return (
                        <Link
                            key={index}
                            href={master.link}
                            style={{ animationDelay: `${index * 40}ms` }}
                            className={`
                group relative isolate overflow-hidden rounded-2xl block
                bg-white/40 backdrop-blur-xl backdrop-saturate-150
                border border-white/60
                shadow-[0_8px_32px_rgba(31,38,135,0.12)]
                ring-1 ${c.ring}
                animate-[fadeSlideIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]
                transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                hover:-translate-y-1.5
                hover:scale-[1.02]
                hover:shadow-[0_16px_40px_rgba(31,38,135,0.18)]
                active:scale-[0.98]
                cursor-pointer
                p-4
              `}
                        >
                            {/* Background Glass */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent pointer-events-none" />

                            {/* Glow Effect */}
                            <div
                                className={`
                  absolute -top-6 -right-6 w-20 h-20 rounded-full
                  bg-gradient-to-br ${c.glowFrom} to-transparent
                  blur-2xl opacity-60 scale-90
                  transition-all duration-700 ease-out
                  group-hover:opacity-100
                  group-hover:scale-125
                  pointer-events-none
                `}
                            />

                            {/* Shine Line */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

                            <div className="relative flex flex-col items-center text-center gap-3">
                                <div
                                    className={`
                    w-10 h-10 rounded-xl
                    flex items-center justify-center
                    bg-white/60 backdrop-blur-md
                    border border-white/70
                    shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                    ${c.iconText}
                    transition-all duration-500
                    group-hover:scale-110
                    group-hover:rotate-6
                  `}
                                >
                                    {master.icon}
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-gray-800">
                                        {master.title}
                                    </h3>

                                    <p className="text-xs text-gray-500 mt-1">
                                        {master.desc}
                                    </p>

                                    <div
                                        className={`inline-flex items-center gap-1 mt-3 text-xs font-medium ${c.iconText}`}
                                    >
                                        Open Master
                                        <FaArrowRight size={8} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
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

