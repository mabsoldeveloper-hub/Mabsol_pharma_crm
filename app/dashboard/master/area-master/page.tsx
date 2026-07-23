"use client";

// NOTE: Put this file at: src/app/dashboard/area/full/page.tsx
// It reads data from: /api/master/area  (see route.ts)
// "View" button on each row goes to: /dashboard/area/full/[area] (new detail page)
//
// Requires the "xlsx" package for the Excel export button:
//   npm install xlsx

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
    FaMapMarkedAlt,
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
    FaEye,
} from "react-icons/fa";

type AreaRow = Record<string, any>;

const columnHelper = createColumnHelper<AreaRow>();

/* ---------------------------------------------------------- */
/* Helpers                                                      */
/* ---------------------------------------------------------- */

const money = (v: any) => `₹ ${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function balanceClasses(balance: number) {
    if (balance > 0) return "bg-rose-500/15 text-rose-600 ring-rose-500/30";
    if (balance < 0) return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30";
    return "bg-slate-500/15 text-slate-600 ring-slate-500/30";
}

const fmtDate = (v: any) => {
    if (!v) return "-";
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const AREA_SOURCE_LABEL: Record<string, string> = {
    area: "Explicit Area",
    district: "Derived from District",
    city: "Derived from City",
    unassigned: "Unassigned",
};

/* ---------------------------------------------------------- */
/* Field configuration                                           */
/* ---------------------------------------------------------- */

type FieldType = "text" | "money" | "date" | "balance" | "count";

type FieldDef = { key: string; label: string; type?: FieldType };

const FIELD_GROUPS: { label: string; fields: FieldDef[] }[] = [
    {
        label: "Area Overview",
        fields: [
            { key: "AREA", label: "Area Name" },
            { key: "CITY", label: "City / Cities" },
            { key: "CITYCOUNT", label: "City Count", type: "count" },
            { key: "DISTRICT", label: "District(s)" },
            { key: "PINCODE", label: "Pincode(s)" },
            { key: "STATE", label: "State(s)" },
            { key: "TOTALCUSTOMERS", label: "Total Customers", type: "count" },
            { key: "ACTIVECUSTOMERS", label: "Active Customers", type: "count" },
            { key: "INACTIVECUSTOMERS", label: "Inactive Customers", type: "count" },
            { key: "UNKNOWNSTATUSCUSTOMERS", label: "Status Not Recorded", type: "count" },
        ],
    },
    {
        label: "Staff & Coverage",
        fields: [
            { key: "DSM", label: "DSM(s) — from Sales Activity" },
            { key: "RSM", label: "RSM(s)" },
            { key: "ASM", label: "ASM(s)" },
            { key: "ROUTECOUNT", label: "Routes Covered", type: "count" },
        ],
    },
    {
        label: "Party Type & Contact",
        fields: [
            { key: "BUYERCOUNT", label: "Buyers", type: "count" },
            { key: "SUPPLIERCOUNT", label: "Suppliers", type: "count" },
            { key: "PHONECOUNT", label: "With Phone", type: "count" },
            { key: "NOPHONECOUNT", label: "Without Phone", type: "count" },
        ],
    },
    {
        label: "Tax / Legal",
        fields: [
            { key: "GSTCOUNT", label: "Customers with GST", type: "count" },
            { key: "NOGSTCOUNT", label: "Customers without GST", type: "count" },
        ],
    },
    {
        label: "Financial",
        fields: [
            { key: "TOTALOUTSTANDING", label: "Total Outstanding (Dr)", type: "money" },
            { key: "TOTALCREDITBAL", label: "Total Advance (Cr)", type: "money" },
            { key: "NETBALANCE", label: "Net Balance", type: "balance" },
            { key: "TOTALCREDITLIMIT", label: "Total Credit Limit", type: "money" },
        ],
    },
    {
        label: "Sales & Purchase Summary",
        fields: [
            { key: "TOTALSALES", label: "Total Sales", type: "money" },
            { key: "SALECOUNT", label: "Sale Vouchers", type: "count" },
            { key: "LASTSALEDATE", label: "Last Sale Date", type: "date" },
            { key: "TOTALPURCHASE", label: "Total Purchase", type: "money" },
            { key: "PURCHASECOUNT", label: "Purchase Vouchers", type: "count" },
            { key: "LASTPURCHASEDATE", label: "Last Purchase Date", type: "date" },
        ],
    },
    {
        label: "Ledger",
        fields: [
            { key: "LEDGERDEBIT", label: "Ledger Debit", type: "money" },
            { key: "LEDGERCREDIT", label: "Ledger Credit", type: "money" },
            { key: "LEDGERBALANCE", label: "Ledger Balance", type: "balance" },
            { key: "LEDGERTXNCOUNT", label: "Ledger Entries", type: "count" },
            { key: "LASTLEDGERDATE", label: "Last Ledger Date", type: "date" },
        ],
    },
];

const ALL_FIELDS: FieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);

const DEFAULT_VISIBLE = [
    "AREA",
    "CITY",
    "DISTRICT",
    "PINCODE",
    "STATE",
    "TOTALCUSTOMERS",
    "ACTIVECUSTOMERS",
    "DSM",
    "TOTALOUTSTANDING",
    "TOTALSALES",
    "GSTCOUNT",
    "LASTSALEDATE",
];

/* ---------------------------------------------------------- */
/* KPI chip                                                      */
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

export default function AreaFullViewPage() {
    const [areas, setAreas] = useState<AreaRow[]>([]);
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
    const [city, setCity] = useState("");
    const [stateFilter, setStateFilter] = useState("");
    const [dsm, setDsm] = useState("");
    const [rsm, setRsm] = useState("");
    const [balanceStatus, setBalanceStatus] = useState("");
    const [gstStatus, setGstStatus] = useState("");
    const [salesActivity, setSalesActivity] = useState("");
    const [minCustomers, setMinCustomers] = useState("");
    const [maxCustomers, setMaxCustomers] = useState("");
    const [minBalance, setMinBalance] = useState("");
    const [maxBalance, setMaxBalance] = useState("");
    const [minSales, setMinSales] = useState("");
    const [maxSales, setMaxSales] = useState("");

    useEffect(() => {
        loadAreas();
    }, []);

    const loadAreas = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/master/area/");
            const data = await res.json();
            setAreas(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    const splitList = (v: any) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

    const cityOptions = useMemo(
        () => Array.from(new Set(areas.flatMap((a) => splitList(a.CITY)))).sort(),
        [areas]
    );
    const stateOptions = useMemo(
        () => Array.from(new Set(areas.flatMap((a) => splitList(a.STATE)))).sort(),
        [areas]
    );
    const dsmOptions = useMemo(
        () => Array.from(new Set(areas.flatMap((a) => splitList(a.DSM)))).sort(),
        [areas]
    );
    const rsmOptions = useMemo(
        () => Array.from(new Set(areas.flatMap((a) => splitList(a.RSM)))).sort(),
        [areas]
    );

    const resetFilters = () => {
        setSearch("");
        setCity("");
        setStateFilter("");
        setDsm("");
        setRsm("");
        setBalanceStatus("");
        setGstStatus("");
        setSalesActivity("");
        setMinCustomers("");
        setMaxCustomers("");
        setMinBalance("");
        setMaxBalance("");
        setMinSales("");
        setMaxSales("");
    };

    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return areas.filter((a) => {
            const custCount = Number(a.TOTALCUSTOMERS || 0);
            const netBal = Number(a.NETBALANCE || 0);
            const sales = Number(a.TOTALSALES || 0);
            const gstCount = Number(a.GSTCOUNT || 0);
            const noGstCount = Number(a.NOGSTCOUNT || 0);

            if (
                s &&
                !(
                    (a.AREA || "").toLowerCase().includes(s) ||
                    (a.CITY || "").toLowerCase().includes(s) ||
                    (a.DISTRICT || "").toLowerCase().includes(s) ||
                    (a.PINCODE || "").toLowerCase().includes(s) ||
                    (a.STATE || "").toLowerCase().includes(s) ||
                    (a.DSM || "").toLowerCase().includes(s) ||
                    (a.RSM || "").toLowerCase().includes(s)
                )
            )
                return false;

            if (city && !splitList(a.CITY).includes(city)) return false;
            if (stateFilter && !splitList(a.STATE).includes(stateFilter)) return false;
            if (dsm && !splitList(a.DSM).includes(dsm)) return false;
            if (rsm && !splitList(a.RSM).includes(rsm)) return false;

            if (balanceStatus === "outstanding" && !(netBal > 0)) return false;
            if (balanceStatus === "credit" && !(netBal < 0)) return false;
            if (balanceStatus === "zero" && netBal !== 0) return false;

            if (gstStatus === "full" && !(gstCount > 0 && noGstCount === 0)) return false;
            if (gstStatus === "partial" && !(gstCount > 0 && noGstCount > 0)) return false;
            if (gstStatus === "none" && !(gstCount === 0 && noGstCount > 0)) return false;

            if (salesActivity === "with_sales" && !(sales > 0)) return false;
            if (salesActivity === "no_sales" && sales > 0) return false;

            if (minCustomers && custCount < Number(minCustomers)) return false;
            if (maxCustomers && custCount > Number(maxCustomers)) return false;
            if (minBalance && netBal < Number(minBalance)) return false;
            if (maxBalance && netBal > Number(maxBalance)) return false;
            if (minSales && sales < Number(minSales)) return false;
            if (maxSales && sales > Number(maxSales)) return false;

            return true;
        });
    }, [
        areas,
        search,
        city,
        stateFilter,
        dsm,
        rsm,
        balanceStatus,
        gstStatus,
        salesActivity,
        minCustomers,
        maxCustomers,
        minBalance,
        maxBalance,
        minSales,
        maxSales,
    ]);

    const totalAreaCount = filtered.length;
    const totalCustomerCount = filtered.reduce((sum, a) => sum + Number(a.TOTALCUSTOMERS || 0), 0);
    const totalOutstanding = filtered.reduce((sum, a) => sum + Math.max(Number(a.NETBALANCE || 0), 0), 0);
    const totalSalesSum = filtered.reduce((sum, a) => sum + Number(a.TOTALSALES || 0), 0);

    const columns = useMemo(() => {
        const cols: ColumnDef<AreaRow, any>[] = ALL_FIELDS.map((f) =>
            columnHelper.accessor(f.key, {
                id: f.key,
                header: f.label,
                cell: (info) => {
                    const val = info.getValue();
                    if (f.type === "money") return money(val);
                    if (f.type === "date") return fmtDate(val);
                    if (f.type === "count") return Number(val || 0).toLocaleString("en-IN");
                    if (f.type === "balance") {
                        const n = Number(val || 0);
                        return (
                            <span
                                className={`inline-flex items-center justify-center min-w-[5rem] px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${balanceClasses(
                                    n
                                )}`}
                            >
                                {money(n)}
                            </span>
                        );
                    }
                    if (f.key === "AREA") {
                        const source = info.row.original.AREASOURCE;
                        return (
                            <span className="inline-flex items-center gap-1">
                                {val || "—"}
                                {source && source !== "area" && (
                                    <span
                                        title={AREA_SOURCE_LABEL[source] || source}
                                        className="text-[10px] text-amber-500 font-semibold"
                                    >
                                        ~
                                    </span>
                                )}
                            </span>
                        );
                    }
                    return val === undefined || val === null || val === "" ? "-" : String(val);
                },
            })
        );

        cols.push(
            columnHelper.display({
                id: "action",
                header: "Action",
                cell: (info) => (
                    <div className="flex gap-1.5">
                        <Link
                            href={`/dashboard/master/area-master/${encodeURIComponent(info.row.original.AREA)}`}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-white/50 text-[#343872] ring-1 ring-[#343872]/30 hover:bg-[#343872] hover:text-white hover:ring-[#343872] transition-all duration-200"
                        >
                            <FaEye size={10} /> View
                        </Link>
                    </div>
                ),
            })
        );

        return cols;
    }, []);

    const numericTypes = new Set(
        ALL_FIELDS.filter((f) => f.type === "money" || f.type === "balance" || f.type === "count").map((f) => f.key)
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
        XLSX.utils.book_append_sheet(wb, ws, "Areas");
        XLSX.writeFile(wb, `area_master_export_${Date.now()}.xlsx`);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <StatChip label="Areas" value={totalAreaCount} tone="bg-blue-500" />
                <StatChip label="Customers Covered" value={totalCustomerCount} tone="bg-emerald-500" />
                <StatChip label="Outstanding" value={money(totalOutstanding)} tone="bg-rose-500" />
                <StatChip label="Total Sales" value={money(totalSalesSum)} tone="bg-indigo-500" />
                <StatChip label="Columns shown" value={`${visibleCount}/${ALL_FIELDS.length}`} tone="bg-violet-500" />
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#343872]/90 to-indigo-600/85 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white">
                            <FaMapMarkedAlt size={14} />
                        </div>
                        <h5 className="text-sm font-semibold text-white tracking-wide m-0">Area Master — Full View</h5>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full sm:w-56">
                            <FaSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search area, city, district, pincode, state..."
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

                {showFilters && (
                    <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-3 bg-white/40 border-b border-gray-200/60">
                        <select value={city} onChange={(e) => setCity(e.target.value)} className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none">
                            <option value="">All Cities</option>
                            {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none">
                            <option value="">All States</option>
                            {stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <select value={dsm} onChange={(e) => setDsm(e.target.value)} className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none">
                            <option value="">All DSM</option>
                            {dsmOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>

                        <select value={rsm} onChange={(e) => setRsm(e.target.value)} className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none">
                            <option value="">All RSM</option>
                            {rsmOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>

                        <select value={balanceStatus} onChange={(e) => setBalanceStatus(e.target.value)} className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none">
                            <option value="">All Balances</option>
                            <option value="outstanding">Net Outstanding (Dr)</option>
                            <option value="credit">Net Advance (Cr)</option>
                            <option value="zero">Net Zero</option>
                        </select>

                        <select value={gstStatus} onChange={(e) => setGstStatus(e.target.value)} className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none">
                            <option value="">GST — All</option>
                            <option value="full">Fully GST Compliant</option>
                            <option value="partial">Partially Compliant</option>
                            <option value="none">No GST at all</option>
                        </select>

                        <select value={salesActivity} onChange={(e) => setSalesActivity(e.target.value)} className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none">
                            <option value="">Sales Activity — All</option>
                            <option value="with_sales">Has Sales</option>
                            <option value="no_sales">No Sales Yet</option>
                        </select>

                        <input type="number" value={minCustomers} onChange={(e) => setMinCustomers(e.target.value)} placeholder="Min Customers" className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none" />
                        <input type="number" value={maxCustomers} onChange={(e) => setMaxCustomers(e.target.value)} placeholder="Max Customers" className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none" />
                        <input type="number" value={minBalance} onChange={(e) => setMinBalance(e.target.value)} placeholder="Min Net Balance" className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none" />
                        <input type="number" value={maxBalance} onChange={(e) => setMaxBalance(e.target.value)} placeholder="Max Net Balance" className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none" />
                        <input type="number" value={minSales} onChange={(e) => setMinSales(e.target.value)} placeholder="Min Total Sales" className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none" />
                        <input type="number" value={maxSales} onChange={(e) => setMaxSales(e.target.value)} placeholder="Max Total Sales" className="text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 outline-none" />

                        <button onClick={resetFilters} className="flex items-center justify-center gap-1.5 text-xs rounded-lg px-2 py-1.5 bg-white/70 ring-1 ring-gray-200 text-gray-600 hover:bg-gray-100 transition-all duration-200">
                            <FaUndo size={10} /> Reset
                        </button>
                    </div>
                )}

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
                                                className={`select-none cursor-pointer whitespace-nowrap px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide ${isNumeric ? "text-right" : "text-left"} hover:text-gray-700 transition-colors`}
                                            >
                                                <span className={`inline-flex items-center gap-1 ${isNumeric ? "flex-row-reverse" : ""}`}>
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {header.column.getCanSort() &&
                                                        (sortDir === "asc" ? <FaSortUp size={11} className="text-slate-500" /> :
                                                            sortDir === "desc" ? <FaSortDown size={11} className="text-slate-500" /> :
                                                                <FaSort size={10} className="text-gray-300" />)}
                                                </span>
                                            </th>
                                        );
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={visibleCount + 1} className="text-center text-gray-400 py-10 text-sm">Loading areas...</td></tr>
                            ) : table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <tr key={row.id} className="border-b border-gray-100/70 last:border-0 hover:bg-white/50 transition-colors duration-200">
                                        {row.getVisibleCells().map((cell) => {
                                            const isNumeric = numericTypes.has(cell.column.id);
                                            return (
                                                <td key={cell.id} className={`px-4 py-2.5 whitespace-nowrap text-gray-600 tabular-nums ${isNumeric ? "text-right" : "text-left"}`}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={visibleCount + 1} className="text-center text-gray-400 py-10 text-sm">No areas found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200/60 bg-white/30 text-xs text-gray-500">
                    <span>
                        Page <span className="font-semibold text-gray-700">{table.getState().pagination.pageIndex + 1}</span> of{" "}
                        <span className="font-semibold text-gray-700">{table.getPageCount() || 1}</span> &middot;{" "}
                        {table.getFilteredRowModel().rows.length} results
                    </span>

                    <div className="flex items-center gap-1.5">
                        <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:ring-[#343872] disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200">First</button>
                        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:ring-[#343872] disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"><FaChevronLeft size={10} /></button>
                        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:ring-[#343872] disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200"><FaChevronRight size={10} /></button>
                        <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="px-2.5 h-7 rounded-lg text-xs font-medium bg-white/50 ring-1 ring-gray-200 text-gray-600 hover:bg-[#343872] hover:text-white hover:ring-[#343872] disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-gray-600 transition-all duration-200">Last</button>
                    </div>
                </div>
            </div>

            {showColumnPicker && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowColumnPicker(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#343872] to-indigo-600 shrink-0">
                            <div className="flex items-center gap-2 text-white">
                                <FaColumns size={14} />
                                <h5 className="text-sm font-semibold tracking-wide m-0">
                                    Show / Hide Columns
                                    <span className="ml-2 text-xs font-normal text-white/70">{visibleCount} of {ALL_FIELDS.length} selected</span>
                                </h5>
                            </div>
                            <button onClick={() => setShowColumnPicker(false)} className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"><FaTimes size={12} /></button>
                        </div>

                        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                            <span className="text-[11px] text-gray-400">Tick the columns you want in the table</span>
                            <div className="flex gap-3">
                                <button onClick={() => setColumnVisibility(Object.fromEntries(ALL_FIELDS.map((f) => [f.key, true])) as VisibilityState)} className="text-xs font-medium text-blue-600 hover:underline">Select all</button>
                                <button onClick={() => setColumnVisibility(Object.fromEntries(ALL_FIELDS.map((f) => [f.key, false])) as VisibilityState)} className="text-xs font-medium text-gray-500 hover:underline">Clear all</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                            {FIELD_GROUPS.map((group) => (
                                <div key={group.label}>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{group.label}</p>
                                        <div className="flex gap-2 text-[11px]">
                                            <button onClick={() => toggleGroup(group, true)} className="text-blue-500 hover:underline">all</button>
                                            <span className="text-gray-300">/</span>
                                            <button onClick={() => toggleGroup(group, false)} className="text-gray-400 hover:underline">none</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                                        {group.fields.map((f) => (
                                            <label key={f.key} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                                                <input type="checkbox" checked={!!columnVisibility[f.key]} onChange={(e) => setColumnVisibility((prev) => ({ ...prev, [f.key]: e.target.checked }))} className="h-3.5 w-3.5 rounded border-gray-300 text-[#343872] focus:ring-[#343872]" />
                                                {f.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
                            <button onClick={() => setShowColumnPicker(false)} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#343872] text-white hover:bg-[#2a2d5c] transition-colors">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}