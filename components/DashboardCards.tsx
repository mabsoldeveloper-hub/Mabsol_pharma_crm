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



    const cards = [
      {
        title: "Employees",
        value: summary?.employees ?? 0,
        icon: <FaUsers size={28} />,
        color: "primary",
      },
    
      {
        title: "Customers",
        value: summary?.customers ?? 0,
        icon: <FaUserTie size={28} />,
        color: "success",
      },
    
      {
        title: "Products",
        value: summary?.products ?? 0,
        icon: <FaChartLine size={28} />,
        color: "info",
      },
    
      {
        title: "Companies",
        value: summary?.companies ?? 0,
        icon: <FaUsers size={28} />,
        color: "secondary",
      },
    
      {
        title: "Outstanding",
        value:
          "₹" +
          Number(summary?.outstanding || 0).toLocaleString(),
        icon: <FaRupeeSign size={28} />,
        color: "danger",
      },
    
      {
        title: "Credit",
        value:
          "₹" +
          Number(summary?.credit || 0).toLocaleString(),
        icon: <FaRupeeSign size={28} />,
        color: "warning",
      },
    
      {
        title: "Debit",
        value:
          "₹" +
        Number(summary?.debit || 0).toLocaleString(),
        icon: <FaRupeeSign size={28} />,
        color: "dark",
      },
    
      {
        title: "Active Customers",
        value: summary?.activeCustomers ?? 0,
        icon: <FaUserTie size={28} />,
        color: "success",
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
            
            >
              <div
                className="text-sm"
                
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