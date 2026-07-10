import Link from "next/link";
import {
    FaUsers,
    FaShoppingCart,
    FaBoxOpen,
    FaFileInvoiceDollar,
} from "react-icons/fa";

export default function ReportsPage() {
    const reports = [
        {
            title: "Customer Report",
            icon: <FaUsers size={40} />,
            link: "/dashboard/reports/customer",
        },
        {
            title: "Batch Report",
            icon: <FaShoppingCart size={40} />,
            link: "/dashboard/reports/batch",
        },
        {
            title: "Product Report",
            icon: <FaBoxOpen size={40} />,
            link: "/dashboard/reports/product",
        },
        {
            title: "Outstanding Report",
            icon: <FaFileInvoiceDollar size={40} />,
            link: "/dashboard/reports/outstanding",
        },
    ];

    return (
        <div className="container-fluid py-4">
            <h3 className="mb-4">Reports</h3>

            <div className="row">
                {reports.map((report, index) => (
                    <div className="col-md-4 mb-4" key={index}>
                        <div className="card shadow-sm border-0 h-100">
                            <div className="card-body text-center">
                                <div className="mb-3 text-primary">
                                    {report.icon}
                                </div>

                                <h5 className="card-title">
                                    {report.title}
                                </h5>

                                <Link
                                    href={report.link}
                                    className="btn btn-primary mt-3"
                                >
                                    View Report
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}