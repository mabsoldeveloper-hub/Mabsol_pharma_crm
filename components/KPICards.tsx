"use client";

import {
    FaRupeeSign,
    FaChartLine,
    FaUsers,
    FaBoxes,
    FaExclamationTriangle,
    FaCalendarDay,
    FaCalendarAlt,
    FaWallet,
} from "react-icons/fa";
import { useRouter } from "next/navigation";

function formatCurrency(n: number) {
    return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}


export default function KPICards({ kpis }: { kpis: any }) {
    const router = useRouter();
    const cards = [
        {
            title: "Total Sales",
            value: kpis?.totalSales ?? 0,
            icon: <FaChartLine size={24} />,
            url: "/dashboard/sales/dashboard"
        },
        { title: "Today's Sales", value: formatCurrency(kpis?.todaySales), icon: <FaCalendarDay size={24} /> },
        { title: "Monthly Sales", value: formatCurrency(kpis?.monthlySales), icon: <FaCalendarAlt size={24} /> },
        { title: "Yearly Sales", value: formatCurrency(kpis?.yearlySales), icon: <FaCalendarAlt size={24} /> },
      



        { title: "Outstanding", value: formatCurrency(kpis?.totalOutstanding), icon: <FaWallet size={24} /> },
        { title: "Overdue Amount", value: formatCurrency(kpis?.overdueAmount), icon: <FaExclamationTriangle size={24} /> },
        { title: "Total Collections", value: formatCurrency(kpis?.totalCollections), icon: <FaRupeeSign size={24} /> },
        {
            title: "Total Customers",
            value: kpis?.totalCustomers ?? 0,
            icon: <FaUsers size={24} />,
            url: "/dashboard/customers"
        },

        {
            title: "Total Products",
            value:  kpis?.totalProducts ?? 0,
            icon: <FaBoxes size={24} />,
            url: "/dashboard/inventory/products"
        },
        { title: "Current Stock", value: (kpis?.currentStock ?? 0).toLocaleString("en-IN"), icon: <FaBoxes size={24} /> },
        { title: "Near Expiry Batches", value: kpis?.nearExpiryBatches ?? 0, icon: <FaExclamationTriangle size={24} /> },
        { title: "Expired Batches", value: kpis?.expiredBatches ?? 0, icon: <FaExclamationTriangle size={24} /> },
    ];

    return (
        <>
            <style jsx>{`
        .dashboard-card {
          background: #343872;
          border-radius: 18px;
          color: #fff;
          min-height: 120px;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .dashboard-card:hover {
          background: #fb8c00;
          transform: translateY(-6px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
        }
        .icon-box {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(8px);
        }
        .card-title {
          font-size: 13px;
          opacity: 0.9;
          margin-bottom: 8px;
        }
        .card-value {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }
      `}</style>

            <div className="row g-4">
                {cards.map((card, index) => (
                    <div className="col-xl-3 col-lg-4 col-md-6 col-12" key={index}>
                        {/* <div className="card border-0 shadow dashboard-card"> */}
                        <div className="card border-0 shadow dashboard-card" onClick={() => card.url && router.push(card.url)} >    
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div className="card-title">{card.title}</div>
                                        <h3 className="card-value">{card.value}</h3>
                                    </div>
                                    <div className="icon-box">{card.icon}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}