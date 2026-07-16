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
  FaBuilding,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

type CompanyRow = {
  company: string;
  totalProducts: number;
  stock: number;
  stockValue: number;
};

const columnHelper = columnHelperFactory();

function columnHelperFactory() {
  return createColumnHelper<CompanyRow>();
}

export default function CompanySummary({ products }: any) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "stockValue", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");

  const companies: CompanyRow[] = useMemo(() => {
    const grouped = (products ?? []).reduce((obj: any, p: any) => {
      const company = p.companyName || "Unknown";
      if (!obj[company]) {
        obj[company] = {
          company,
          totalProducts: 0,
          stock: 0,
          stockValue: 0,
        };
      }
      obj[company].totalProducts++;
      obj[company].stock += Number(p.BALANCE || 0);
      obj[company].stockValue +=
        Number(p.BALANCE || 0) * Number(p.PRATE || 0);
      return obj;
    }, {});
    return Object.values(grouped);
  }, [products]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("company", {
        header: "Company",
        cell: (info) => (
          <span className="font-semibold text-gray-700">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("totalProducts", {
        header: "Products",
        cell: (info) => info.getValue().toLocaleString(),
      }),
      columnHelper.accessor("stock", {
        header: "Stock",
        cell: (info) => Number(info.getValue()).toLocaleString(),
      }),
      columnHelper.accessor("stockValue", {
        header: "Stock Value",
        cell: (info) =>
          `₹ ${Number(info.getValue()).toLocaleString("en-IN", {
            maximumFractionDigits: 2,
          })}`,
      }),
      columnHelper.display({
        id: "view",
        header: "View",
        cell: (info) => (
          <Link
            href={`/dashboard/inventory/products?company=${encodeURIComponent(
              info.row.original.company
            )}`}
            className="
              inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium
              bg-white/50 text-cyan-600 ring-1 ring-cyan-500/30
              hover:bg-cyan-500 hover:text-white hover:ring-cyan-500
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
    data: companies,
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
      return String(row.original.company ?? "").toLowerCase().includes(search);
    },
  });

  return (
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
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-cyan-500/85 to-sky-500/85 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
            <FaBuilding size={14} />
          </div>
          <h5 className="text-sm font-semibold text-white tracking-wide m-0">
            Company Wise Inventory
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
            placeholder="Search company..."
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
                  const isNumeric =
                    header.column.id !== "company" && header.column.id !== "view";
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={`
                        ${canSort ? "cursor-pointer select-none" : ""} px-4 py-2.5
                        font-medium text-gray-500 text-xs uppercase tracking-wide
                        ${isNumeric ? "text-right" : "text-left"}
                        hover:text-gray-700 transition-colors
                      `}
                    >
                      <span
                        className={`inline-flex items-center gap-1 ${isNumeric ? "flex-row-reverse" : ""
                          }`}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort &&
                          (sortDir === "asc" ? (
                            <FaSortUp size={11} className="text-cyan-500" />
                          ) : sortDir === "desc" ? (
                            <FaSortDown size={11} className="text-cyan-500" />
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
                    const isNumeric =
                      cell.column.id !== "company" && cell.column.id !== "view";
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
                  No Company Data
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
              hover:bg-cyan-500 hover:text-white hover:ring-cyan-500
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
              hover:bg-cyan-500 hover:text-white hover:ring-cyan-500
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