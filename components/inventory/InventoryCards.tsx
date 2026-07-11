"use client";

import {
  FaBoxes,
  FaWarehouse,
  FaExclamationTriangle,
  FaTimesCircle,
  FaBuilding,
  FaRupeeSign,
  FaLayerGroup,
  FaCheckCircle,
} from "react-icons/fa";

export default function InventoryCards({ summary }: any) {
  const cards = [
    {
      title: "Products",
      value: summary.totalProducts,
      color: "primary",
      icon: <FaBoxes size={28} />,
    },
    {
      title: "Active",
      value: summary.activeProducts,
      color: "success",
      icon: <FaCheckCircle size={28} />,
    },
    {
      title: "Inactive",
      value: summary.inactiveProducts,
      color: "danger",
      icon: <FaTimesCircle size={28} />,
    },
    {
      title: "Companies",
      value: summary.totalCompanies,
      color: "secondary",
      icon: <FaBuilding size={28} />,
    },
    {
      title: "Available",
      value: summary.availableProducts,
      color: "info",
      icon: <FaWarehouse size={28} />,
    },
    {
      title: "Low Stock",
      value: summary.lowStock,
      color: "warning",
      icon: <FaExclamationTriangle size={28} />,
    },
    {
      title: "Out Of Stock",
      value: summary.outOfStock,
      color: "dark",
      icon: <FaLayerGroup size={28} />,
    },
    {
      title: "Stock Value",
      value:
        "₹ " +
        Number(summary.stockValue || 0).toLocaleString("en-IN"),
      color: "success",
      icon: <FaRupeeSign size={28} />,
    },
  ];

  return (
    <div className="row g-3">

      {cards.map((card, index) => (

        <div
          className="col-xl-3 col-lg-3 col-md-6"
          key={index}
        >

          <div
            className={`card bg-${card.color} text-white border-0 shadow h-100`}
          >

            <div className="card-body">

              <div className="d-flex justify-content-between">

                <div>

                  <h6>{card.title}</h6>

                  <h3 className="fw-bold">

                    {card.value}

                  </h3>

                </div>

                <div>

                  {card.icon}

                </div>

              </div>

            </div>

          </div>

        </div>

      ))}

    </div>
  );
}