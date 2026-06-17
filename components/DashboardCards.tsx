"use client";

import {
  FaUsers,
  FaUserTie,
  FaRupeeSign,
  FaChartLine
} from "react-icons/fa";

export default function DashboardCards() {

  const cards = [
    {
      title: "Total Users",
      value: "125",
      icon: <FaUsers size={28} />,
      color: "primary",
    },
    {
      title: "Customers",
      value: "540",
      icon: <FaUserTie size={28} />,
      color: "success",
    },
    {
      title: "Revenue",
      value: "₹18.5L",
      icon: <FaRupeeSign size={28} />,
      color: "warning",
    },
    {
      title: "Leads",
      value: "214",
      icon: <FaChartLine size={28} />,
      color: "danger",
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