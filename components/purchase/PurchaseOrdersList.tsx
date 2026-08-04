"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
  FaPlus,
  FaSearch,
  FaFileInvoice,
  FaBuilding,
  FaCalendarAlt,
  FaSync,
  FaCheckCircle,
  FaClock,
  FaTruck,
  FaEye,
  FaTimes,
  FaShoppingBag,
  FaFileInvoiceDollar,
  FaReceipt,
  FaUndoAlt,
  FaArrowRight,
  FaChevronLeft,
  FaChevronRight,
  FaPrint,
} from "react-icons/fa";

export default function PurchaseOrdersList() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedPoModal, setSelectedPoModal] = useState<any | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);
      if (selectedFY?._id) params.set("fyId", selectedFY._id);

      const res = await fetch(`/api/purchase/orders?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setOrders(json.orders || []);
        }
      }
    } catch (err) {
      console.error("Fetch Purchase Orders Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedFY]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Client-side Search & Status Filtering
  const filteredOrders = useMemo(() => {
    const s = search.trim().toLowerCase();
    return orders.filter((po) => {
      const matchesSearch =
        !s ||
        String(po.poNumber || "").toLowerCase().includes(s) ||
        String(po.vendorName || "").toLowerCase().includes(s) ||
        String(po.vendorCode || "").toLowerCase().includes(s) ||
        String(po.netTotal || "").toLowerCase().includes(s);

      const matchesStatus =
        statusFilter === "ALL" ||
        String(po.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  // Reset pagination when search or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, pageSize]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Top Summary Metrics
  const totalOrdersCount = filteredOrders.length;
  const totalOrdersValue = filteredOrders.reduce((sum, po) => sum + Number(po.netTotal || 0), 0);
  const pendingOrdersCount = filteredOrders.filter((po) => (po.status || "Pending") === "Pending").length;
  const billedOrdersCount = filteredOrders.filter((po) => po.status === "Billed").length;

  const handlePrintPo = () => {
    window.print();
  };

  return (
    // <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto text-slate-800 dark:text-slate-100">
    <div className="container-fluid p-4 md:p-6 space-y-6 ">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaTruck className="text-indigo-500" /> Purchase Orders & Requisitions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generated purchase orders, supplier requisitions & bill conversions
          </p>
        </div>

        <Link
          href="/dashboard/purchase/orders/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition"
        >
          <FaPlus /> Create Purchase Order
        </Link>
      </div>

      {/* Interlinking Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <Link
          href="/dashboard/purchase/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaShoppingBag className="text-amber-500" /> Dashboard
        </Link>
        <Link
          href="/dashboard/purchase/invoice"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaFileInvoice className="text-amber-500" /> Invoices
        </Link>
        <Link
          href="/dashboard/purchase/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white shadow-xs font-bold"
        >
          <FaTruck /> Purchase Orders
        </Link>
        <Link
          href="/dashboard/purchase/outstanding"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaFileInvoiceDollar className="text-rose-500" /> Outstanding
        </Link>
        <Link
          href="/dashboard/purchase/payment"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaReceipt className="text-emerald-500" /> Payment Entry
        </Link>
        <Link
          href="/dashboard/purchase/purchase-return"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaUndoAlt className="text-orange-500" /> Return (Debit Note)
        </Link>
      </div>

      {/* EXECUTIVE SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Purchase Orders</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalOrdersCount} POs</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Total PO Value</p>
          <p className="text-xl font-black text-indigo-600 mt-0.5">₹{totalOrdersValue.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending Requisitions</p>
          <p className="text-xl font-black text-amber-600 mt-0.5">{pendingOrdersCount} Pending</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Billed POs</p>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{billedOrdersCount} Converted</p>
        </div>
      </div>

      {/* SEARCH, FILTER & TABLE CONTAINER */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
        {/* Controls Bar: Search & Status Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search PO Number, Vendor Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <span className="px-2 text-slate-400 text-[11px] font-bold uppercase">Status:</span>
              {(["ALL", "Pending", "Billed"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg transition ${statusFilter === st
                    ? "bg-indigo-600 text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchOrders()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title="Refresh Orders"
            >
              <FaSync className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* LIST TABLE */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">Loading Purchase Orders...</div>
        ) : paginatedOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-3">PO Number</th>
                  <th className="py-3 px-3">PO Date</th>
                  <th className="py-3 px-3">Vendor Name</th>
                  <th className="py-3 px-3">Items Count</th>
                  <th className="py-3 px-3 text-right">Net Total (₹)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedOrders.map((po) => (
                  <tr key={po._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition">
                    <td className="py-3 px-3 font-extrabold text-indigo-600 dark:text-indigo-400">
                      {po.poNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{po.poDate || "N/A"}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {po.vendorName}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{po.items?.length || 0} items</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white text-sm">
                      ₹{Number(po.netTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${po.status === "Billed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                      >
                        {po.status || "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedPoModal(po)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white rounded-lg transition text-[11px]"
                          title="View PO Details & Print"
                        >
                          <FaEye />
                        </button>
                        <Link
                          href="/dashboard/purchase/invoice/create"
                          className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-600 hover:text-white text-amber-700 dark:text-amber-300 text-[11px] font-bold transition inline-flex items-center gap-1"
                        >
                          Convert Bill <FaArrowRight className="text-[9px]" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-slate-400 font-medium">
            No purchase orders found matching your search. Click "Create Purchase Order" above to generate one.
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {filteredOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60 pt-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredOrders.length)} to{" "}
              {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} Purchase Orders
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-3">
                <span className="text-[11px] text-slate-400">Per Page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <FaChevronLeft size={10} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl font-bold transition text-xs ${currentPage === pageNum
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <FaChevronRight size={10} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PO DETAILS & PRINT VOUCHER MODAL */}
      {selectedPoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaTruck className="text-indigo-500" /> Purchase Order Slip #{selectedPoModal.poNumber}
                </h3>
                <p className="text-xs text-slate-500">Date: {selectedPoModal.poDate}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPo}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <FaPrint /> Print Slip
                </button>
                <button onClick={() => setSelectedPoModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Printable Voucher Body */}
            <div className="space-y-4 p-4 border rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-indigo-600">{selectedCompany?.companyName || "PHARMA DISTRIBUTORS"}</h2>
                  <p className="text-[11px] text-slate-500">GSTIN: {selectedCompany?.gstNo || "N/A"}</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-black uppercase">
                    PURCHASE ORDER
                  </span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">PO #: {selectedPoModal.poNumber}</p>
                  <p className="text-[11px] text-slate-500">PO Date: {selectedPoModal.poDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Supplier / Vendor Details</span>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedPoModal.vendorName}</p>
                  <p className="text-slate-500">GSTIN: {selectedPoModal.vendorGst || "N/A"}</p>
                  <p className="text-slate-500">Address: {selectedPoModal.vendorAddress || "N/A"}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">PO Terms & Priority</span>
                  <p className="text-slate-700 dark:text-slate-300">Priority: <span className="font-bold text-indigo-600">{selectedPoModal.priority || "Normal"}</span></p>
                  <p className="text-slate-700 dark:text-slate-300">Payment Terms: <span className="font-bold">{selectedPoModal.paymentTerms || "30 Days Credit"}</span></p>
                  <p className="text-slate-700 dark:text-slate-300">Tax Type: <span className="font-bold">{selectedPoModal.taxType || "Intrastate"}</span></p>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-2">Ordered Products Breakdown</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 border-b">
                      <th className="p-2">Product Name</th>
                      <th className="p-2">HSN</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Dis %</th>
                      <th className="p-2 text-right">GST %</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {selectedPoModal.items && selectedPoModal.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-slate-900 dark:text-white">{item.productName}</td>
                        <td className="p-2 text-slate-500">{item.hsnCode || "-"}</td>
                        <td className="p-2 text-right font-bold">{item.qty}</td>
                        <td className="p-2 text-right">₹{item.rate}</td>
                        <td className="p-2 text-right">{item.discountPercent || 0}%</td>
                        <td className="p-2 text-right">{item.gstPercent || 12}%</td>
                        <td className="p-2 text-right font-bold text-indigo-600">₹{item.total || (item.qty * item.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-3 text-xs border-t">
                <div className="w-64 space-y-1 text-right">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-semibold">₹{(selectedPoModal.subtotal || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Tax:</span>
                    <span className="font-semibold">₹{(selectedPoModal.totalTax || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-black text-sm">
                    <span>Grand Total:</span>
                    <span className="text-indigo-600">₹{(selectedPoModal.netTotal || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t print:hidden">
              <Link
                href="/dashboard/purchase/invoice/create"
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
              >
                Convert to Purchase Bill &rarr;
              </Link>
              <button
                onClick={() => setSelectedPoModal(null)}
                className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
