"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Users, UserCircle2, Wallet, CreditCard, ArrowUpRight } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

interface Customer {
  _id?: string;
  CODEP?: string;
  PARNAM?: string;
  MAILNAM?: string;
  PHONE1?: string;
  CITY?: string;
  GSTNO?: string;
  DLNO?: string;
  BALANCE?: number;
  CREDIT?: number;
  STATUS?: string;
  REF?: string;
}

const columnHelper = createColumnHelper<Customer>();

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive" | "Outstanding">("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers");
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  // status filter applied before it goes into the table (global search + sorting + pagination are handled by the table itself)
  const statusFilteredData = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter === "Active") return c.STATUS === "Y";
      if (statusFilter === "Inactive") return c.STATUS !== "Y";
      if (statusFilter === "Outstanding") return Number(c.BALANCE) > 0;
      return true;
    });
  }, [customers, statusFilter]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "serial",
        header: "#",
        cell: (info) => info.row.index + 1,
      }),
      columnHelper.accessor("CODEP", {
        header: "Code",
        cell: (info) => (
          <span className="font-semibold text-[#343872]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("PARNAM", {
        header: "Customer Name",
        cell: (info) => (
          <div>
            <div className="font-semibold text-slate-800">{info.getValue()}</div>
            <div className="text-xs text-slate-400">
              {info.row.original.MAILNAM || "No Email"}
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: "contact",
        header: "Contact",
        cell: (info) => (
          <span className="text-slate-600">
            {info.row.original.PHONE1 || info.row.original.REF || "-"}
          </span>
        ),
      }),
      columnHelper.accessor("CITY", {
        header: "City",
        cell: (info) => <span className="text-slate-600">{info.getValue() || "-"}</span>,
      }),
      columnHelper.accessor("GSTNO", {
        header: "GST No",
        cell: (info) => <span className="text-slate-600">{info.getValue() || "-"}</span>,
      }),
      columnHelper.accessor("DLNO", {
        header: "DL No",
        cell: (info) => <span className="text-slate-600">{info.getValue() || "-"}</span>,
      }),
      columnHelper.accessor("BALANCE", {
        header: "Outstanding",
        cell: (info) => {
          const val = Number(info.getValue() || 0);
          return (
            <span
              className={
                val > 0 ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"
              }
            >
              ₹{val.toLocaleString()}
            </span>
          );
        },
      }),
      columnHelper.accessor("STATUS", {
        header: "Status",
        cell: (info) =>
          info.getValue() === "Y" ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
              Inactive
            </span>
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => (
          <div className="flex items-center justify-center gap-2">
            <Link
              href={`/dashboard/customers/view/${info.row.original._id}`}
              className="rounded-lg bg-[#343872] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#282c5c]"
            >
              View
            </Link>
            <button className="rounded-lg bg-[#fb8c00] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#e07d00]">
              Ledger
            </button>
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
              Edit
            </button>
          </div>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: statusFilteredData,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const term = filterValue.toLowerCase();
      const c = row.original;
      return (
        (c.PARNAM?.toLowerCase() || "").includes(term) ||
        (c.CODEP?.toLowerCase() || "").includes(term) ||
        (c.GSTNO?.toLowerCase() || "").includes(term) ||
        (c.PHONE1?.toLowerCase() || "").includes(term)
      );
    },
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.STATUS === "Y").length;
  const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.BALANCE) || 0), 0);
  const totalCredit = customers.reduce((sum, c) => sum + (Number(c.CREDIT) || 0), 0);

  const rows = table.getRowModel().rows;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="min-h-screen bg-[#f4f5fa] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#343872] tracking-tight">
            Customer Master
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage all customers from one place
          </p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fb8c00] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-[#e07d00] active:scale-[0.98]">
          <i className="bi bi-plus-lg"></i>
          Add Customer
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {/* Total Customers */}
        <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
              <Users className="h-4 w-4 text-[#343872]" />
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
              <ArrowUpRight className="h-2.5 w-2.5" />
              12%
            </span>
          </div>
          <h6 className="mt-2.5 text-xs font-medium text-slate-500">Total Customers</h6>
          <p className="mt-0.5 text-xl font-bold text-slate-800">{totalCustomers}</p>
        </div>

        {/* Active Customers */}
        <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
              <UserCircle2 className="h-4 w-4 text-[#fb8c00]" />
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
              <ArrowUpRight className="h-2.5 w-2.5" />
              12%
            </span>
          </div>
          <h6 className="mt-2.5 text-xs font-medium text-slate-500">Active Customers</h6>
          <p className="mt-0.5 text-xl font-bold text-slate-800">{activeCustomers}</p>
        </div>

        {/* Outstanding */}
        <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
              <Wallet className="h-4 w-4 text-rose-600" />
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
              <ArrowUpRight className="h-2.5 w-2.5" />
              12%
            </span>
          </div>
          <h6 className="mt-2.5 text-xs font-medium text-slate-500">Outstanding</h6>
          <p className="mt-0.5 text-lg font-bold text-slate-800">
            ₹{totalOutstanding.toLocaleString()}
          </p>
        </div>

        {/* Total Credit */}
        <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <CreditCard className="h-4 w-4 text-slate-600" />
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
              <ArrowUpRight className="h-2.5 w-2.5" />
              12%
            </span>
          </div>
          <h6 className="mt-2.5 text-xs font-medium text-slate-500">Total Credit</h6>
          <p className="mt-0.5 text-lg font-bold text-slate-800">
            ₹{totalCredit.toLocaleString()}
          </p>
        </div>
      </div>
      {/* Search & Filter Bar */}
      <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-slate-100 mb-6">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 lg:max-w-md">
            <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search by name, code, GST or phone..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-[#343872] focus:ring-2 focus:ring-[#343872]/20"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>

          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#343872] focus:ring-2 focus:ring-[#343872]/20 lg:w-56"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="All">All Customers</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
            <option value="Outstanding">Outstanding Balance</option>
          </select>

          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#343872] focus:ring-2 focus:ring-[#343872]/20"
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>

          <div className="flex gap-2 lg:ml-auto">
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white transition hover:bg-emerald-700">
              <i className="bi bi-file-earmark-excel"></i>
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white transition hover:bg-rose-700">
              <i className="bi bi-file-earmark-pdf"></i>
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-slate-600 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white transition hover:bg-slate-700">
              <i className="bi bi-printer"></i>
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="bg-[#343872] text-left text-xs font-semibold uppercase tracking-wide text-white"
                >
                  {headerGroup.headers.map((header) => {
                    const sortable = header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className={`px-4 py-3.5 select-none ${
                          sortable ? "cursor-pointer" : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortable && (
                            <span className="text-[10px] opacity-70">
                              {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : "⇅"}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#343872] border-t-transparent" />
                      Loading customers...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-14 text-center text-slate-400">
                    No customers found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-[#343872]/[0.04]">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination / Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-4 py-4">
          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {rows.length === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1}
              {"-"}
              {pageIndex * table.getState().pagination.pageSize + rows.length}
            </span>{" "}
            of <span className="font-semibold text-slate-700">{filteredCount}</span> customers
            {filteredCount !== totalCustomers && (
              <span> (filtered from {totalCustomers})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </button>
            <span className="rounded-lg bg-[#343872] px-3.5 py-1.5 text-sm font-semibold text-white">
              {pageCount === 0 ? 0 : pageIndex + 1} / {pageCount}
            </span>
            <button
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}