"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import {
  FaHandshake, FaFileInvoice, FaMoneyBillWave, FaChartLine,
  FaExclamationTriangle, FaClock, FaUsers, FaSyncAlt,
  FaRupeeSign, FaBuilding, FaCalendarAlt, FaInfoCircle,
} from "react-icons/fa";
import SalesVsCollectionFilterBar, { FilterState } from "./SalesVsCollectionFilterBar";
import SalesVsCollectionCharts from "./SalesVsCollectionCharts";
import SalesVsCollectionIndiaMap from "./SalesVsCollectionIndiaMap";
import SalesVsCollectionTables from "./SalesVsCollectionTables";
import ChartDetailModal from "./ChartDetailModal";

interface Summary {
  totalSalesOrderValue: number;
  totalSalesReturns: number;
  netSales: number;
  totalCollections: number;
  realizationRate: number;
  pendingBalance: number;
  overdueAmount: number;
  watchlistAmount: number;
  avgDSO: number;
  salesOrderCount: number;
  customerCount: number;
}

const emptyData = {
  summary: {
    totalSalesOrderValue: 0,
    totalSalesReturns: 0,
    netSales: 0,
    totalCollections: 0,
    realizationRate: 0,
    pendingBalance: 0,
    overdueAmount: 0,
    watchlistAmount: 0,
    avgDSO: 0,
    salesOrderCount: 0,
    customerCount: 0,
  } as Summary,
  trendData: [],
  paymentModes: [],
  agingBuckets: [],
  divisionPerformance: [],
  customerLedger: [],
  orderLedger: [],
  stateData: [],
  availableAreas: [] as string[],
  availableAsms: [] as string[],
  availableDivisions: [] as string[],
  radarScores: {
    realizationScore: 0,
    velocityScore: 0,
    agingHealthScore: 0,
    coverageScore: 0,
    regularityScore: 0,
    returnScore: 0,
  },
  meta: { startDate: "", endDate: "" },
};

function fmt(v: number) {
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)} K`;
  return `₹${(v || 0).toLocaleString("en-IN")}`;
}

export default function SalesVsCollectionDashboard() {
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [filters, setFilters] = useState<FilterState>({
    companyId: selectedCompany?._id || "ALL",
    fyId: (selectedFY as any)?._id || "ALL",
    range: "this_fy",
    startDate: "",
    endDate: "",
    state: "ALL",
    area: "ALL",
    asm: "ALL",
    hq: "ALL",
    customer: "",
    customerGrade: "ALL",
    division: "ALL",
    status: "ALL",
    paymentMode: "ALL",
    agingBucket: "ALL",
    search: "",
  });
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [kpiModal, setKpiModal] = useState<{ open: boolean; data: any } | null>(null);

  const buildApiUrl = useCallback((f: FilterState, state?: string | null) => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    if (state) p.set("state", state);
    return `/api/analytics/sales-vs-collection?${p.toString()}`;
  }, []);

  const fetchData = useCallback(
    async (f: FilterState, state?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(buildApiUrl(f, state));
        const json = await res.json();
        if (json.success) {
          setData(json);
          setLastUpdated(new Date());
        } else {
          setError(json.error || "Failed to load data");
        }
      } catch (e: any) {
        setError(e.message || "Network error");
      } finally {
        setLoading(false);
      }
    },
    [buildApiUrl]
  );

  // 1. Initial Load on Mount
  useEffect(() => {
    fetchData(filters, selectedState);
  }, []); // eslint-disable-line

  // 2. Sync if user changes company or FY in top global navigation
  useEffect(() => {
    const newCompanyId = selectedCompany?._id || "ALL";
    const newFyId = (selectedFY as any)?._id || "ALL";
    setFilters((prev) => {
      // Only re-fetch if something actually changed
      if (prev.companyId === newCompanyId && prev.fyId === newFyId) return prev;
      const next = { ...prev, companyId: newCompanyId, fyId: newFyId };
      fetchData(next, selectedState);
      return next;
    });
  }, [selectedCompany, selectedFY]); // eslint-disable-line

  // Auto-fetch immediately whenever any filter changes
  const handleFiltersChange = (f: FilterState) => {
    setFilters(f);
    fetchData(f, selectedState);
  };

  const handleApply = () => fetchData(filters, selectedState);
  const handleStateSelect = (state: string | null) => {
    setSelectedState(state);
    const updated = { ...filters, state: state || "ALL" };
    setFilters(updated);
    fetchData(updated, state);
  };

  const { summary } = data;

  const KPI_CARDS = [
    {
      label: "Total Sales Orders",
      value: fmt(summary.totalSalesOrderValue),
      sub: `${summary.salesOrderCount} invoices raised`,
      icon: <FaFileInvoice />,
      color: "indigo",
      kpiData: {
        label: "Total Sales Order Value",
        value: fmt(summary.totalSalesOrderValue),
        formula: "SUM(FINAL) WHERE TYPE = 'S'",
        description:
          "Gross value of all sales orders raised in the selected period. Excludes returns (SR/R) and void (TYPE=V) entries.",
      },
    },
    {
      label: "Total Collections",
      value: fmt(summary.totalCollections),
      sub: "Total cash received",
      icon: <FaMoneyBillWave />,
      color: "emerald",
      kpiData: {
        label: "Total Collections",
        value: fmt(summary.totalCollections),
        formula: "SUM(CREDIT) WHERE BOOK IN ('R','P') — GL Receipts",
        description:
          "Total cash/bank inflows received from customers during the period from GL Receipt (BOOK=R/P) ledger entries.",
      },
    },
    {
      label: "Collection Realization",
      value: `${summary.realizationRate}%`,
      sub: `${
        summary.realizationRate >= 90
          ? "🟢 Excellent Realization"
          : summary.realizationRate >= 75
          ? "🔵 Good Recovery"
          : summary.realizationRate >= 60
          ? "🟡 Moderate Performance"
          : "🔴 Low / Action Required"
      }`,
      icon: <FaChartLine />,
      color:
        summary.realizationRate >= 90
          ? "emerald"
          : summary.realizationRate >= 70
          ? "amber"
          : "rose",
      kpiData: {
        label: "Collection Realization Rate",
        value: `${summary.realizationRate}%`,
        formula: "(Total Collections / Net Sales) × 100",
        description:
          "Percentage of net sales value that has been recovered as cash. Target: ≥90%. Below 70% indicates high collection risk.",
      },
    },
    {
      label: "Pending Balance",
      value: fmt(summary.pendingBalance),
      sub: "Receivables outstanding",
      icon: <FaRupeeSign />,
      color: "amber",
      kpiData: {
        label: "Pending / Outstanding Balance",
        value: fmt(summary.pendingBalance),
        formula: "Net Sales − Total Collections",
        description:
          "Total receivable amount yet to be collected from customers. Includes all unpaid and partially paid invoices.",
      },
    },
    {
      label: "Overdue Risk (>60d)",
      value: fmt(summary.overdueAmount),
      sub:
        summary.overdueAmount > 0
          ? "⚠️ Requires immediate follow-up"
          : "✅ No overdue debt",
      icon: <FaExclamationTriangle />,
      color: summary.overdueAmount > 0 ? "rose" : "emerald",
      kpiData: {
        label: "Overdue Risk Amount",
        value: fmt(summary.overdueAmount),
        formula: "Outstanding WHERE DDATE < Today − 60 days",
        description:
          "Receivable amount outstanding for more than 60 days. High overdue indicates collection breakdown and potential bad debt risk.",
      },
    },
    {
      label: "Avg DSO & Accounts",
      value: `${summary.avgDSO}d | ${summary.customerCount}`,
      sub: "Days Sales Outstanding | Customers",
      icon: <FaClock />,
      color:
        summary.avgDSO <= 30
          ? "emerald"
          : summary.avgDSO <= 60
          ? "amber"
          : "rose",
      kpiData: {
        label: "Average DSO & Active Customer Count",
        value: `${summary.avgDSO} days`,
        formula: "DSO = (Outstanding / Net Sales) × 365",
        description: `Average number of days it takes to collect after an invoice is raised. Target: ≤30 days. Currently ${summary.avgDSO} days across ${summary.customerCount} active customer accounts.`,
      },
    },
  ];

  const COLOR_MAP: Record<
    string,
    {
      bgLight: string;
      badge: string;
      text: string;
      accent: string;
    }
  > = {
    indigo: {
      bgLight: "bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600/50 shadow-sm hover:shadow-md",
      badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
      text: "text-indigo-600 dark:text-indigo-400",
      accent: "from-indigo-500 to-indigo-600",
    },
    emerald: {
      bgLight: "bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-600/50 shadow-sm hover:shadow-md",
      badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      text: "text-emerald-600 dark:text-emerald-400",
      accent: "from-emerald-500 to-emerald-600",
    },
    amber: {
      bgLight: "bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-600/50 shadow-sm hover:shadow-md",
      badge: "bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
      text: "text-amber-600 dark:text-amber-400",
      accent: "from-amber-500 to-amber-600",
    },
    rose: {
      bgLight: "bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-600/50 shadow-sm hover:shadow-md",
      badge: "bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
      text: "text-rose-600 dark:text-rose-400",
      accent: "from-rose-500 to-rose-600",
    },
    sky: {
      bgLight: "bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-600/50 shadow-sm hover:shadow-md",
      badge: "bg-sky-50 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
      text: "text-sky-600 dark:text-sky-400",
      accent: "from-sky-500 to-sky-600",
    },
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-3 sm:p-5 md:p-8 space-y-6 transition-colors">
      {/* ── HEADER BANNER ───────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl border border-slate-800 text-white p-5 sm:p-7 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg shrink-0">
              <FaHandshake className="text-emerald-400 text-2xl" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold text-emerald-300 border border-white/10 mb-1.5">
                <FaChartLine className="text-emerald-400" />
                <span>Sales Orders vs Collections Analytics</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
                Sales Orders vs Collection Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-0.5 leading-relaxed">
                Multi-dimensional insights: realization rate, aging health, territory hierarchy & state-wise distribution.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {selectedCompany?.companyName && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-sky-200 text-xs font-semibold">
                <FaBuilding className="text-[10px] text-sky-400" />
                <span>{selectedCompany.companyName}</span>
              </div>
            )}
            {(selectedFY as any)?.fyName && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-violet-200 text-xs font-semibold">
                <FaCalendarAlt className="text-[10px] text-violet-400" />
                <span>{(selectedFY as any).fyName}</span>
              </div>
            )}
            {selectedState && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold">
                <span>📍 {selectedState}</span>
                <button
                  type="button"
                  onClick={() => handleStateSelect(null)}
                  className="ml-1 text-amber-300 hover:text-white transition-colors cursor-pointer"
                  title="Clear state filter"
                >
                  ✕
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleApply}
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ── FILTER BAR ───────────────────────────────────────── */}
      <SalesVsCollectionFilterBar
        filters={filters}
        onChange={handleFiltersChange}
        onRefresh={handleApply}
        loading={loading}
        availableAreas={data.availableAreas || []}
        availableAsms={data.availableAsms || []}
        availableDivisions={data.availableDivisions || []}
      />

      {/* ── EMPTY DATA NOTICE IF CURRENT FILTER HAS 0 RECORDS ─────── */}
      {!loading && summary.totalSalesOrderValue === 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-base shrink-0">
              <FaInfoCircle />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                No Transactions Recorded For Selected Filter
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                The selected company account or date range currently has 0 invoices. Click below to view all company records.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const allF: FilterState = {
                ...filters,
                companyId: "ALL",
                fyId: "ALL",
                range: "this_fy",
                state: "ALL",
                area: "ALL",
                asm: "ALL",
                hq: "ALL",
                customerGrade: "ALL",
                status: "ALL",
                paymentMode: "ALL",
                search: "",
              };
              setFilters(allF);
              fetchData(allF, null);
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition-all cursor-pointer shadow-md active:scale-95"
          >
            Show All Company Records
          </button>
        </div>
      )}

      {/* ── KPI SCORECARD RIBBON ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {KPI_CARDS.map((card, i) => {
          const c = COLOR_MAP[card.color] || COLOR_MAP.indigo;
          return (
            <button
              key={i}
              onClick={() => setKpiModal({ open: true, data: card.kpiData })}
              className={`group relative ${c.bgLight} border rounded-3xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 cursor-pointer`}
            >
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <FaInfoCircle className="text-slate-400 hover:text-slate-600 text-xs" />
              </div>
              <div
                className={`w-9 h-9 rounded-2xl ${c.badge} flex items-center justify-center text-sm mb-2.5 transition-transform group-hover:scale-110`}
              >
                {card.icon}
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 leading-tight truncate">
                {card.label}
              </p>
              {loading ? (
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-24 mb-1" />
              ) : (
                <p className="text-slate-900 dark:text-slate-50 text-base sm:text-lg font-black leading-tight tracking-tight">
                  {card.value}
                </p>
              )}
              <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-1 leading-tight font-medium truncate">
                {card.sub}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── INDIA MAP SECTION ────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-slate-900 dark:text-slate-100 font-extrabold text-base sm:text-lg flex items-center gap-2">
              <span>🗺️ India State Collection Heatmap</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Click any state on the map or leaderboard to filter all dashboard metrics. Color scale indicates collection efficiency (%).
            </p>
          </div>
          {lastUpdated && (
            <span className="text-slate-400 text-[11px] font-medium shrink-0">
              Synced at {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <SalesVsCollectionIndiaMap
          stateData={data.stateData}
          selectedState={selectedState}
          onSelectState={handleStateSelect}
          loading={loading}
        />
      </div>

      {/* ── CHARTS SECTION ───────────────────────────────────── */}
      <SalesVsCollectionCharts
        trendData={data.trendData}
        paymentModes={data.paymentModes}
        agingBuckets={data.agingBuckets}
        divisionPerformance={data.divisionPerformance}
        radarScores={data.radarScores}
        loading={loading}
      />

      {/* ── TABLES & REPORT SECTION ──────────────────────────── */}
      <SalesVsCollectionTables
        customerLedger={data.customerLedger}
        orderLedger={data.orderLedger}
        trendData={data.trendData}
        stateData={data.stateData}
        loading={loading}
      />

      {/* KPI Detail Modal */}
      {kpiModal?.open && (
        <ChartDetailModal
          isOpen={kpiModal.open}
          onClose={() => setKpiModal(null)}
          type="kpi"
          data={kpiModal.data}
          title={kpiModal.data?.label}
        />
      )}
    </div>
  );
}
