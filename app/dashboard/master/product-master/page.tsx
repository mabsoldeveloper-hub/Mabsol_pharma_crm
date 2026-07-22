"use client";

// NOTE: Put this file at: src/app/dashboard/inventory/products/full/page.tsx
// It reads data from: /api/products/full  (see api-route/route.ts)
//
// Requires the "xlsx" package for the Excel export button:
//   npm install xlsx

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
    VisibilityState,
    ColumnDef,
} from "@tanstack/react-table";
import {
    FaBoxes,
    FaCheckCircle,
    FaTimesCircle,
    FaSearch,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaChevronLeft,
    FaChevronRight,
    FaColumns,
    FaFileExcel,
    FaFilter,
    FaUndo,
    FaTimes,
} from "react-icons/fa";

type Product = Record<string, any>;

const columnHelper = createColumnHelper<Product>();

/* ---------------------------------------------------------- */
/* Helpers                                                      */
/* ---------------------------------------------------------- */

const money = (v: any) => `₹ ${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const pct = (v: any) => `${v ?? 0}%`;

function stockClasses(balance: number) {
    if (balance < 0) return "bg-rose-500/15 text-rose-600 ring-rose-500/30";
    if (balance <= 10) return "bg-amber-500/15 text-amber-700 ring-amber-500/30";
    return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30";
}

/* ---------------------------------------------------------- */
/* Field configuration — every field shown in Product Overview  */
/* grouped exactly like the Basic/Pricing/GST/Stock/Discount     */
/* sections, so the column picker mirrors that layout.           */
/* ---------------------------------------------------------- */

type FieldType = "text" | "money" | "percent" | "status" | "stock";

type FieldDef = {
    key: string;
    label: string;
    type?: FieldType;
    derived?: boolean; // computed value, not a direct DB key
};

const FIELD_GROUPS: { label: string; fields: FieldDef[] }[] = [
    {
        label: "Basic Information",
        fields: [
            { key: "CODE", label: "Code" },
            { key: "PRODUCT", label: "Product Name" },
            { key: "company", label: "Company", derived: true },
            { key: "GCODE", label: "GCode" },
            { key: "STATUS", label: "Status", type: "status" },
            { key: "UNIT", label: "Unit" },
            { key: "UNIT2", label: "Second Unit" },
            { key: "PACKING", label: "Packing" },
            { key: "PACK", label: "Pack Qty" },
            { key: "HSN", label: "HSN / SAC" },
            { key: "UPCCODE", label: "UPC Code" },
            { key: "RACKNO", label: "Rack No." },
            { key: "RACKNO2", label: "Rack No. 2" },
        ],
    },
    {
        label: "Pricing Information",
        fields: [
            { key: "MRP", label: "MRP", type: "money" },
            { key: "PRATE", label: "Purchase Rate", type: "money" },
            { key: "RATEF", label: "Sale Rate", type: "money" },
            { key: "LPRATE", label: "Last Purchase Rate", type: "money" },
            { key: "COST", label: "Cost / PCS", type: "money" },
            { key: "RATEA", label: "Rate A", type: "money" },
            { key: "RATEB", label: "Rate B", type: "money" },
            { key: "RATEC", label: "Rate C", type: "money" },
            { key: "RATED", label: "Rate D", type: "money" },
            { key: "RATEE", label: "Rate E", type: "money" },
            { key: "RATEG", label: "Rate G", type: "money" },
        ],
    },
    {
        label: "GST / Tax Information",
        fields: [
            { key: "CGST", label: "CGST", type: "percent" },
            { key: "SGST", label: "SGST", type: "percent" },
            { key: "IGST", label: "IGST", type: "percent" },
            { key: "PURTAX", label: "Purchase Tax", type: "percent" },
            { key: "SALTAX", label: "Sale Tax", type: "percent" },
            { key: "TAXL", label: "Tax Type" },
            { key: "TAXC", label: "Tax Category" },
        ],
    },
    {
        label: "Stock Information",
        fields: [
            { key: "BALANCE", label: "Current Stock", type: "stock" },
            { key: "OPENING", label: "Opening Stock" },
            { key: "ONQTY", label: "On Qty" },
            { key: "ONQTYFREE", label: "Free Qty" },
            { key: "FREEBAL", label: "Free Balance" },
            { key: "HOLD", label: "Hold Stock" },
            { key: "MINIMUM", label: "Minimum Stock" },
            { key: "MAXIMUM", label: "Maximum Stock" },
            { key: "TQTY", label: "Total Qty" },
            { key: "QTY", label: "Qty" },
        ],
    },
    {
        label: "Discount & Scheme",
        fields: [
            { key: "SALDIS", label: "Sale Discount", type: "percent" },
            { key: "PURDIS", label: "Purchase Discount", type: "percent" },
            { key: "SALVDIS", label: "Sale Special Discount", type: "percent" },
            { key: "PURSPDIS", label: "Purchase Special Discount", type: "percent" },
            { key: "PURSPVDIS", label: "Purchase V. Discount", type: "percent" },
            { key: "PURSPVDIS1", label: "Purchase V. Discount 2", type: "percent" },
            { key: "SALVDIS1", label: "Sale V. Discount 2", type: "percent" },
            { key: "FIXDIS", label: "Fixed Discount" },
            { key: "FIXDIS1", label: "Fixed Discount 2" },
            { key: "FREE", label: "Free Scheme" },
            { key: "QTRSCHE", label: "Quarter Scheme" },
            { key: "HALFSCHE", label: "Half Scheme" },
        ],
    },
];

const ALL_FIELDS: FieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);

// Columns visible by default; everything else can be ticked on from the
// "Columns" picker. Keeps the table usable on first load instead of
// showing all ~54 columns at once.
const DEFAULT_VISIBLE = [
    "CODE",
    "PRODUCT",
    "company",
    "STATUS",
    "UNIT",
    "MRP",
    "PRATE",
    "RATEF",
    "BALANCE",
    "IGST",
];

/* ---------------------------------------------------------- */
/* Small UI atoms                                                */
/* ---------------------------------------------------------- */

function StatChip({ label, value, tone }: { label: string; value: string | number; tone: string }) {
    return (
        <div className="flex items-center gap-2 rounded-xl bg-white/60 backdrop-blur-xl border border-white/40 px-3 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <span className={`h-2 w-2 rounded-full ${tone}`} />
            <span className="text-[11px] text-gray-500">{label}</span>
            <span className="text-sm font-semibold text-gray-700 tabular-nums">{value}</span>
        </div>
    );
}

/* ---------------------------------------------------------- */
/* Main page                                                    */
/* ---------------------------------------------------------- */

export default function ProductsFullViewPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [sorting, setSorting] = useState<SortingState>([]);

    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
        const state: VisibilityState = {};
        ALL_FIELDS.forEach((f) => {
            state[f.key] = DEFAULT_VISIBLE.includes(f.key);
        });
        return state;
    });

    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const [showFilters, setShowFilters] = useState(true);

    // ---- Filters -------------------------------------------------
    const [search, setSearch] = useState("");
    const [company, setCompany] = useState("");
    const [status, setStatus] = useState(""); // "", "Y", "N"
    const [stockStatus, setStockStatus] = useState(""); // "", "in", "low", "out"
    const [unit, setUnit] = useState("");
    const [igst, setIgst] = useState("");
    const [hsn, setHsn] = useState("");
    const [minMRP, setMinMRP] = useState("");
    const [maxMRP, setMaxMRP] = useState("");
    const [minStock, setMinStock] = useState("");
    const [maxStock, setMaxStock] = useState("");

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/master/product");
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    // ---- Distinct filter options derived from data ---------------
    const companyOptions = useMemo(
        () => Array.from(new Set(products.map((p) => p.companyName || p.GCODE).filter(Boolean))).sort(),
        [products]
    );
    const unitOptions = useMemo(
        () => Array.from(new Set(products.map((p) => p.UNIT).filter(Boolean))).sort(),
        [products]
    );
    const igstOptions = useMemo(
        () =>
            Array.from(new Set(products.map((p) => p.IGST).filter((v) => v !== undefined && v !== null))).sort(
                (a, b) => Number(a) - Number(b)
            ),
        [products]
    );

    const resetFilters = () => {
        setSearch("");
        setCompany("");
        setStatus("");
        setStockStatus("");
        setUnit("");
        setIgst("");
        setHsn("");
        setMinMRP("");
        setMaxMRP("");
        setMinStock("");
        setMaxStock("");
    };

    // ---- Filtering -------------------------------------------------
    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return products.filter((p) => {
            const comp = p.companyName || p.GCODE || "";
            const bal = Number(p.BALANCE || 0);

            if (
                s &&
                !(
                    (p.PRODUCT || "").toLowerCase().includes(s) ||
                    String(p.CODE || "").toLowerCase().includes(s) ||
                    (p.GCODE || "").toLowerCase().includes(s) ||
                    String(comp).toLowerCase().includes(s) ||
                    (p.HSN || "").toString().toLowerCase().includes(s)
                )
            )
                return false;

            if (company && comp !== company) return false;
            if (status && p.STATUS !== status) return false;
            if (unit && p.UNIT !== unit) return false;
            if (igst && String(p.IGST ?? "") !== String(igst)) return false;
            if (hsn && !String(p.HSN || "").toLowerCase().includes(hsn.toLowerCase())) return false;

            if (stockStatus === "in" && bal <= 10) return false;
            if (stockStatus === "low" && !(bal > 0 && bal <= 10)) return false;
            if (stockStatus === "out" && bal > 0) return false;

            if (minMRP && Number(p.MRP || 0) < Number(minMRP)) return false;
            if (maxMRP && Number(p.MRP || 0) > Number(maxMRP)) return false;
            if (minStock && bal < Number(minStock)) return false;
            if (maxStock && bal > Number(maxStock)) return false;

            return true;
        });
    }, [products, search, company, status, unit, igst, hsn, stockStatus, minMRP, maxMRP, minStock, maxStock]);

    const totalCount = filtered.length;
    const activeCount = filtered.filter((p) => p.STATUS === "Y").length;
    const inactiveCount = totalCount - activeCount;
    const outOfStockCount = filtered.filter((p) => Number(p.BALANCE || 0) <= 0).length;

    // ---- Columns ---------------------------------------------------
    const columns = useMemo(() => {
        const cols: ColumnDef<Product, any>[] = ALL_FIELDS.map((f) => {
            const accessor = f.derived ? (row: Product) => row.companyName || row.GCODE : f.key;

            return columnHelper.accessor(accessor as any, {
                id: f.key,
                header: f.label,
                cell: (info) => {
                    const val = info.getValue();
                    if (f.type === "money") return money(val);
                    if (f.type === "percent") return pct(val);
                    if (f.type === "status") {
                        return val === "Y" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30">
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/30">
                                Inactive
                            </span>
                        );
                    }
                    if (f.type === "stock") {
                        const n = Number(val || 0);
                        return (
                            <span
                                className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${stockClasses(
                                    n
                                )}`}
                            >
                                {n.toLocaleString()}
                            </span>
                        );
                    }
                    return val === undefined || val === null || val === "" ? "-" : String(val);
                },
            });
        });

        cols.push(
            columnHelper.display({
                id: "action",
                header: "Action",
                cell: (info) => (
                    <a
                        href={`/dashboard/inventory/products/view/${info.row.original._id}`}
                        className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-white/50 text-blue-600 ring-1 ring-blue-500/30 hover:bg-blue-500 hover:text-white hover:ring-blue-500 transition-all duration-200"
                    >
                        View
                    </a>
                ),
            })
        );

        return cols;
    }, []);

    const numericTypes = new Set(
        ALL_FIELDS.filter((f) => f.type === "money" || f.type === "percent" || f.type === "stock").map((f) => f.key)
    );

    const table = useReactTable({
        data: filtered,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    const toggleGroup = (group: { label: string; fields: FieldDef[] }, value: boolean) => {
        setColumnVisibility((prev) => {
            const next = { ...prev };
            group.fields.forEach((f) => (next[f.key] = value));
            return next;
        });
    };

    const visibleCount = ALL_FIELDS.filter((f) => columnVisibility[f.key]).length;

    // ---- Excel export ------------------------------------------------
    const exportToExcel = () => {
        const visibleCols = table.getVisibleLeafColumns().filter((c) => c.id !== "action");
        const rows = table.getFilteredRowModel().rows.map((row) => {
            const obj: Record<string, any> = {};
            visibleCols.forEach((col) => {
                const header = typeof col.columnDef.header === "string" ? col.columnDef.header : col.id;
                obj[header] = row.getValue(col.id);
            });
            return obj;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Products");
        XLSX.writeFile(wb, `products_full_export_${Date.now()}.xlsx`);
    };

    return (
        <div className="space-y-4">
            {/* ==================== STAT STRIP ==================== */}
            <div className="flex flex-wrap gap-2">
                <StatChip label="Products" value={totalCount} tone="bg-blue-500" />
                <StatChip label="Active" value={activeCount} tone="bg-emerald-500" />
                <StatChip label="Inactive" value={inactiveCount} tone="bg-rose-500" />
                <StatChip label="Out of Stock" value={outOfStockCount} tone="bg-slate-500" />
                <StatChip label="Columns shown" value={`${visibleCount}/${ALL_FIELDS.length}`} tone="bg-violet-500" />
            </div>

            {/* ==================== MAIN CARD ==================== */}
            <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                {/* header */}
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-600/85 to-indigo-600/85 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white">
                            <FaBoxes size={14} />
                        </div>
                        <h5 className="text-sm font-semibold text-white tracking-wide m-0">Product Master — Full View</h5>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full sm:w-56">
                            <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search product, code, company, HSN..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 text-white placeholder-white/60 ring-1 ring-white/25 focus:ring-white/50 outline-none backdrop-blur-md transition-all duration-200"
                            />
                        </div>

                        <button
                            onClick={() => setShowFilters((v) => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 transition-all duration-200"
                        >
                            <FaFilter size={11} /> Filters
                        </button>

                        <button
                            onClick={() => setShowColumnPicker(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 transition-all duration-200"
                        >
                            <FaColumns size={11} /> Columns ({visibleCount})
                        </button>

                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white ring-1 ring-emerald-400 hover:bg-emerald-600 transition-all duration-200"
                        >
                            <FaFileExcel size={12} /> Export Excel
                        </button>
                    </div>
                </div>

                {/* filters row */}
                {showFilters && (
                    <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-3 bg-white/40 border-b border-gray-200/60">
                        <select
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">All Companies</option>
                            {companyOptions.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>

                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">All Status</option>
                            <option value="Y">Active</option>
                            <option value="N">Inactive</option>
                        </select>

                        <select
                            value={stockStatus}
                            onChange={(e) => setStockStatus(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">All Stock Levels</option>
                            <option value="in">In Stock</option>
                            <option value="low">Low Stock (≤10)</option>
                            <option value="out">Out of Stock</option>
                        </select>

                        <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">All Units</option>
                            {unitOptions.map((u) => (
                                <option key={u} value={u}>
                                    {u}
                                </option>
                            ))}
                        </select>

                        <select
                            value={igst}
                            onChange={(e) => setIgst(e.target.value)}
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        >
                            <option value="">All GST %</option>
                            {igstOptions.map((g) => (
                                <option key={String(g)} value={String(g)}>
                                    {String(g)}%
                                </option>
                            ))}
                        </select>

                        <input
                            type="text"
                            value={hsn}
                            onChange={(e) => setHsn(e.target.value)}
                            placeholder="HSN / SAC"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />

                        <input
                            type="number"
                            value={minMRP}
                            onChange={(e) => setMinMRP(e.target.value)}
                            placeholder="Min MRP"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />
                        <input
                            type="number"
                            value={maxMRP}
                            onChange={(e) => setMaxMRP(e.target.value)}
                            placeholder="Max MRP"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />
                        <input
                            type="number"
                            value={minStock}
                            onChange={(e) => setMinStock(e.target.value)}
                            placeholder="Min Stock"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />
                        <input
                            type="number"
                            value={maxStock}
                            onChange={(e) => setMaxStock(e.target.value)}
                            placeholder="Max Stock"
                            className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none"
                        />

                        <button
                            onClick={resetFilters}
                            className="flex items-center justify-center gap-1.5 text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 hover:bg-gray-100 transition-all duration-200"
                        >
                            <FaUndo size={10} /> Reset
                        </button>
                    </div>
                )}

                {/* table body */}
                <div className="relative overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id} className="border-b border-gray-200/70 bg-white/30">
                                    {headerGroup.headers.map((header) => {
                                        const sortDir = header.column.getIsSorted();
                                        const isNumeric = numericTypes.has(header.column.id);
                                        return (
                                            <th
                                                key={header.id}
                                                onClick={header.column.getToggleSortingHandler()}
                                                className={`select-none cursor-pointer whitespace-nowrap px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide ${isNumeric ? "text-right" : "text-left"
                                                    } hover:text-gray-700 transition-colors`}
                                            >
                                                <span className={`inline-flex items-center gap-1 ${isNumeric ? "flex-row-reverse" : ""}`}>
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {header.column.getCanSort() &&
                                                        (sortDir === "asc" ? (
                                                            <FaSortUp size={11} className="text-slate-500" />
                                                        ) : sortDir === "desc" ? (
                                                            <FaSortDown size={11} className="text-slate-500" />
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
                            {loading ? (
                                <tr>
                                    <td colSpan={visibleCount + 1} className="text-center text-gray-400 py-10 text-sm">
                                        Loading products...
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200"
                                    >
                                        {row.getVisibleCells().map((cell) => {
                                            const isNumeric = numericTypes.has(cell.column.id);
                                            return (
                                                <td
                                                    key={cell.id}
                                                    className={`px-4 py-2.5 whitespace-nowrap text-gray-600 tabular-nums ${isNumeric ? "text-right" : "text-left"
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
                                    <td colSpan={visibleCount + 1} className="text-center text-gray-400 py-10 text-sm">
                                        No products found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* pagination footer */}
                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/30 text-xs text-gray-500">
                    <span>
                        Page <span className="font-semibold text-gray-700">{table.getState().pagination.pageIndex + 1}</span> of{" "}
                        <span className="font-semibold text-gray-700">{table.getPageCount() || 1}</span> &middot;{" "}
                        {table.getFilteredRowModel().rows.length} results
                    </span>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                            className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white hover:ring-blue-600 disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            First
                        </button>
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white hover:ring-blue-600 disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            <FaChevronLeft size={10} />
                        </button>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white hover:ring-blue-600 disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            <FaChevronRight size={10} />
                        </button>
                        <button
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                            className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-blue-600 hover:text-white hover:ring-blue-600 disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"
                        >
                            Last
                        </button>
                    </div>
                </div>
            </div>

            {/* ==================== COLUMN PICKER MODAL ==================== */}
            {showColumnPicker && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowColumnPicker(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
                    >
                        {/* modal header */}
                        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
                            <div className="flex items-center gap-2 text-white">
                                <FaColumns size={14} />
                                <h5 className="text-sm font-semibold tracking-wide m-0">
                                    Show / Hide Columns
                                    <span className="ml-2 text-xs font-normal text-white/70">
                                        {visibleCount} of {ALL_FIELDS.length} selected
                                    </span>
                                </h5>
                            </div>
                            <button
                                onClick={() => setShowColumnPicker(false)}
                                className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
                            >
                                <FaTimes size={12} />
                            </button>
                        </div>

                        {/* global select all / clear all */}
                        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                            <span className="text-[11px] text-gray-400">Tick the columns you want in the table</span>
                            <div className="flex gap-3">
                                <button
                                    onClick={() =>
                                        setColumnVisibility(Object.fromEntries(ALL_FIELDS.map((f) => [f.key, true])) as VisibilityState)
                                    }
                                    className="text-xs font-medium text-blue-600 hover:underline"
                                >
                                    Select all
                                </button>
                                <button
                                    onClick={() =>
                                        setColumnVisibility(Object.fromEntries(ALL_FIELDS.map((f) => [f.key, false])) as VisibilityState)
                                    }
                                    className="text-xs font-medium text-gray-500 hover:underline"
                                >
                                    Clear all
                                </button>
                            </div>
                        </div>

                        {/* scrollable field groups */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                            {FIELD_GROUPS.map((group) => (
                                <div key={group.label}>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                                            {group.label}
                                        </p>
                                        <div className="flex gap-2 text-[11px]">
                                            <button onClick={() => toggleGroup(group, true)} className="text-blue-500 hover:underline">
                                                all
                                            </button>
                                            <span className="text-gray-300">/</span>
                                            <button onClick={() => toggleGroup(group, false)} className="text-gray-400 hover:underline">
                                                none
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                                        {group.fields.map((f) => (
                                            <label
                                                key={f.key}
                                                className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={!!columnVisibility[f.key]}
                                                    onChange={(e) => setColumnVisibility((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                {f.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* footer */}
                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
                            <button
                                onClick={() => setShowColumnPicker(false)}
                                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}