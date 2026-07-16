"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    FaFileInvoiceDollar,
    FaSearch,
    FaChevronLeft,
    FaChevronRight,
    FaReceipt,
    FaRupeeSign,
    FaPercentage,
    FaCheckCircle,
    FaTruck,
    FaUndo,
} from "react-icons/fa";

type InvoiceRow = {
    vcn: string;
    date: string;
    type: "S" | "P" | "R" | string;
    customer: string;
    city: string;
    gstHeading?: string;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
    tax: number;
};

export default function InvoicePage() {

    const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {

        try {

            const res = await fetch("/api/sales/invoice");
            const data = await res.json();

            if (Array.isArray(data)) {
                setInvoices(data);
            } else {
                console.error("Invalid API Response", data);
                setInvoices([]);
            }

        } catch (err) {
            console.error(err);
            setInvoices([]);
        }

    };

    // search filter (bill no, customer, city)
    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return invoices;

        return invoices.filter((row) =>
            String(row.vcn || "").toLowerCase().includes(s) ||
            String(row.customer || "").toLowerCase().includes(s) ||
            String(row.city || "").toLowerCase().includes(s)
        );
    }, [invoices, search]);

    // reset to page 1 whenever search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    const paginated = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, currentPage]);

    const goToPage = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    // build page number list (max 5 visible, with ellipsis)
    const pageNumbers = useMemo(() => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
            pages.push(1, 2, 3, 4, "...", totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
        }

        return pages;
    }, [currentPage, totalPages]);

    // Dashboard Cards — based on filtered (search) results
    const totalBills = filtered.length;

    const totalSale = filtered.reduce(
        (sum, row) => sum + Number(row.total || 0),
        0
    );

    const totalTaxable = filtered.reduce(
        (sum, row) => sum + Number(row.taxable || 0),
        0
    );

    const totalTax = filtered.reduce(
        (sum, row) => sum + Number(row.tax || 0),
        0
    );

    const salesBills = filtered.filter((x) => x.type === "S").length;
    const purchaseBills = filtered.filter((x) => x.type === "P").length;
    const returnBills = filtered.filter((x) => x.type === "R").length;

    const typeBadge = (type: string) => {
        if (type === "S")
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/20">
                    Sales
                </span>
            );
        if (type === "P")
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 ring-1 ring-blue-500/20">
                    Purchase
                </span>
            );
        if (type === "R")
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 ring-1 ring-red-500/20">
                    Return
                </span>
            );
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 ring-1 ring-gray-400/20">
                Unknown
            </span>
        );
    };

    const summaryCards = [
        {
            title: "Total Bills",
            value: totalBills,
            icon: <FaReceipt size={16} />,
            ring: "from-indigo-400/40 to-blue-500/40",
            iconBg: "bg-indigo-500/15 text-indigo-600",
            glow: "group-hover:shadow-indigo-400/30",
        },
        {
            title: "Total Sale",
            value: "₹ " + totalSale.toLocaleString("en-IN"),
            icon: <FaRupeeSign size={16} />,
            ring: "from-emerald-400/40 to-green-500/40",
            iconBg: "bg-emerald-500/15 text-emerald-600",
            glow: "group-hover:shadow-emerald-400/30",
        },
        {
            title: "Taxable Amount",
            value: "₹ " + totalTaxable.toLocaleString("en-IN"),
            icon: <FaRupeeSign size={16} />,
            ring: "from-amber-400/40 to-yellow-500/40",
            iconBg: "bg-amber-500/15 text-amber-600",
            glow: "group-hover:shadow-amber-400/30",
        },
        {
            title: "Total Tax",
            value: "₹ " + totalTax.toLocaleString("en-IN"),
            icon: <FaPercentage size={16} />,
            ring: "from-rose-400/40 to-red-500/40",
            iconBg: "bg-rose-500/15 text-rose-600",
            glow: "group-hover:shadow-rose-400/30",
        },
        {
            title: "Sales Bills",
            value: salesBills,
            icon: <FaCheckCircle size={16} />,
            ring: "from-green-400/40 to-emerald-500/40",
            iconBg: "bg-green-500/15 text-green-600",
            glow: "group-hover:shadow-green-400/30",
        },
        {
            title: "Purchase Bills",
            value: purchaseBills,
            icon: <FaTruck size={16} />,
            ring: "from-blue-400/40 to-sky-500/40",
            iconBg: "bg-blue-500/15 text-blue-600",
            glow: "group-hover:shadow-blue-400/30",
        },
        {
            title: "Return Bills",
            value: returnBills,
            icon: <FaUndo size={16} />,
            ring: "from-red-400/40 to-rose-500/40",
            iconBg: "bg-red-500/15 text-red-600",
            glow: "group-hover:shadow-red-400/30",
        },
    ];

    return (
        <div className="space-y-4">

            {/* summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {summaryCards.map((card, index) => (
                    <div
                        key={index}
                        className={`
              group relative rounded-2xl p-[1px]
              bg-gradient-to-br ${card.ring}
              transition-all duration-500 ease-out
              hover:-translate-y-1.5 hover:scale-[1.02]
            `}
                    >
                        {/* Glass body */}
                        <div
                            className={`
                relative h-full rounded-2xl overflow-hidden
                bg-white/60 backdrop-blur-xl
                border border-white/40
                shadow-[0_4px_20px_rgba(0,0,0,0.06)]
                transition-all duration-500 ease-out
                group-hover:shadow-xl ${card.glow}
                p-3
              `}
                        >
                            {/* subtle top sheen — liquid glass highlight */}
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                            {/* animated shine sweep on hover */}
                            <div className="pointer-events-none absolute -inset-y-10 -left-1/2 w-1/3 rotate-12 bg-white/30 blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-[250%] transition-all duration-700 ease-out" />

                            <div className="relative flex items-start justify-between">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium text-gray-500 tracking-wide truncate">
                                        {card.title}
                                    </p>
                                    <h3
                                        className={`mt-0.5 font-semibold text-gray-800 tabular-nums whitespace-nowrap ${String(card.value ?? 0).length > 9
                                            ? "text-sm"
                                            : String(card.value ?? 0).length > 6
                                                ? "text-base"
                                                : "text-lg"
                                            }`}
                                    >
                                        {card.value ?? 0}
                                    </h3>
                                </div>

                                <div
                                    className={`
                    flex items-center justify-center h-8 w-8 rounded-lg shrink-0
                    ${card.iconBg}
                    ring-1 ring-white/50
                    transition-transform duration-500
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

            {/* invoice register table */}
            <div
                className="
          relative rounded-2xl overflow-hidden
          bg-white/60 backdrop-blur-xl
          border border-white/40
          shadow-[0_4px_20px_rgba(0,0,0,0.06)]
        "
            >
                {/* top sheen */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                {/* header */}
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-gray-800/90 to-gray-700/90 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white">
                            <FaFileInvoiceDollar size={14} />
                        </div>
                        <h5 className="text-sm font-semibold text-white tracking-wide m-0">
                            Invoice Register
                        </h5>
                    </div>

                    <div className="relative w-full sm:w-80">
                        <FaSearch
                            size={12}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
                        />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search Bill No, Customer, City..."
                            className="
                w-full pl-8 pr-3 py-1.5 rounded-lg text-xs
                bg-white/15 text-white placeholder-white/60
                ring-1 ring-white/25 focus:ring-white/50
                outline-none backdrop-blur-md
                transition-all duration-200
              "
                        />
                    </div>
                </div>

                {/* body */}
                <div className="relative overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200/70 bg-white/30">
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Bill No</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Date</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Type</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">City</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Party Type</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">Taxable</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">CGST</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">SGST</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">IGST</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">Total</th>
                                <th className="px-4 py-2.5 text-center font-medium text-gray-500 text-xs uppercase tracking-wide">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {paginated.length > 0 ? (
                                paginated.map((row, index) => (
                                    <tr
                                        key={index}
                                        className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200"
                                    >
                                        <td className="px-4 py-2.5 text-left text-gray-700 font-semibold">
                                            {row.vcn}
                                        </td>
                                        <td className="px-4 py-2.5 text-left text-gray-600">
                                            {row.date}
                                        </td>
                                        <td className="px-4 py-2.5 text-left">
                                            {typeBadge(row.type)}
                                        </td>
                                        <td className="px-4 py-2.5 text-left text-gray-600">
                                            {row.customer}
                                        </td>
                                        <td className="px-4 py-2.5 text-left text-gray-600">
                                            {row.city}
                                        </td>
                                        <td className="px-4 py-2.5 text-left">
                                            {row.gstHeading?.toUpperCase().includes("LOCAL") ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/20">
                                                    Local
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 ring-1 ring-amber-500/20">
                                                    Central
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                                            ₹ {Number(row.taxable || 0).toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                                            {Number(row.igst) > 0
                                                ? "-"
                                                : "₹ " + Number(row.cgst || 0).toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                                            {Number(row.igst) > 0
                                                ? "-"
                                                : "₹ " + Number(row.sgst || 0).toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                                            {Number(row.igst) > 0
                                                ? "₹ " + Number(row.igst || 0).toLocaleString("en-IN")
                                                : "-"}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-gray-800 font-bold tabular-nums">
                                            ₹ {Number(row.total || 0).toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <Link
                                                href={`/dashboard/sales/invoice/${encodeURIComponent(row.vcn)}`}
                                                className="
                          inline-flex items-center justify-center
                          px-3 py-1 rounded-lg text-xs font-medium
                          bg-gray-800 text-white
                          hover:bg-gray-900
                          transition-colors duration-200
                        "
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={12} className="text-center text-gray-400 py-8 text-sm">
                                        No Invoice Found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* pagination footer */}
                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/30 text-xs text-gray-500">
                    <span>
                        Page{" "}
                        <span className="font-semibold text-gray-700">{currentPage}</span>{" "}
                        of{" "}
                        <span className="font-semibold text-gray-700">{totalPages}</span>{" "}
                        &middot; {filtered.length} results
                    </span>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="
                flex items-center justify-center h-7 w-7 rounded-lg
                bg-white/50 ring-1 ring-gray-200 text-gray-600
                hover:bg-gray-800 hover:text-white hover:ring-gray-800
                disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
                transition-all duration-200
              "
                        >
                            <FaChevronLeft size={10} />
                        </button>

                        {pageNumbers.map((p, i) =>
                            p === "..." ? (
                                <span
                                    key={`ellipsis-${i}`}
                                    className="flex items-center justify-center h-7 w-7 text-gray-400"
                                >
                                    …
                                </span>
                            ) : (
                                <button
                                    key={p}
                                    onClick={() => goToPage(p as number)}
                                    className={`
                    flex items-center justify-center h-7 w-7 rounded-lg text-xs font-medium
                    transition-all duration-200
                    ${currentPage === p
                                            ? "bg-gray-800 text-white ring-1 ring-gray-800"
                                            : "bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-gray-800 hover:text-white hover:ring-gray-800"
                                        }
                  `}
                                >
                                    {p}
                                </button>
                            )
                        )}

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="
                flex items-center justify-center h-7 w-7 rounded-lg
                bg-white/50 ring-1 ring-gray-200 text-gray-600
                hover:bg-gray-800 hover:text-white hover:ring-gray-800
                disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
                transition-all duration-200
              "
                        >
                            <FaChevronRight size={10} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}