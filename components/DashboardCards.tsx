"use client";

import {
  FaUsers,
  FaUserTie,
  FaRupeeSign,
  FaChartLine,
} from "react-icons/fa";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

const INK = "#343872";
const INK_TINT = "#EEEEF6";
const AMBER = "#FB8C00";
const AMBER_TINT = "#FFF3E0";

export default function DashboardCards() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const res = await fetch("/api/dashboard");
    const data = await res.json();
    setSummary(data);
  };

  const formatAmount = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }

    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }

    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const cards = [
    {
      title: "Employees",
      value: summary?.employees ?? 0,
      icon: <FaUsers />,
      accent: false,
    },
    {
      title: "Customers",
      value: summary?.customers ?? 0,
      icon: <FaUserTie />,
      accent: true,
    },
    {
      title: "Products",
      value: summary?.products ?? 0,
      icon: <FaChartLine />,
      accent: false,
    },
    {
      title: "Companies",
      value: summary?.companies ?? 0,
      icon: <FaUsers />,
      accent: false,
    },
    {
      title: "Outstanding",
      value: formatAmount(summary?.outstanding || 0),
      icon: <FaRupeeSign />,
      accent: true,
    },
    {
      title: "Credit",
      value: formatAmount(summary?.credit || 0),
      icon: <FaRupeeSign />,
      accent: false,
    },
    {
      title: "Debit",
      value: formatAmount(summary?.debit || 0),
      icon: <FaRupeeSign />,
      accent: true,
    },
    {
      title: "Active Customers",
      value: summary?.activeCustomers ?? 0,
      icon: <FaUserTie />,
      accent: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: card.accent
                  ? AMBER_TINT
                  : INK_TINT,
              }}
            >
              <div
                className="text-sm"
                style={{
                  color: card.accent ? AMBER : INK,
                }}
              >
                {card.icon}
              </div>
            </div>

            <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700">
              <ArrowUpRight size={10} />
              12%
            </span>
          </div>

          <p className="text-xs text-slate-500 truncate">
            {card.title}
          </p>

          <h3 className="text-sm lg:text-base font-semibold text-slate-900 mt-1 whitespace-nowrap">
            {card.value}
          </h3>
        </div>
      ))}
    </div>
  );
}