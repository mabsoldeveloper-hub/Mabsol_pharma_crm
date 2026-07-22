"use client";

import { FaWallet, FaArrowUp, FaArrowDown, FaPiggyBank } from "react-icons/fa";

interface Props {
  customer: any;
}

function formatCurrency(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function CustomerSummaryCards({ customer }: Props) {
  const cards = [
    {
      title: "Outstanding",
      value: customer.BALANCE || 0,
      icon: <FaWallet size={14} />,
      tone: "negative",
    },
    {
      title: "Credit",
      value: customer.CREDIT || 0,
      icon: <FaArrowUp size={14} />,
      tone: "positive",
    },
    {
      title: "Debit",
      value: customer.DEBIT || 0,
      icon: <FaArrowDown size={14} />,
      tone: "brand",
    },
    {
      title: "Opening",
      value: customer.OPNING || 0,
      icon: <FaPiggyBank size={14} />,
      tone: "neutral",
    },
  ] as const;

  const toneMap = {
    brand: { text: "text-[#343872]", glow: "from-[#343872]/25" },
    positive: { text: "text-emerald-700", glow: "from-emerald-400/25" },
    negative: { text: "text-rose-700", glow: "from-rose-400/25" },
    neutral: { text: "text-amber-700", glow: "from-amber-400/25" },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
      {cards.map((card) => {
        const t = toneMap[card.tone];
        return (
          <div
            key={card.title}
            className="group relative isolate overflow-hidden rounded-xl bg-white/50 backdrop-blur-xl border border-white/60 ring-1 ring-white/40 shadow-[0_4px_20px_rgba(52,56,114,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(52,56,114,0.14)] p-3.5 print:bg-white print:backdrop-blur-none print:shadow-none print:border print:border-slate-300 print:break-inside-avoid"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent print:hidden" />
            <div
              className={`pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${t.glow} to-transparent blur-xl opacity-70 transition-all duration-700 group-hover:scale-125 print:hidden`}
            />
            <div className="relative flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-slate-500 mb-0.5 uppercase tracking-wide">{card.title}</p>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 truncate">
                  {formatCurrency(card.value)}
                </h3>
              </div>
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white/70 backdrop-blur-md border border-white/70 shadow-sm ${t.text}`}
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