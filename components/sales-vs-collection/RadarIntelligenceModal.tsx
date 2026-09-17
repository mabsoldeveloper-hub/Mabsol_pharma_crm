"use client";
import React from "react";
import {
  FaTimes,
  FaBullseye,
  FaLightbulb,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface RadarIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: {
    realizationScore: number;
    velocityScore: number;
    agingHealthScore: number;
    coverageScore: number;
    regularityScore: number;
    returnScore: number;
  };
}

const METRICS = [
  {
    key: "realizationScore",
    label: "Order Realization Rate",
    description:
      "Percentage of invoiced trade sales value recovered as confirmed cash receipt.",
    formula: "(Total Collections / Total Invoiced) × 100",
    recommendation: (s: number) =>
      s >= 85
        ? "Excellent collection realization rate. Maintain existing credit tenure & discount policies."
        : s >= 70
        ? "Good performance, but target 90%+ by tightening credit limits on Grade C & D customer accounts."
        : "Critical collection deficit. Initiate immediate automated payment reminder sequences & MR visits.",
    icon: "💰",
    color: "#6366f1",
  },
  {
    key: "velocityScore",
    label: "Collection Velocity (DSO)",
    description:
      "Turnaround speed of invoice liquidation. Higher velocity denotes accelerated cash flow.",
    formula: "100 − min(100, DSO in Days)",
    recommendation: (s: number) =>
      s >= 80
        ? "Inflow velocity is optimal. Receivables are clearing well within the allowable credit period."
        : s >= 60
        ? "Moderate velocity. Introduce 1.5–2% prompt payment cash discounts (CD) on 10-day settlements."
        : "Sluggish collection cycle. Enforce mandatory Post-Dated Cheques (PDC) before dispatching new orders.",
    icon: "⚡",
    color: "#10b981",
  },
  {
    key: "agingHealthScore",
    label: "Receivable Aging Health",
    description:
      "Weighted health score against aging overdue balances (>60 and >90 days).",
    formula: "100 − (Overdue >60d / Total Outstanding × 100)",
    recommendation: (s: number) =>
      s >= 85
        ? "Aging profile is robust with minimal aged receivables. Very low default exposure."
        : s >= 65
        ? "Moderate aging strain detected. Prioritize recovery sweeps on the 61–90 day aging bucket."
        : "Elevated bad-debt risk. Escalate 90+ day overdue accounts to legal notice / senior sales audit.",
    icon: "⏳",
    color: "#f59e0b",
  },
  {
    key: "coverageScore",
    label: "Customer Account Coverage",
    description:
      "Proportion of total active mapped customer accounts actively remitting payments.",
    formula: "(Paying Customer Accounts / Total Active Accounts) × 100",
    recommendation: (s: number) =>
      s >= 80
        ? "Broad customer participation. Strong ledger engagement across the chemist/stockist network."
        : s >= 60
        ? "Fair coverage. Re-engage dormant stockists and follow up on unbilled active chemist parties."
        : "Narrow remittance base. Schedule territory reviews with area MRs to revive stalled customer accounts.",
    icon: "👥",
    color: "#0ea5e9",
  },
  {
    key: "regularityScore",
    label: "Monthly Inflow Regularity",
    description:
      "Month-on-month consistency and predictability of customer collection inflows.",
    formula: "(Months with Collections / Total Elapsed Months) × 100",
    recommendation: (s: number) =>
      s >= 85
        ? "High cash predictability. Inflows occur regularly with negligible monthly dry spells."
        : s >= 65
        ? "Slight periodic volatility in receipts. Align invoice due dates with customer payment cycles."
        : "Irregular collection patterns. Implement structured monthly ledger clearing agreements.",
    icon: "📅",
    color: "#8b5cf6",
  },
  {
    key: "returnScore",
    label: "Return Minimization Quality",
    description:
      "Inverse penalty of sales returns (SR/R) against gross order turnover.",
    formula: "100 − (Total Sales Returns / Gross Sales × 100)",
    recommendation: (s: number) =>
      s >= 88
        ? "Low return rate. Batch quality, expiry tracking, and dispatch accuracy are well-managed."
        : s >= 72
        ? "Moderate return volume. Review short-expiry returns and breakages during transport."
        : "Elevated returns impacting net realization. Audit top returned SKUs and near-expiry dispatches.",
    icon: "↩️",
    color: "#f43f5e",
  },
];

export default function RadarIntelligenceModal({
  isOpen,
  onClose,
  scores,
}: RadarIntelligenceModalProps) {
  if (!isOpen) return null;

  const radarData = METRICS.map((m) => ({
    subject: m.label,
    score: (scores as any)[m.key] ?? 70,
    benchmark: 85,
  }));

  const overallScore = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) /
      Object.values(scores).length
  );

  const getScoreColor = (s: number) =>
    s >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : s >= 60
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  const getScoreBg = (s: number) =>
    s >= 80
      ? "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30"
      : s >= 60
      ? "bg-amber-50/70 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30"
      : "bg-rose-50/70 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30";

  const getScoreIcon = (s: number) =>
    s >= 80 ? (
      <FaCheckCircle className="text-emerald-500 text-sm" />
    ) : (
      <FaExclamationTriangle className="text-amber-500 text-sm" />
    );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-850/95 backdrop-blur-md p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-100 dark:border-violet-500/30 shadow-sm">
              <FaBullseye className="text-lg" />
            </div>
            <div>
              <h2 className="text-slate-900 dark:text-slate-50 font-black text-base sm:text-lg">
                6-Axis Performance Radar Intelligence
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                Comprehensive collection health evaluation with actionable steps
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                Overall Index
              </p>
              <p className={`text-2xl font-black ${getScoreColor(overallScore)}`}>
                {overallScore}
                <span className="text-xs font-bold text-slate-400">/100</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-500/20 flex items-center justify-center transition-all cursor-pointer"
            >
              <FaTimes size={12} />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Radar Chart & Score Progress Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
              <h3 className="text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider mb-2">
                📊 Multi-Axis Radar Profile
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#64748b", fontSize: 10.5, fontWeight: 600 }}
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
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                    formatter={(v: any) => [`${v}/100`, "Score"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Score Breakdown Sliders */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
              <h3 className="text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider mb-3">
                🎯 Metric Score Breakdown
              </h3>
              {METRICS.map((m) => {
                const score = (scores as any)[m.key] ?? 70;
                return (
                  <div key={m.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                      </span>
                      <span className={`font-black ${getScoreColor(score)}`}>
                        {score}/100
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, score)}%`,
                          background: m.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deep Dives & Recommendations Grid */}
          <div>
            <h3 className="text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider mb-3">
              🔍 Metric Intelligence & Practical Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {METRICS.map((m) => {
                const score = (scores as any)[m.key] ?? 70;
                return (
                  <div
                    key={m.key}
                    className={`p-4 rounded-2xl border ${getScoreBg(
                      score
                    )} space-y-2.5`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{m.icon}</span>
                        <span className="text-slate-900 dark:text-slate-100 font-black text-sm">
                          {m.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getScoreIcon(score)}
                        <span
                          className={`font-black text-base ${getScoreColor(
                            score
                          )}`}
                        >
                          {score}/100
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium">
                      {m.description}
                    </p>
                    <div className="bg-white/90 dark:bg-slate-900/60 rounded-xl p-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                      📐 {m.formula}
                    </div>
                    <div className="flex gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <FaLightbulb className="text-amber-500 mt-0.5 shrink-0 text-xs" />
                      <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed font-medium">
                        {m.recommendation(score)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
