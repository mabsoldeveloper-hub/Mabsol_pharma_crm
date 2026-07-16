"use client";

import { FaWarehouse, FaTag, FaShoppingCart, FaMoneyBillWave } from "react-icons/fa";

export default function ProductSummaryCards({ product }: any) {
  const money = (value: any) =>
    Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const cards = [
    {
      title: "Stock",
      value: product.BALANCE ?? 0,
      icon: <FaWarehouse size={16} />,
      ring: "from-cyan-400/40 to-sky-500/40",
      iconBg: "bg-cyan-500/15 text-cyan-600",
      glow: "group-hover:shadow-cyan-400/30",
    },
    {
      title: "MRP",
      value: `₹ ${money(product.MRP)}`,
      icon: <FaTag size={16} />,
      ring: "from-emerald-400/40 to-green-500/40",
      iconBg: "bg-emerald-500/15 text-emerald-600",
      glow: "group-hover:shadow-emerald-400/30",
    },
    {
      title: "Purchase Rate",
      value: `₹ ${money(product.PRATE)}`,
      icon: <FaShoppingCart size={16} />,
      ring: "from-amber-400/40 to-orange-500/40",
      iconBg: "bg-amber-500/15 text-amber-700",
      glow: "group-hover:shadow-amber-400/30",
    },
    {
      title: "Sale Rate",
      value: `₹ ${money(product.RATEF)}`,
      icon: <FaMoneyBillWave size={16} />,
      ring: "from-indigo-400/40 to-blue-500/40",
      iconBg: "bg-indigo-500/15 text-indigo-600",
      glow: "group-hover:shadow-indigo-400/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 mb-3">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`
            group relative rounded-2xl p-[1px]
            bg-gradient-to-br ${card.ring}
            transition-all duration-500 ease-out
            hover:-translate-y-1.5 hover:scale-[1.02]
          `}
        >
          <div
            className={`
              relative h-full rounded-2xl overflow-hidden
              bg-white/60 backdrop-blur-xl
              border border-white/40
              shadow-[0_4px_20px_rgba(0,0,0,0.06)]
              transition-all duration-500 ease-out
              group-hover:shadow-xl ${card.glow}
              p-3
            `}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />
            <div className="pointer-events-none absolute -inset-y-10 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />

            <div className="relative flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-gray-500 tracking-wide truncate">
                  {card.title}
                </p>
                <h3 className="mt-0.5 text-lg font-semibold text-gray-800 tabular-nums truncate">
                  {card.value}
                </h3>
              </div>

              <div
                className={`
                  flex items-center justify-center h-8 w-8 rounded-lg shrink-0
                  ${card.iconBg}
                  ring-1 ring-white/50
                  transition-transform duration-500
                  group-hover:scale-110 group-hover:rotate-3
                `}
              >
                {card.icon}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}