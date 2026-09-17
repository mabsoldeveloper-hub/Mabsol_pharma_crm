"use client";
import React from "react";
import {
  FaTimes,
  FaBrain,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartLine,
  FaLightbulb,
  FaShieldAlt,
} from "react-icons/fa";

interface RadarPayabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  radarScores: {
    paymentScore: number;
    velocityScore: number;
    agingHealthScore: number;
    coverageScore: number;
    regularityScore: number;
    returnScore: number;
  };
}

export default function RadarPayabilityModal({
  isOpen,
  onClose,
  radarScores,
}: RadarPayabilityModalProps) {
  if (!isOpen) return null;

  const overall = Math.round(
    (radarScores.paymentScore +
      radarScores.velocityScore +
      radarScores.agingHealthScore +
      radarScores.coverageScore +
      radarScores.regularityScore +
      radarScores.returnScore) /
      6
  );

  const METRICS = [
    {
      name: "Payment Rate Score",
      score: radarScores.paymentScore,
      benchmark: "≥ 90%",
      formula: "(Total Payments Made / Net Purchases) × 100",
      description:
        "Measures the percentage of supplier purchases that have been settled through cash, bank, or adjustment vouchers.",
      action:
        radarScores.paymentScore >= 90
          ? "Excellent supplier payability discipline. Keep maintaining timely disbursements."
          : "Disbursement lag detected. Prioritize clearing high-value vendor payables to prevent supply interruptions.",
    },
    {
      name: "Payment Velocity (DPO)",
      score: radarScores.velocityScore,
      benchmark: "≤ 45 Days",
      formula: "100 − Average Days Payable Outstanding (DPO)",
      description:
        "Speed at which purchase bills are settled from the invoice date. Faster clearance yields higher credit reputation.",
      action:
        radarScores.velocityScore >= 75
          ? "Vendor turnaround time is well within industry benchmarks."
          : "Review pending purchase bills older than 45 days for expedited clearance.",
    },
    {
      name: "Aging Health Score",
      score: radarScores.agingHealthScore,
      benchmark: "0% Overdue (>60d)",
      formula: "100 − (Overdue Payables >60d / Total Payable) × 100",
      description:
        "Integrity of the payables aging pipeline. A high score means minimal or zero overdue debt on supplier ledgers.",
      action:
        radarScores.agingHealthScore >= 80
          ? "Clean aging bucket profile. Zero toxic vendor liabilities."
          : "High concentration of debt in 60+ days bucket. Negotiate payment scheduling with affected creditors.",
    },
    {
      name: "Supplier Coverage Score",
      score: radarScores.coverageScore,
      benchmark: "≥ 85% Active",
      formula: "(Suppliers with Payments / Total Active Suppliers) × 100",
      description:
        "Percentage of active vendor relationships that have received regular settlements during the period.",
      action:
        radarScores.coverageScore >= 80
          ? "Broad vendor settlement coverage across all divisions."
          : "Certain vendor accounts have zero recent settlements. Verify unknocked purchase bills.",
    },
    {
      name: "Monthly Regularity Score",
      score: radarScores.regularityScore,
      benchmark: "100% Consistency",
      formula: "(Months with Positive Outflow / Total Active Months) × 100",
      description:
        "Consistency of monthly outflow dispatches without sudden payment gaps or fiscal freezes.",
      action:
        radarScores.regularityScore >= 80
          ? "Stable Month-on-Month cash outflow cycle."
          : "Discontinuous payment months observed. Smooth out weekly payment allocations.",
    },
    {
      name: "Purchase Return Score",
      score: radarScores.returnScore,
      benchmark: "≤ 3% Returns",
      formula: "100 − (Total Purchase Returns / Gross Purchase) × 100",
      description:
        "Quality control metric measuring rate of goods returned (PR/B vouchers) back to vendors due to damage or expiry.",
      action:
        radarScores.returnScore >= 95
          ? "Minimal return volume. Incoming stock quality is high."
          : "High return volume observed. Conduct quality audit with principal manufacturers.",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-amber-900 via-orange-900 to-amber-950 p-5 sm:p-6 text-white border-b border-amber-800 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-amber-300 text-xl shrink-0">
              <FaBrain />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-amber-200">
                  AI Financial Matrix
                </span>
                <span
                  className="text-xs font-black px-2.5 py-0.5 rounded-full"
                  style={{
                    background:
                      overall >= 80 ? "#10b98130" : overall >= 60 ? "#f59e0b30" : "#ef444430",
                    color: overall >= 80 ? "#34d399" : overall >= 60 ? "#fbbf24" : "#f87171",
                  }}
                >
                  Composite Score: {overall}/100
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                Payability Health & Intelligence Radar
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-rose-500 text-white flex items-center justify-center transition-all cursor-pointer border border-white/15 shrink-0"
          >
            <FaTimes size={12} />
          </button>
        </div>

        {/* Metric Cards Grid */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {METRICS.map((m, i) => {
              const isGood = m.score >= 80;
              const isMed = m.score >= 60 && m.score < 80;
              const color = isGood ? "#10b981" : isMed ? "#f59e0b" : "#ef4444";

              return (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 hover:border-amber-300 dark:hover:border-amber-600/50 transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <FaChartLine style={{ color }} size={12} />
                      {m.name}
                    </span>
                    <span
                      className="text-xs font-black px-2 py-0.5 rounded-lg"
                      style={{ background: `${color}15`, color }}
                    >
                      {m.score}/100
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${m.score}%`, background: color }}
                    />
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-amber-700 dark:text-amber-400">Formula: </span>
                    {m.formula}
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {m.description}
                  </p>

                  <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-start gap-1.5 text-[11px]">
                    <FaLightbulb className="text-amber-500 shrink-0 mt-0.5" size={10} />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {m.action}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Close Intelligence
          </button>
        </div>
      </div>
    </div>
  );
}
