"use client";

/**
 * components/ui/data-table.tsx
 * -----------------------------------------------------------------------
 * Generic, reusable data table built on @tanstack/react-table.
 * Every table on the Stock Dashboard uses this — gives every section
 * a search box, sortable headers, and pagination for free.
 *
 * Install (once, in your Next.js project):
 *   npm install @tanstack/react-table
 * -----------------------------------------------------------------------
 */

import { useState } from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Search, ArrowUpDown } from "lucide-react";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchPlaceholder?: string;
    pageSize?: number;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchPlaceholder = "Search...",
    pageSize = 6,
}: DataTableProps<TData, TValue>) {
    const [globalFilter, setGlobalFilter] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        state: { globalFilter, sorting },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize } },
    });

    const rowCount = table.getFilteredRowModel().rows.length;

    return (
        <div className="space-y-3">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                    value={globalFilter ?? ""}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-xl border border-white/60 bg-white/50 backdrop-blur-md pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white/80 focus:border-sky-200 transition-colors"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/50 bg-white/30 backdrop-blur-md">
                <table className="w-full text-xs">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b border-white/50">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        className="px-3 py-2.5 text-left font-medium text-slate-500 select-none whitespace-nowrap"
                                    >
                                        {header.isPlaceholder ? null : (
                                            <button className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && (
                                                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                                                )}
                                            </button>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-white/40">
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <tr key={row.id} className="hover:bg-white/40 transition-colors">
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">
                                    No records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {rowCount > 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {Math.max(table.getPageCount(), 1)} · {rowCount} records
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="p-1.5 rounded-lg border border-white/60 bg-white/50 backdrop-blur-md disabled:opacity-30 hover:bg-white/80 transition-colors"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="p-1.5 rounded-lg border border-white/60 bg-white/50 backdrop-blur-md disabled:opacity-30 hover:bg-white/80 transition-colors"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}