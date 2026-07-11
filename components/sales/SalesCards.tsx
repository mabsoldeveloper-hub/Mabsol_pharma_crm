"use client";

import {
  FaRupeeSign,
  FaFileInvoice,
  FaUsers,
  FaBoxes,
  FaShoppingCart,
  FaChartLine,
  FaCalendarDay,
  FaUserTie,
} from "react-icons/fa";

export default function SalesCards({ summary }: any) {

  const averageBill =
    summary.totalBills > 0
      ? summary.totalSales / summary.totalBills
      : 0;

  const cards = [
    {
      title: "Total Sales",
      value:
        "₹ " +
        Number(summary.totalSales || 0).toLocaleString("en-IN"),
      icon: <FaRupeeSign size={28} />,
      color: "success",
    },

    {
      title: "Total Bills",
      value: Number(summary.totalBills || 0).toLocaleString(),
      icon: <FaFileInvoice size={28} />,
      color: "primary",
    },

    {
      title: "Customers",
      value: Number(summary.customers || 0).toLocaleString(),
      icon: <FaUsers size={28} />,
      color: "info",
    },

    {
      title: "Products",
      value: Number(summary.products || 0).toLocaleString(),
      icon: <FaBoxes size={28} />,
      color: "warning",
    },

    {
      title: "Qty Sold",
      value: Number(summary.totalQty || 0).toLocaleString(),
      icon: <FaShoppingCart size={28} />,
      color: "danger",
    },

    {
      title: "Average Bill",
      value:
        "₹ " +
        averageBill.toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        }),
      icon: <FaChartLine size={28} />,
      color: "secondary",
    },

    {
      title: "Today's Sale",
      value:
        "₹ " +
        Number(summary.todaySales || 0).toLocaleString("en-IN"),
      icon: <FaCalendarDay size={28} />,
      color: "dark",
    },

    {
      title: "Active Users",
      value: Number(summary.users || 0).toLocaleString(),
      icon: <FaUserTie size={28} />,
      color: "primary",
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
            className={`card border-0 shadow bg-${card.color} text-white h-100`}
          >

            <div className="card-body">

              <div className="d-flex justify-content-between align-items-center">

                <div>

                  <h6 className="mb-1">

                    {card.title}

                  </h6>

                  <h3 className="fw-bold mb-0">

                    {card.value}

                  </h3>

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