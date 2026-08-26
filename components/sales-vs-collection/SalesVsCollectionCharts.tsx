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
import ChartDetailModal from "./ChartDetailModal";
import RadarIntelligenceModal from "./RadarIntelligenceModal";

function fmt(v: number) {
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)} K`;
  return `₹${(v || 0).toLocaleString("en-IN")}`;
}

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6", "#f97316"];
const AGING_COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444"];

interface ChartsProps {
  trendData: any[];
  paymentModes: any[];
  agingBuckets: any[];
  divisionPerformance: any[];
  radarScores: {
    realizationScore: number;
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-xl text-xs">
      <p className="text-slate-800 dark:text-slate-200 font-bold mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-3">
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

export default function SalesVsCollectionCharts({
  trendData,
  paymentModes,
  agingBuckets,
  divisionPerformance,
  radarScores,
  loading,
}: ChartsProps) {
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
  const [radarOpen, setRadarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"monthly" | "quarterly">("monthly");

  const openModal = (type: any, data: any, title: string) =>
    setModalState({ open: true, type, data, title });
  const closeModal = () =>
    setModalState({ open: false, type: null, data: null, title: "" });

  // ── Dynamic Monthly vs Quarterly Data Aggregation ──────────
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
        Q1: {
          label: "Q1 (Apr–Jun)",
          quarter: "Q1",
          salesValue: 0,
          collectedValue: 0,
          orderCount: 0,
        },
        Q2: {
          label: "Q2 (Jul–Sep)",
          quarter: "Q2",
          salesValue: 0,
          collectedValue: 0,
          orderCount: 0,
        },
        Q3: {
          label: "Q3 (Oct–Dec)",
          quarter: "Q3",
          salesValue: 0,
          collectedValue: 0,
          orderCount: 0,
        },
        Q4: {
          label: "Q4 (Jan–Mar)",
          quarter: "Q4",
          salesValue: 0,
          collectedValue: 0,
          orderCount: 0,
        },
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

    // Monthly view: format month string (e.g. "2026-04" -> "Apr 2026")
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
    { subject: "Realization", score: radarScores.realizationScore, benchmark: 85 },
    { subject: "Velocity", score: radarScores.velocityScore, benchmark: 85 },
    { subject: "Aging Health", score: radarScores.agingHealthScore, benchmark: 85 },
    { subject: "Coverage", score: radarScores.coverageScore, benchmark: 85 },
    { subject: "Regularity", score: radarScores.regularityScore, benchmark: 85 },
    { subject: "Returns", score: radarScores.returnScore, benchmark: 85 },
  ];

  const overallScore = Math.round(
    Object.values(radarScores).reduce((a, b) => a + b, 0) / 6
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-3xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── ROW 1: Radar + Payment Mode Donut ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* 6-Axis Radar Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-slate-900 dark:text-slate-100 font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>⚡ Performance Radar</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                6-axis collection health & velocity scoring
              </p>
            </div>
            <button
              onClick={() => setRadarOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-500/20 hover:bg-violet-100 dark:hover:bg-violet-500/30 text-violet-700 dark:text-violet-300 text-xs font-bold border border-violet-200 dark:border-violet-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Score: {overallScore}/100</span>
              <span>→</span>
            </button>
          </div>

          <div
            className="cursor-pointer py-2"
            onClick={() => setRadarOpen(true)}
            title="Click to view metric formulas & recommendations"
          >
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: "#94a3b8", fontSize: 9 }}
                />
                <Radar
                  name="Current Score"
                  dataKey="score"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.3}
                  strokeWidth={2.5}
                />
                <Radar
                  name="Target Benchmark (85)"
                  dataKey="benchmark"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.06}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: 16,
                    color: "#0f172a",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  formatter={(v: any) => [`${v}/100`, "Score"]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-[11px] text-center font-medium">
            💡 Click radar chart to inspect individual formulas & actionable recommendations
          </p>
        </div>

        {/* Payment Mode Donut */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-slate-900 dark:text-slate-100 font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>💳 Collection by Payment Instrument</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Click any slice for voucher-level clearing audit
              </p>
            </div>

            <div
              className="cursor-pointer my-1"
              onClick={() =>
                openModal(
                  "paymentMode",
                  paymentModes,
                  "Payment Instruments — Receipts Breakdown"
                )
              }
            >
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={paymentModes}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    onClick={(d: any) =>
                      openModal(
                        "paymentMode",
                        [d],
                        `${d.name} — Receipt Vouchers`
                      )
                    }
                  >
                    {paymentModes.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        className="cursor-pointer hover:opacity-85 transition-opacity"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: 16,
                      color: "#0f172a",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                    formatter={(v: any) => [fmt(v), "Collected"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 mt-2">
            {paymentModes.slice(0, 4).map((m: any, i: number) => (
              <button
                key={i}
                onClick={() =>
                  openModal(
                    "paymentMode",
                    [m],
                    `${m.name} — Receipt Vouchers`
                  )
                }
                className="w-full flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-semibold group-hover:text-slate-900 dark:group-hover:text-white">
                    {m.name}
                  </span>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100">
                  {fmt(m.amount)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 2: Composed Trend Graph ─── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-slate-900 dark:text-slate-100 font-extrabold text-sm sm:text-base flex items-center gap-2">
              <span>📈 Sales Orders vs Collection Inflow Trend</span>
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Dual-axis time series comparison. Click any monthly bar for daily cash gap details.
            </p>
          </div>
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {["monthly", "quarterly"].map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  viewMode === m
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={displayTrendData}
            margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="gapGradientLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="displayLabel"
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(v) => fmt(v)}
              width={65}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(v) => `${v}%`}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="gap"
              fill="url(#gapGradientLight)"
              stroke="transparent"
              name="Cash Gap"
            />
            <Bar
              yAxisId="left"
              dataKey="salesValue"
              fill="#6366f1"
              radius={[6, 6, 0, 0]}
              name="Sales Orders"
              barSize={viewMode === "quarterly" ? 32 : 18}
              onClick={(d: any) =>
                openModal(
                  "month",
                  d,
                  `${d.displayLabel || d.month} — Sales vs Collection Details`
                )
              }
              className="cursor-pointer hover:opacity-85 transition-opacity"
            />
            <Bar
              yAxisId="left"
              dataKey="collectedValue"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
              name="Collections Received"
              barSize={viewMode === "quarterly" ? 32 : 18}
              onClick={(d: any) =>
                openModal(
                  "month",
                  d,
                  `${d.displayLabel || d.month} — Collection Inflow Details`
                )
              }
              className="cursor-pointer hover:opacity-85 transition-opacity"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="realizationRate"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 4, fill: "#f59e0b" }}
              name="Realization %"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── ROW 3: Division Bar + Aging Donut ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Division Performance Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-slate-900 dark:text-slate-100 font-extrabold text-sm sm:text-base flex items-center gap-2">
              <span>💊 Division-Wise Sales & Recovery</span>
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Click any division bar for granular product-level contribution
            </p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={divisionPerformance}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 55, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickFormatter={(v) => fmt(v)}
              />
              <YAxis
                type="category"
                dataKey="division"
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "10px", color: "#64748b" }} />
              <Bar
                dataKey="salesValue"
                fill="#6366f1"
                radius={[0, 4, 4, 0]}
                name="Sales"
                barSize={12}
                onClick={(d: any) =>
                  openModal("division", [d], `${d.division} — Division Detail`)
                }
                className="cursor-pointer hover:opacity-85"
              />
              <Bar
                dataKey="collectedValue"
                fill="#10b981"
                radius={[0, 4, 4, 0]}
                name="Collected"
                barSize={12}
                onClick={(d: any) =>
                  openModal("division", [d], `${d.division} — Division Detail`)
                }
                className="cursor-pointer hover:opacity-85"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Aging Risk Donut */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-slate-900 dark:text-slate-100 font-extrabold text-sm sm:text-base flex items-center gap-2">
              <span>⏳ Outstanding Aging Risk Profile</span>
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Click any bucket to inspect customer debt watchlist
            </p>
          </div>
          <div
            className="cursor-pointer"
            onClick={() =>
              openModal(
                "aging",
                agingBuckets,
                "Aging Risk — Overdue Accounts Review"
              )
            }
          >
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={agingBuckets}
                  dataKey="amount"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  onClick={(d: any) =>
                    openModal(
                      "aging",
                      [d],
                      `${d.label} Days — Overdue Accounts`
                    )
                  }
                >
                  {agingBuckets.map((_, i) => (
                    <Cell
                      key={i}
                      fill={AGING_COLORS[i % AGING_COLORS.length]}
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: 16,
                    color: "#0f172a",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  formatter={(v: any) => [fmt(v), "Outstanding"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {agingBuckets.map((b: any, i: number) => (
              <button
                key={i}
                onClick={() =>
                  openModal(
                    "aging",
                    [b],
                    `${b.label} Days — Aging Detail`
                  )
                }
                className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: AGING_COLORS[i % AGING_COLORS.length] }}
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    {b.label}d
                  </span>
                </div>
                <div className="text-right font-extrabold text-slate-900 dark:text-slate-100">
                  {fmt(b.amount || 0)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ChartDetailModal
        isOpen={modalState.open}
        onClose={closeModal}
        type={modalState.type}
        data={modalState.data}
        title={modalState.title}
      />
      <RadarIntelligenceModal
        isOpen={radarOpen}
        onClose={() => setRadarOpen(false)}
        scores={radarScores}
      />
    </div>
  );
}
