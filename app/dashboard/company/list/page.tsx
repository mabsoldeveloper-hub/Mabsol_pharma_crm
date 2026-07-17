"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";
import { FaBuilding, FaSearch, FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

type Company = {
  _id: string;
  companyCode?: string;
  companyName?: string;
  ownerName?: string;
  email?: string;
  mobile?: string;
  status?: string;
};

const columnHelper = createColumnHelper<Company>();

export default function CompanyListPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/company-master");
      const data = await res.json();
      setCompanies(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const deleteCompany = async (id: string) => {
    if (!confirm("Delete this company?")) return;
    await fetch(`/api/company-master/${id}`, { method: "DELETE" });
    loadCompanies();
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("companyCode", {
        header: "Code",
        cell: (info) => (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 border border-indigo-400/20">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("companyName", {
        header: "Company",
        cell: (info) => (
          <span className="font-medium text-gray-700">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("ownerName", {
        header: "Owner",
        cell: (info) => (
          <span className="text-gray-600">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="text-gray-600">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("mobile", {
        header: "Mobile",
        cell: (info) => (
          <span className="text-gray-600">{info.getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) =>
          info.getValue() === "Active" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 border border-rose-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              {info.getValue() || "Inactive"}
            </span>
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Action",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/company/edit/${info.row.original._id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-amber-500/90 hover:bg-amber-500 transition-colors"
            >
              <FaEdit size={11} />
              Edit
            </Link>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-500/90 hover:bg-rose-500 transition-colors"
              onClick={() => deleteCompany(info.row.original._id)}
            >
              <FaTrash size={11} />
              Delete
            </button>
          </div>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: companies,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase();
      const c = row.original;
      return (
        !!c.companyCode?.toLowerCase().includes(q) ||
        !!c.companyName?.toLowerCase().includes(q) ||
        !!c.ownerName?.toLowerCase().includes(q) ||
        !!c.email?.toLowerCase().includes(q) ||
        !!c.mobile?.toLowerCase().includes(q)
      );
    },
  });

  const inputClass =
    "w-full rounded-lg text-sm pl-9 pr-3 py-2 bg-white/50 border border-white/60 text-gray-700 placeholder-gray-400 outline-none focus:bg-white/70 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20 transition-all";

  const pageBtnClass =
    "h-8 w-8 inline-flex items-center justify-center rounded-lg text-xs font-semibold text-gray-600 bg-white/50 hover:bg-white/80 border border-white/60 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/50 transition-colors";

  return (
    <ProtectedPage permission="company.view">
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
        <div className="relative flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500/80 to-violet-500/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
              <FaBuilding size={13} />
            </div>
            <h5 className="text-sm font-semibold text-white tracking-wide m-0">
              Company List
            </h5>
          </div>

          <Link
            href="/dashboard/company/create"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-white/90 hover:bg-white transition-colors"
          >
            <FaPlus size={10} />
            Add Company
          </Link>
        </div>

        {/* body */}
        <div className="relative p-5">
          {/* search + count */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <FaSearch
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className={inputClass}
                placeholder="Search code, company, owner, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="text-xs text-gray-500">
              {table.getFilteredRowModel().rows.length} of {companies.length}
            </span>
          </div>

          {/* table */}
          <div className="rounded-xl overflow-hidden border border-white/60 bg-white/30">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr
                    key={hg.id}
                    className="bg-gradient-to-r from-indigo-500/80 to-violet-500/80"
                  >
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      No companies found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-white/50 hover:bg-white/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-200/70 pt-4 flex-wrap">
            <span className="text-xs text-gray-500">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                className={pageBtnClass}
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                «
              </button>
              <button
                className={pageBtnClass}
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                ‹
              </button>
              <button
                className={pageBtnClass}
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                ›
              </button>
              <button
                className={pageBtnClass}
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}