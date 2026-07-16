"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import {
  FaBoxOpen,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

type Product = {
  _id: string;
  PRODUCT: string;
  GCODE?: string;
  BALANCE: number;
  PRATE?: number;
  MRP?: number;
};

const columnHelper = createColumnHelper<Product>();

function stockBadgeClasses(balance: number) {
  if (balance < 0) return "bg-rose-500/15 text-rose-600 ring-rose-500/30";
  if (balance <= 10) return "bg-amber-500/15 text-amber-700 ring-amber-500/30";
  return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30";
}

export default function TopProductsTable({ products }: { products: Product[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const data = useMemo(() => products ?? [], [products]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("PRODUCT", {
        header: "Product",
        cell: (info) => (
          <span className="font-semibold text-gray-700">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("GCODE", {
        header: "Company",
        cell: (info) => info.getValue() || "-",
      }),
      columnHelper.accessor("BALANCE", {
        header: "Stock",
        cell: (info) => {
          const val = Number(info.getValue() || 0);
          return (
            <span
              className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${stockBadgeClasses(
                val
              )}`}
            >
              {val.toLocaleString()}
            </span>
          );
        },
      }),
      columnHelper.accessor("PRATE", {
        header: "Purchase",
        cell: (info) => `₹ ${Number(info.getValue() || 0).toLocaleString()}`,
      }),
      columnHelper.accessor("MRP", {
        header: "MRP",
        cell: (info) => `₹ ${Number(info.getValue() || 0).toLocaleString()}`,
      }),
      columnHelper.display({
        id: "view",
        header: "View",
        cell: (info) => (
          <Link
            href={`/dashboard/inventory/products/view/${info.row.original._id}`}
            className="
              inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium
              bg-white/50 text-blue-600 ring-1 ring-blue-500/30
              hover:bg-blue-500 hover:text-white hover:ring-blue-500
              transition-all duration-200
            "
          >
            View
          </Link>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
    globalFilterFn: (row, columnId, filterValue) => {
      const search = String(filterValue).toLowerCase();
      const product = String(row.original.PRODUCT ?? "").toLowerCase();
      const company = String(row.original.GCODE ?? "").toLowerCase();
      return product.includes(search) || company.includes(search);
    },
  });

  return (
    <div
      className="
        relative rounded-2xl overflow-hidden h-full
        bg-white/60 backdrop-blur-xl
        border border-white/40
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
      "
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

      {/* header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-500/85 to-indigo-500/85 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
            <FaBoxOpen size={14} />
          </div>
          <h5 className="text-sm font-semibold text-white tracking-wide m-0">
            Top Products By Stock
          </h5>
        </div>

        <div className="relative w-full sm:w-56">
          <FaSearch
            size={12}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
          />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search product or company..."
            className="
              w-full pl-8 pr-3 py-1.5 rounded-lg text-xs
              bg-white/20 text-white placeholder-white/70
              ring-1 ring-white/30 focus:ring-white/60
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
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200/70 bg-white/30">
                {headerGroup.headers.map((header) => {
                  const sortDir = header.column.getIsSorted();
                  const isNumeric = ["BALANCE", "PRATE", "MRP"].includes(
                    header.column.id
                  );
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`
                        select-none cursor-pointer px-4 py-2.5
                        font-medium text-gray-500 text-xs uppercase tracking-wide
                        ${isNumeric ? "text-right" : "text-left"}
                        hover:text-gray-700 transition-colors
                      `}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() &&
                          (sortDir === "asc" ? (
                            <FaSortUp size={11} className="text-blue-500" />
                          ) : sortDir === "desc" ? (
                            <FaSortDown size={11} className="text-blue-500" />
                          ) : (
                            <FaSort size={10} className="text-gray-300" />
                          ))}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200"
                >
                  {row.getVisibleCells().map((cell) => {
                    const isNumeric = ["BALANCE", "PRATE", "MRP"].includes(
                      cell.column.id
                    );
                    return (
                      <td
                        key={cell.id}
                        className={`px-4 py-2.5 text-gray-600 tabular-nums ${isNumeric ? "text-right" : "text-left"
                          }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center text-gray-400 py-8 text-sm">
                  No Products Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination footer */}
      <div className="relative flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/30 text-xs text-gray-500">
        <span>
          Page{" "}
          <span className="font-semibold text-gray-700">
            {table.getState().pagination.pageIndex + 1}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-gray-700">
            {table.getPageCount() || 1}
          </span>{" "}
          &middot; {table.getFilteredRowModel().rows.length} results
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="
              flex items-center justify-center h-7 w-7 rounded-lg
              bg-white/50 ring-1 ring-gray-200 text-gray-600
              hover:bg-blue-500 hover:text-white hover:ring-blue-500
              disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
              transition-all duration-200
            "
          >
            <FaChevronLeft size={10} />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="
              flex items-center justify-center h-7 w-7 rounded-lg
              bg-white/50 ring-1 ring-gray-200 text-gray-600
              hover:bg-blue-500 hover:text-white hover:ring-blue-500
              disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600
              transition-all duration-200
            "
          >
            <FaChevronRight size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}