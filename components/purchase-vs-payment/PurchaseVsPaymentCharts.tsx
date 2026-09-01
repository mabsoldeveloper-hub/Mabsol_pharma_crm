"use client";
import React, { useState, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
} from "recharts";
import ChartDetailModal from "@/components/sales-vs-collection/ChartDetailModal";
import RadarPayabilityModal from "./RadarPayabilityModal";

function fmt(v: number) {
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)} K`;
  return `₹${(v || 0).toLocaleString("en-IN")}`;
}

const PIE_COLORS = ["#f59e0b", "#10b981", "#f97316", "#0ea5e9", "#8b5cf6", "#ef4444", "#06b6d4"];
const AGING_COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444"];

interface ChartsProps {
  trendData: any[];
  paymentModes: any[];
  agingBuckets: any[];
  divisionPerformance: any[];
  radarScores: {
    paymentScore: number;
    velocityScore: number;
    agingHealthScore: number;
    coverageScore: number;
    regularityScore: number;
    returnScore: number;
  };
  loading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 shadow-xl text-xs">
      <p className="text-slate-800 dark:text-slate-200 font-bold mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: p.fill || p.stroke || p.color }}
              />
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                {p.name}:
              </span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {p.name?.includes("%") ? `${p.value}%` : fmt(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PurchaseVsPaymentCharts({
  trendData,
  paymentModes,
  agingBuckets,
  divisionPerformance,
  radarScores,
  loading,
}: ChartsProps) {
  const [activeChartTab, setActiveChartTab] = useState<
    "trend" | "modes" | "aging" | "division" | "radar"
  >("trend");
  const [viewMode, setViewMode] = useState<"monthly" | "quarterly">("monthly");
  const [radarModalOpen, setRadarModalOpen] = useState(false);
  const [modalState, setModalState] = useState<{
    open: boolean;
    type: any;
    data: any;
    title: string;
  }>({
    open: false,
    type: null,
    data: null,
    title: "",
  });

  const openModal = (type: any, data: any, title: string) =>
    setModalState({ open: true, type, data, title });
  const closeModal = () =>
    setModalState({ open: false, type: null, data: null, title: "" });

  // ── Monthly vs Quarterly Aggregation ──────────
  const displayTrendData = useMemo(() => {
    if (viewMode === "quarterly") {
      const quarters: Record<
        string,
        {
          label: string;
          quarter: string;
          salesValue: number;
          collectedValue: number;
          orderCount: number;
        }
      > = {
        Q1: { label: "Q1 (Apr–Jun)", quarter: "Q1", salesValue: 0, collectedValue: 0, orderCount: 0 },
        Q2: { label: "Q2 (Jul–Sep)", quarter: "Q2", salesValue: 0, collectedValue: 0, orderCount: 0 },
        Q3: { label: "Q3 (Oct–Dec)", quarter: "Q3", salesValue: 0, collectedValue: 0, orderCount: 0 },
        Q4: { label: "Q4 (Jan–Mar)", quarter: "Q4", salesValue: 0, collectedValue: 0, orderCount: 0 },
      };

      trendData.forEach((item) => {
        const monthStr = item.month || "";
        const parts = monthStr.split("-");
        const monthNum = parts.length > 1 ? parseInt(parts[1], 10) : 0;
        let qKey = "Q1";
        if (monthNum >= 4 && monthNum <= 6) qKey = "Q1";
        else if (monthNum >= 7 && monthNum <= 9) qKey = "Q2";
        else if (monthNum >= 10 && monthNum <= 12) qKey = "Q3";
        else if (monthNum >= 1 && monthNum <= 3) qKey = "Q4";

        quarters[qKey].salesValue += item.salesValue || 0;
        quarters[qKey].collectedValue += item.collectedValue || 0;
        quarters[qKey].orderCount += item.orderCount || 0;
      });

      return Object.values(quarters).map((q) => {
        const gap = Math.max(0, q.salesValue - q.collectedValue);
        const realizationRate =
          q.salesValue > 0
            ? Math.min(100, Math.round((q.collectedValue / q.salesValue) * 100 * 10) / 10)
            : 0;
        return {
          month: q.label,
          displayLabel: q.label,
          salesValue: Math.round(q.salesValue),
          collectedValue: Math.round(q.collectedValue),
          gap: Math.round(gap),
          realizationRate,
          orderCount: q.orderCount,
        };
      });
    }

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    return trendData.map((item) => {
      let formattedLabel = item.month;
      if (item.month && item.month.includes("-")) {
        const [y, m] = item.month.split("-");
        const mIdx = parseInt(m, 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          formattedLabel = `${monthNames[mIdx]} ${y}`;
        }
      }
      return {
        ...item,
        displayLabel: formattedLabel,
      };
    });
  }, [trendData, viewMode]);

  const radarData = [
    { subject: "Payment Rate", score: radarScores.paymentScore, benchmark: 90 },
    { subject: "Pay Velocity", score: radarScores.velocityScore, benchmark: 85 },
    { subject: "Aging Health", score: radarScores.agingHealthScore, benchmark: 85 },
    { subject: "Coverage", score: radarScores.coverageScore, benchmark: 85 },
    { subject: "Regularity", score: radarScores.regularityScore, benchmark: 85 },
    { subject: "Return Score", score: radarScores.returnScore, benchmark: 95 },
  ];

  const overallHealth = Math.round(
    (radarScores.paymentScore +
      radarScores.velocityScore +
      radarScores.agingHealthScore +
      radarScores.coverageScore +
      radarScores.regularityScore +
      radarScores.returnScore) /
      6
  );

  const tabs = [
    { key: "trend", label: "📈 Monthly Trend" },
    { key: "modes", label: "💳 Payment Modes" },
    { key: "aging", label: "⏳ Aging Buckets" },
    { key: "division", label: "🏭 By Division" },
    { key: "radar", label: "🎯 Health Radar" },
  ] as const;

  const Skeleton = () => (
    <div className="h-64 flex items-center justify-center">
      <div className="space-y-3 w-full px-4">
        {[80, 60, 90, 40, 70].map((w, i) => (
          <div
            key={i}
            className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden transition-all">
        {/* Tab Switcher Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 py-3.5 bg-amber-50/30 dark:bg-amber-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveChartTab(t.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeChartTab === t.key
                    ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600/40"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeChartTab === "trend" && (
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
              {["monthly", "quarterly"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer ${
                    viewMode === m
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          {/* ── TAB 1: COMPOSE TREND GRAPH (DUAL Y-AXIS) ───────────────── */}
          {activeChartTab === "trend" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>📈 Purchase Bills vs Payments Made Trend</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Dual-axis comparison. Click any monthly bar for invoice & payment audit.
                  </p>
                </div>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
                  Left: ₹ Amount | Right: Payment %
                </span>
              </div>

              {loading ? (
                <Skeleton />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart
                    data={displayTrendData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="purchaseAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="displayLabel"
                      tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    {/* LEFT Y-AXIS (FOR AMOUNTS IN RUPEES) */}
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(v) => fmt(v)}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      width={68}
                    />
                    {/* RIGHT Y-AXIS (FOR PAYMENT RATE 0-100%) */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 10, fill: "#8b5cf6", fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 600, paddingTop: 8 }} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="salesValue"
                      name="Purchase Bills"
                      fill="url(#purchaseAreaGradient)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="collectedValue"
                      name="Payments Made"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      barSize={viewMode === "quarterly" ? 32 : 18}
                      onClick={(d: any) =>
                        openModal(
                          "month",
                          d,
                          `${d.displayLabel || d.month} — Purchase & Payment Outflow Details`
                        )
                      }
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="realizationRate"
                      name="Payment Rate %"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#8b5cf6" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* ── TAB 2: PAYMENT MODES ───────────────────────────────────── */}
          {activeChartTab === "modes" && (
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>💳 Payment Instrument Distribution</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Breakdown by ERP voucher book (Payment Voucher, Settlement, Debit Note, Advance, Journal)
                </p>
              </div>

              {loading ? (
                <Skeleton />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div
                    className="cursor-pointer"
                    onClick={() =>
                      openModal("paymentMode", paymentModes, "Payment Instruments & Vouchers")
                    }
                  >
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={paymentModes}
                          dataKey="amount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          innerRadius={52}
                          paddingAngle={3}
                          label={({ name, percent }: { name?: string; percent?: number }) =>
                            `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                          }
                          labelLine={false}
                          onClick={(d: any) =>
                            openModal("paymentMode", [d], `${d.name} — Voucher Details`)
                          }
                        >
                          {paymentModes.map((_: any, i: number) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                              className="cursor-pointer hover:opacity-85 transition-opacity"
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    {paymentModes.map((m: any, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          openModal("paymentMode", [m], `${m.name} — Voucher Details`)
                        }
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-amber-300 dark:hover:border-amber-600 transition-all cursor-pointer text-left shadow-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                              {m.name}
                            </span>
                            <span className="text-[10.5px] text-slate-500">
                              {m.count} transactions recorded
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                            {fmt(m.amount)}
                          </p>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                            Inspect →
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: AGING BUCKETS ───────────────────────────────────── */}
          {activeChartTab === "aging" && (
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>⏳ Supplier Payable Aging Buckets</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Outstanding bills segmented by days overdue. Click any bucket for invoice drilldown.
                </p>
              </div>

              {loading ? (
                <Skeleton />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={agingBuckets}
                      margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => fmt(v)}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                        width={65}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="amount"
                        name="Payable Amount"
                        radius={[8, 8, 0, 0]}
                        onClick={(d: any) =>
                          openModal(
                            "aging",
                            d,
                            `${d.label} Days — Supplier Payables Aging Drilldown`
                          )
                        }
                        className="cursor-pointer hover:opacity-85 transition-opacity"
                      >
                        {agingBuckets.map((_: any, i: number) => (
                          <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="space-y-2.5">
                    {agingBuckets.map((b: any, i: number) => {
                      const labels: Record<string, string> = {
                        "0-30": "Current — Healthy",
                        "31-60": "Moderate Risk",
                        "61-90": "Watchlist — Action",
                        "90+": "Overdue Payable Risk",
                      };
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            openModal(
                              "aging",
                              b,
                              `${b.label} Days — Supplier Payables Aging Drilldown`
                            )
                          }
                          className="w-full flex items-center justify-between p-3.5 rounded-2xl text-left cursor-pointer transition-all hover:scale-[1.01]"
                          style={{
                            background: `${AGING_COLORS[i]}15`,
                            border: `1px solid ${AGING_COLORS[i]}35`,
                          }}
                        >
                          <div>
                            <p
                              className="text-xs font-black"
                              style={{ color: AGING_COLORS[i] }}
                            >
                              {b.label} Days Outstanding
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                              {labels[b.label] || b.label}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                              {fmt(b.amount)}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold">
                              {b.count} Bills →
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: DIVISION PERFORMANCE ───────────────────────────── */}
          {activeChartTab === "division" && (
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>🏭 Division-wise Purchase & Payment Breakdown</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Purchase volume vs payments categorized by pharma division
                </p>
              </div>

              {loading ? (
                <Skeleton />
              ) : (
                <ResponsiveContainer width="100%" height={290}>
                  <BarChart
                    data={divisionPerformance.slice(0, 12)}
                    layout="vertical"
                    margin={{ top: 5, right: 25, left: 50, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => fmt(v)}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="division"
                      tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                      width={65}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                    <Bar
                      dataKey="salesValue"
                      name="Purchase Bills"
                      fill="#f59e0b"
                      radius={[0, 6, 6, 0]}
                      barSize={14}
                      onClick={(d: any) =>
                        openModal("division", d, `Division ${d.division} — Purchase Audit`)
                      }
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                    />
                    <Bar
                      dataKey="collectedValue"
                      name="Payments Made"
                      fill="#10b981"
                      radius={[0, 6, 6, 0]}
                      barSize={14}
                      onClick={(d: any) =>
                        openModal("division", d, `Division ${d.division} — Payment Outflow Audit`)
                      }
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* ── TAB 5: HEALTH RADAR ────────────────────────────────────── */}
          {activeChartTab === "radar" && (
            <div>
              <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>🎯 Payability Health & Velocity Radar</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Click anywhere on the radar to open full 6-axis AI intelligence report
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRadarModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-2 self-start sm:self-auto"
                >
                  <span>Score: {overallHealth}/100</span>
                  <span>View Details →</span>
                </button>
              </div>

              {loading ? (
                <Skeleton />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div
                    className="cursor-pointer"
                    onClick={() => setRadarModalOpen(true)}
                    title="Click to view metric formulas & recommendations"
                  >
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(148,163,184,0.25)" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={{ fontSize: 9, fill: "#94a3b8" }}
                        />
                        <Radar
                          name="Current Score"
                          dataKey="score"
                          stroke="#f59e0b"
                          fill="#f59e0b"
                          fillOpacity={0.3}
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: "#f59e0b" }}
                        />
                        <Radar
                          name="Target Benchmark (90)"
                          dataKey="benchmark"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.06}
                          strokeWidth={2}
                          strokeDasharray="4 4"
                        />
                        <Tooltip formatter={(v: any) => `${v}/100`} />
                        <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2.5">
                    {radarData.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRadarModalOpen(true)}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-amber-300 transition-all text-left cursor-pointer shadow-xs"
                      >
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {d.subject}
                        </span>
                        <div className="flex items-center gap-2.5">
                          <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${d.score}%`,
                                background:
                                  d.score >= 80 ? "#10b981" : d.score >= 60 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100 w-10 text-right">
                            {d.score}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart Detail Drilldown Modal */}
      {modalState.open && (
        <ChartDetailModal
          isOpen={modalState.open}
          onClose={closeModal}
          type={modalState.type}
          data={modalState.data}
          title={modalState.title}
        />
      )}

      {/* Radar Intelligence Modal */}
      {radarModalOpen && (
        <RadarPayabilityModal
          isOpen={radarModalOpen}
          onClose={() => setRadarModalOpen(false)}
          radarScores={radarScores}
        />
      )}
    </>
  );
}
