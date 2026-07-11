"use client";

import {FaUsers, FaUserTie, FaRupeeSign, FaChartLine} from "react-icons/fa";
import { useEffect, useState } from "react";

export default function DashboardCards() {

  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {

    loadDashboard();
    
    }, []);
    
    const loadDashboard =
    async () => {
    
    const res =
    await fetch("/api/dashboard");
    
    const data =
    await res.json();
    
    setSummary(data);
    
    };

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
    <div className="row g-3">
      {cards.map((card, index) => (
        <div className="col-xl-3 col-lg-6 col-md-6 col-12" key={index}>
          <div
            className={`card border-0 shadow-lg bg-${card.color} text-white`}
            style={{
              borderRadius: "18px",
            }}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6>{card.title}</h6>
                  <h2>{card.value}</h2>
                </div>

                {card.icon}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}