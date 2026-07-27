"use client";

import { FaWallet, FaArrowUp, FaArrowDown, FaPiggyBank, FaPercent, FaScaleBalanced } from "react-icons/fa6";

interface Props {
  customer: any;
}

function formatCurrency(n: any) {
  const val = Number(n || 0);
  return "₹ " + val.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function CustomerSummaryCards({ customer }: Props) {
  const cards = [
    {
      title: "Outstanding Balance",
      value: formatCurrency(customer.BALANCE ?? customer.FINAL),
      subtitle: Number(customer.BALANCE || 0) > 0 ? "Pending Payment Dues" : "No Dues Pending",
      icon: <FaWallet size={16} />,
      ring: "from-rose-400/40 to-red-500/40",
      iconBg: "bg-rose-500/15 text-rose-600",
      glow: "group-hover:shadow-rose-500/25",
    },
    {
      title: "Credit Limit",
      value: formatCurrency(customer.CREDIT),
      subtitle: customer.DUEDAYS ? `${customer.DUEDAYS} Days Credit Term` : "Credit Terms",
      icon: <FaArrowUp size={16} />,
      ring: "from-emerald-400/40 to-green-500/40",
      iconBg: "bg-emerald-500/15 text-emerald-600",
      glow: "group-hover:shadow-emerald-500/25",
    },
    {
      title: "Debit Balance",
      value: formatCurrency(customer.DEBIT),
      subtitle: "Total Debited Amount",
      icon: <FaArrowDown size={16} />,
      ring: "from-indigo-400/40 to-blue-500/40",
      iconBg: "bg-indigo-500/15 text-indigo-600",
      glow: "group-hover:shadow-indigo-500/25",
    },
    {
      title: "Opening Balance",
      value: formatCurrency(customer.OPNING ?? customer.OPENING),
      subtitle: "Initial Account Balance",
      icon: <FaPiggyBank size={16} />,
      ring: "from-amber-400/40 to-orange-500/40",
      iconBg: "bg-amber-500/15 text-amber-600",
      glow: "group-hover:shadow-amber-500/25",
    },
    {
      title: "Closing Balance",
      value: formatCurrency(customer.CLBAL ?? (Number(customer.OPNING || 0) + Number(customer.DEBIT || 0) - Number(customer.CREDIT || 0))),
      subtitle: "Current Book Balance",
      icon: <FaScaleBalanced size={16} />,
      ring: "from-purple-400/40 to-indigo-500/40",
      iconBg: "bg-purple-500/15 text-purple-600",
      glow: "group-hover:shadow-purple-500/25",
    },
    {
      title: "Party Discount",
      value: `${customer.DISCOUNT ?? customer.SALDIS ?? 0}%`,
      subtitle: "Default Sale Discount",
      icon: <FaPercent size={16} />,
      ring: "from-teal-400/40 to-emerald-500/40",
      iconBg: "bg-teal-500/15 text-teal-600",
      glow: "group-hover:shadow-teal-500/25",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 mb-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`
            group relative rounded-2xl p-[1px]
            bg-gradient-to-br ${card.ring}
            transition-all duration-300 ease-out
            hover:-translate-y-1 hover:scale-[1.02]
          `}
        >
          <div
            className={`
              relative h-full rounded-2xl overflow-hidden
              bg-white/60 backdrop-blur-xl backdrop-saturate-150
              border border-white/50
              shadow-[0_4px_20px_rgba(52,56,114,0.06)]
              transition-all duration-300 ease-out
              group-hover:shadow-xl ${card.glow}
              p-3.5
            `}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent" />
            <div className="pointer-events-none absolute -inset-y-10 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />

            <div className="relative flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                  {card.title}
                </p>
                <h3 className="mt-1 text-base sm:text-lg font-extrabold text-slate-800 tabular-nums truncate">
                  {card.value}
                </h3>
                <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">
                  {card.subtitle}
                </p>
              </div>

              <div
                className={`
                  flex items-center justify-center h-8 w-8 rounded-xl shrink-0
                  ${card.iconBg}
                  ring-1 ring-white/60
                  transition-transform duration-300
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