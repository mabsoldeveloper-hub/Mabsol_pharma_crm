"use client";

import { useEffect, useState, useMemo } from "react";
import {
  FaUsers,
  FaUserCheck,
  FaWallet,
  FaCoins,
  FaSearch,
  FaFileExcel,
  FaFilePdf,
  FaPrint,
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaBuilding,
  FaMapMarkerAlt,
  FaArrowRight,
  FaTimes,
  FaEye,
  FaPhone,
  FaEnvelope,
  FaIdCard,
  FaCreditCard,
} from "react-icons/fa";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import AddCustomerModal from "@/components/customer/AddCustomerModal";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";

type MrTerritoryInfo = {
  isMrRestricted: boolean;
  territories: any[];
  allowedCompanyCodes: string[];
};

interface Customer {
  _id?: string;
  CODEP?: string;
  PARNAM?: string;
  MAILNAM?: string;
  PHONE1?: string;
  PHONE?: string;
  CITY?: string;
  GSTNO?: string;
  DLNO?: string;
  BALANCE?: number;
  CREDIT?: number;
  STATUS?: string;
  REF?: string;
  GROUPNAME?: string;
  SCODE?: string;
  state1?: string;
  ZONE?: string;
  Area?: string;
  station?: string;
  route?: string;
  mr?: string;
  NAME?: string;
  [key: string]: any;
}

function formatCurrency(n: number) {
  return (
    "₹" +
    Number(n || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })
  );
}

function displayValue(value: any) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "-";
  }
  return String(value);
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "brand" | "positive" | "negative" | "neutral";
}) {
  const toneMap = {
    brand: { text: "text-[#343872]", glow: "from-[#343872]/30" },
    positive: { text: "text-emerald-700", glow: "from-emerald-400/30" },
    negative: { text: "text-rose-700", glow: "from-rose-400/30" },
    neutral: { text: "text-slate-700", glow: "from-slate-400/25" },
  }[tone];

  return (
    <div className="group relative isolate overflow-hidden rounded-2xl bg-white/50 backdrop-blur-xl backdrop-saturate-150 border border-white/60 ring-1 ring-white/40 shadow-[0_8px_32px_rgba(52,56,114,0.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(52,56,114,0.16)] p-5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent" />
      <div
        className={`pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${toneMap.glow} to-transparent blur-2xl opacity-70 transition-all duration-700 group-hover:scale-125`}
      />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 mb-1 tracking-wide">
            {label}
          </p>
          <h3 className="text-2xl font-bold text-slate-800 truncate">
            {value}
          </h3>
        </div>
        <div
          className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-white/70 backdrop-blur-md border border-white/70 shadow-sm ${toneMap.text}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  icon,
  full = false,
}: {
  label: string;
  value: any;
  icon?: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200/70 bg-white/70 p-3 ${
        full ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon ? <span className="text-[#343872]">{icon}</span> : null}
        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
          {label}
        </p>
      </div>
      <p className="text-sm font-semibold text-slate-800 break-words">
        {displayValue(value)}
      </p>
    </div>
  );
}

const columnHelper = createColumnHelper<Customer>();

export default function CustomerPage() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Inactive" | "Outstanding"
  >("All");
  const [groupFilter, setGroupFilter] = useState("All");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [mrTerritoryInfo, setMrTerritoryInfo] =
    useState<MrTerritoryInfo | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  useEffect(() => {
    loadMrTerritoryInfo();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [selectedCompany?._id, selectedFY?._id]);

  useEffect(() => {
    if (!selectedCustomer) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedCustomer(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedCustomer]);

  const loadMrTerritoryInfo = async () => {
    try {
      const res = await fetch("/api/mr-territory/my-territories");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMrTerritoryInfo({
            isMrRestricted: json.isMrRestricted,
            territories: json.territories || [],
            allowedCompanyCodes: json.allowedCompanyCodes || [],
          });
        }
      }
    } catch {
      // Silently ignore
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedCompany?._id) {
        params.set("companyId", selectedCompany._id);
      }

      if (selectedFY?._id) {
        params.set("fyId", selectedFY._id);
      }

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading customers:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const groups = useMemo(() => {
    const arr = customers
      .map((c) => c.GROUPNAME)
      .filter(Boolean) as string[];

    return ["All", ...Array.from(new Set(arr))];
  }, [customers]);

  const preFiltered = useMemo(() => {
    return customers.filter((c) => {
      let matchStatus = true;

      if (statusFilter === "Active") {
        matchStatus = c.STATUS === "Y";
      } else if (statusFilter === "Inactive") {
        matchStatus = c.STATUS !== "Y";
      } else if (statusFilter === "Outstanding") {
        matchStatus = Number(c.BALANCE) > 0;
      }

      const matchGroup =
        groupFilter === "All" || c.GROUPNAME === groupFilter;

      return matchStatus && matchGroup;
    });
  }, [customers, statusFilter, groupFilter]);

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.STATUS === "Y").length;
  const totalOutstanding = customers.reduce(
    (sum, c) => sum + (Number(c.BALANCE) || 0),
    0
  );
  const totalCredit = customers.reduce(
    (sum, c) => sum + (Number(c.CREDIT) || 0),
    0
  );

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "sno",
        header: "#",
        cell: (info) => info.row.index + 1,
        size: 48,
      }),

      columnHelper.accessor("PARNAM", {
        header: "Customer Name",
        cell: (info) => {
          const customer = info.row.original;

          return (
            <button
              type="button"
              onClick={() => setSelectedCustomer(customer)}
              className="text-left group"
              title="View party details"
            >
              <div className="font-semibold text-[#343872] group-hover:underline">
                {info.getValue() || "-"}
              </div>
              <div className="text-xs text-slate-500">
                {customer.MAILNAM || "No mail name"}
              </div>
            </button>
          );
        },
      }),

      columnHelper.accessor((row) => row.state1 || row.REF, {
        id: "State",
        header: "State",
        cell: (info) => info.getValue() || "-",
      }),

      columnHelper.accessor("ZONE", {
        header: "ZONE",
        cell: (info) => info.getValue() || "-",
      }),

      columnHelper.accessor("CITY", {
        header: "City/DISTRICT",
        cell: (info) => info.getValue() || "-",
      }),

      columnHelper.accessor("Area", {
        header: "Area",
        cell: (info) => info.getValue() || "-",
      }),

      columnHelper.accessor("station", {
        header: "Station",
        cell: (info) => info.getValue() || "-",
      }),

      columnHelper.accessor("route", {
        header: "Route",
        cell: (info) => info.getValue() || "-",
      }),

      columnHelper.accessor("mr", {
        header: "MR",
        cell: (info) => info.getValue() || "-",
      }),

      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const customer = info.row.original;

          return (
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setSelectedCustomer(customer)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#343872] text-white text-xs font-medium px-3 py-1.5 hover:bg-[#2a2d5c] transition-colors"
              >
                <FaEye size={11} /> View
              </button>
              <button
                type="button"
                className="rounded-lg bg-amber-100/80 text-amber-700 text-xs font-medium px-3 py-1.5 hover:bg-amber-200/80 transition-colors"
              >
                Save
              </button>
            </div>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: preFiltered,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-4 sm:p-6">
      {/* ==================== MR TERRITORY BANNER ==================== */}
      {mrTerritoryInfo?.isMrRestricted && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm mb-4">
          <div className="flex-shrink-0 mt-0.5">
            <FaMapMarkerAlt size={16} className="text-amber-500" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800 mb-0.5">
              Territory Restricted View
            </p>

            <p className="text-[11px] text-amber-700 leading-relaxed">
              Aap sirf apni assigned territory ke customers dekh sakte hain.
              {mrTerritoryInfo.territories.length > 0 && (
                <>
                  {" "}Assigned:{" "}
                  {Array.from(
                    new Set(
                      mrTerritoryInfo.territories.map(
                        (t) => t.companyName || t.companyCode
                      )
                    )
                  ).join(", ")}
                </>
              )}
            </p>

            {mrTerritoryInfo.territories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {mrTerritoryInfo.territories.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium border border-amber-200"
                  >
                    <FaBuilding size={8} />
                    {t.companyName || t.companyCode}

                    {t.divisionName ? (
                      <>
                        {" "}
                        <FaArrowRight
                          size={7}
                          className="opacity-50"
                        />{" "}
                        {t.divisionName}
                      </>
                    ) : null}

                    {t.subDivisionName ? (
                      <>
                        {" "}
                        <FaArrowRight
                          size={7}
                          className="opacity-50"
                        />{" "}
                        {t.subDivisionName}
                      </>
                    ) : null}

                    {t.categoryName ? (
                      <>
                        {" "}
                        <FaArrowRight
                          size={7}
                          className="opacity-50"
                        />{" "}
                        {t.categoryName}
                      </>
                    ) : null}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Customer Master
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage all customers from one place
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#343872] text-white text-sm font-medium px-4 py-2.5 shadow-[0_4px_14px_rgba(52,56,114,0.35)] hover:bg-[#2a2d5c] transition-colors cursor-pointer"
        >
          <FaPlus size={12} /> Add Customer
        </button>
      </div>

      {/* KPI Cards */}
      {/*
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Customers" value={totalCustomers} icon={<FaUsers size={18} />} tone="brand" />
        <KpiCard label="Active Customers" value={activeCustomers} icon={<FaUserCheck size={18} />} tone="positive" />
        <KpiCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={<FaWallet size={18} />} tone="negative" />
        <KpiCard label="Total Credit" value={formatCurrency(totalCredit)} icon={<FaCoins size={18} />} tone="positive" />
      </div>
      */}

      {/* Search & Filter bar */}
      <div className="relative isolate overflow-hidden rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-4 mb-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />

        <div className="relative flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <FaSearch
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Search by name, code, GST or phone..."
              className="w-full rounded-xl bg-white/70 border border-white/70 pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#343872]/40"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as
                  | "All"
                  | "Active"
                  | "Inactive"
                  | "Outstanding"
              )
            }
            className="rounded-xl bg-white/70 border border-white/70 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#343872]/40"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Outstanding">Outstanding</option>
          </select>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="rounded-xl bg-white/70 border border-white/70 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#343872]/40 max-w-[220px]"
          >
            {groups.map((group) => (
              <option key={group} value={group}>
                {group === "All" ? "All Groups" : group}
              </option>
            ))}
          </select>

          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/90 text-white text-xs font-medium px-3.5 py-2.5 hover:bg-emerald-700 transition-colors"
            >
              <FaFileExcel size={12} /> Excel
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600/90 text-white text-xs font-medium px-3.5 py-2.5 hover:bg-rose-700 transition-colors"
            >
              <FaFilePdf size={12} /> PDF
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-600/90 text-white text-xs font-medium px-3.5 py-2.5 hover:bg-slate-700 transition-colors"
            >
              <FaPrint size={12} /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative isolate overflow-hidden rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />

        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="bg-gradient-to-r from-[#343872] to-[#4a4f9e]"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="px-4 py-3 text-left text-xs font-semibold text-white/90 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}

                        {header.column.getCanSort() &&
                          (header.column.getIsSorted() === "asc" ? (
                            <FaSortUp size={11} />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <FaSortDown size={11} />
                          ) : (
                            <FaSort size={10} className="opacity-50" />
                          ))}
                      </div>
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
                    className="text-center py-10 text-slate-500"
                  >
                    Loading customers...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-10 text-slate-400"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-t border-white/60 hover:bg-[#343872]/5 transition-colors ${
                      i % 2 === 0 ? "bg-white/20" : "bg-white/5"
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 align-middle text-slate-700"
                      >
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

        {/* Pagination */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/60 px-4 py-3">
          <div className="text-xs text-slate-500">
            Showing{" "}
            <b className="text-slate-700">
              {table.getRowModel().rows.length === 0
                ? 0
                : table.getState().pagination.pageIndex *
                    table.getState().pagination.pageSize +
                  1}
              –
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </b>{" "}
            of{" "}
            <b className="text-slate-700">
              {table.getFilteredRowModel().rows.length}
            </b>{" "}
            customers
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="inline-flex items-center gap-1 rounded-lg bg-white/70 border border-white/70 text-xs font-medium px-3 py-1.5 text-slate-600 disabled:opacity-40 hover:bg-white transition-colors"
            >
              <FaChevronLeft size={10} /> Prev
            </button>

            <span className="text-xs text-slate-500 px-1">
              Page{" "}
              <b className="text-slate-700">
                {table.getState().pagination.pageIndex + 1}
              </b>{" "}
              of <b className="text-slate-700">{table.getPageCount() || 1}</b>
            </span>

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="inline-flex items-center gap-1 rounded-lg bg-white/70 border border-white/70 text-xs font-medium px-3 py-1.5 text-slate-600 disabled:opacity-40 hover:bg-white transition-colors"
            >
              Next <FaChevronRight size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== PARTY DETAILS MODAL ==================== */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedCustomer(null);
            }
          }}
        >
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-white/70">
            {/* Modal header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#343872] to-[#4a4f9e] px-5 sm:px-6 py-5 text-white">
              <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-semibold mb-1">
                    Party Details
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold truncate">
                    {displayValue(selectedCustomer.PARNAM)}
                  </h3>
                  <p className="text-xs text-white/70 mt-1">
                    Code: {displayValue(selectedCustomer.CODEP)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <FaTimes size={14} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto max-h-[calc(90vh-92px)] p-5 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
              {/* Quick financial summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-500">
                    Balance
                  </p>
                  <p className="text-xl font-bold text-rose-700 mt-1">
                    {formatCurrency(Number(selectedCustomer.BALANCE) || 0)}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600">
                    Credit
                  </p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">
                    {formatCurrency(Number(selectedCustomer.CREDIT) || 0)}
                  </p>
                </div>

                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-indigo-500">
                    Status
                  </p>
                  <p className="text-xl font-bold text-[#343872] mt-1">
                    {selectedCustomer.STATUS === "Y" ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailItem
                  label="Party Name"
                  value={selectedCustomer.PARNAM}
                  icon={<FaUsers size={12} />}
                />
                <DetailItem
                  label="Party Code"
                  value={selectedCustomer.CODEP}
                  icon={<FaIdCard size={12} />}
                />
                <DetailItem
                  label="Mail Name"
                  value={selectedCustomer.MAILNAM}
                  icon={<FaEnvelope size={12} />}
                />
                <DetailItem
                  label="Phone"
                  value={selectedCustomer.PHONE1 || selectedCustomer.PHONE}
                  icon={<FaPhone size={12} />}
                />
                <DetailItem
                  label="GST No."
                  value={selectedCustomer.GSTNO}
                  icon={<FaIdCard size={12} />}
                />
                <DetailItem
                  label="DL No."
                  value={selectedCustomer.DLNO}
                  icon={<FaIdCard size={12} />}
                />
                <DetailItem
                  label="Group"
                  value={selectedCustomer.GROUPNAME}
                  icon={<FaBuilding size={12} />}
                />
                <DetailItem
                  label="SCODE"
                  value={selectedCustomer.SCODE}
                  icon={<FaIdCard size={12} />}
                />
                <DetailItem
                  label="State"
                  value={selectedCustomer.state1 || selectedCustomer.REF}
                  icon={<FaMapMarkerAlt size={12} />}
                />
                <DetailItem
                  label="Zone"
                  value={selectedCustomer.ZONE}
                  icon={<FaMapMarkerAlt size={12} />}
                />
                <DetailItem
                  label="City / District"
                  value={selectedCustomer.CITY}
                  icon={<FaMapMarkerAlt size={12} />}
                />
                <DetailItem
                  label="Area"
                  value={selectedCustomer.Area}
                  icon={<FaMapMarkerAlt size={12} />}
                />
                <DetailItem
                  label="Station"
                  value={selectedCustomer.station}
                  icon={<FaMapMarkerAlt size={12} />}
                />
                <DetailItem
                  label="Route"
                  value={selectedCustomer.route}
                  icon={<FaMapMarkerAlt size={12} />}
                />
                <DetailItem
                  label="MR"
                  value={selectedCustomer.mr}
                  icon={<FaUsers size={12} />}
                />
                <DetailItem
                  label="Reference"
                  value={selectedCustomer.REF}
                  icon={<FaIdCard size={12} />}
                />
              </div>

              {/* Extra fields already returned by API */}
              <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FaCreditCard className="text-[#343872]" size={13} />
                  <h4 className="text-sm font-bold text-slate-800">
                    Account Information
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <DetailItem
                    label="Balance"
                    value={formatCurrency(Number(selectedCustomer.BALANCE) || 0)}
                  />
                  <DetailItem
                    label="Credit Limit"
                    value={formatCurrency(Number(selectedCustomer.CREDIT) || 0)}
                  />
                  <DetailItem
                    label="Customer ID"
                    value={selectedCustomer._id}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadCustomers}
      />
    </div>
  );
}
