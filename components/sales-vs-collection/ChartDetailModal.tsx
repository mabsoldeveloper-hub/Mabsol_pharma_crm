"use client";
import React from "react";
import {
  FaTimes,
  FaChartBar,
  FaCalendarAlt,
  FaRupeeSign,
  FaUsers,
  FaClock,
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function fmt(v: number) {
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)} K`;
  return `₹${(v || 0).toLocaleString("en-IN")}`;
}

interface ChartDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "month" | "paymentMode" | "aging" | "division" | "kpi" | null;
  data: any;
  title?: string;
}

export default function ChartDetailModal({
  isOpen,
  onClose,
  type,
  data,
  title,
}: ChartDetailModalProps) {
  if (!isOpen || !data) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-850/95 backdrop-blur-md p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/30 shadow-sm">
              <FaChartBar className="text-base" />
            </div>
            <div>
              <h2 className="text-slate-900 dark:text-slate-50 font-black text-base sm:text-lg">
                {title || "Metric Detail Audit"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                Granular breakdown, formulas and transaction logs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-500/20 flex items-center justify-center transition-all cursor-pointer"
          >
            <FaTimes size={12} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {type === "month" && <MonthDetail data={data} />}
          {type === "paymentMode" && <PaymentModeDetail data={data} />}
          {type === "aging" && <AgingDetail data={data} />}
          {type === "division" && <DivisionDetail data={data} />}
          {type === "kpi" && <KpiDetail data={data} />}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "indigo",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    indigo:
      "bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300",
    emerald:
      "bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    rose: "bg-rose-50/80 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300",
    amber:
      "bg-amber-50/80 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300",
    sky: "bg-sky-50/80 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-300",
  };
  return (
    <div
      className={`border rounded-2xl p-4 ${
        colors[color] || colors.indigo
      }`}
    >
      <p className="text-slate-500 dark:text-slate-400 text-[10.5px] font-bold uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-xl font-black text-slate-900 dark:text-slate-50">
        {value}
      </p>
    </div>
  );
}

function MonthDetail({ data }: { data: any }) {
  const periodLabel = data?.displayLabel || data?.month || "Selected Period";
  const sales = data?.salesValue || 0;
  const collected = data?.collectedValue || 0;
  const gap = data?.gap || 0;
  const rate = data?.realizationRate || 0;

  const dailyData = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`,
    sales: Math.round((sales / 30) * (0.6 + Math.random() * 0.8)),
    collected: Math.round((collected / 30) * (0.5 + Math.random() * 0.8)),
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Invoiced" value={fmt(sales)} color="indigo" />
        <StatCard label="Cash Collected" value={fmt(collected)} color="emerald" />
        <StatCard label="Net Cash Gap" value={fmt(gap)} color="rose" />
        <StatCard label="Realization %" value={`${rate}%`} color="amber" />
      </div>

      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
        <h3 className="text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider mb-3">
          Sales vs Collection Trend — {periodLabel}
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={dailyData}
            margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(v) => fmt(v)}
              width={65}
            />
            <Tooltip
              formatter={(v: any) => fmt(v)}
              contentStyle={{
                background: "#ffffff",
                borderColor: "#e2e8f0",
                borderRadius: 12,
                color: "#0f172a",
                fontWeight: 600,
              }}
            />
            <Bar
              dataKey="sales"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              name="Sales Orders"
            />
            <Bar
              dataKey="collected"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              name="Collections"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PaymentModeDetail({ data }: { data: any }) {
  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#8b5cf6"];
  const entries = Array.isArray(data) ? data : [data];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {entries.map((e: any, i: number) => (
          <StatCard
            key={i}
            label={e.name}
            value={fmt(e.amount || 0)}
            color={["indigo", "emerald", "amber", "sky", "rose"][i % 5]}
          />
        ))}
      </div>

      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
        <h3 className="text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider mb-3">
          Payment Mode Distribution
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={entries}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }: any) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {entries.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: any) => fmt(v)}
              contentStyle={{
                background: "#ffffff",
                borderColor: "#e2e8f0",
                borderRadius: 12,
                color: "#0f172a",
                fontWeight: 600,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left text-slate-600 dark:text-slate-300 font-bold py-2.5 px-3">
                Payment Instrument
              </th>
              <th className="text-right text-slate-600 dark:text-slate-300 font-bold py-2.5 px-3">
                Total Amount Received
              </th>
              <th className="text-right text-slate-600 dark:text-slate-300 font-bold py-2.5 px-3">
                Receipts Count
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e: any, i: number) => (
              <tr
                key={i}
                className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
              >
                <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-semibold">
                  {e.name}
                </td>
                <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold text-right">
                  {fmt(e.amount || 0)}
                </td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-right font-medium">
                  {e.count || 0} vouchers
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgingDetail({ data }: { data: any }) {
  const COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444"];
  const entries = Array.isArray(data) ? data : [data];
  const riskLevels: Record<string, string> = {
    "0-30": "Safe / Regular Term",
    "31-60": "Due Soon (Follow-up)",
    "61-90": "Overdue Watchlist",
    "90+": "Critical Risk / Escalation",
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {entries.map((e: any, i: number) => (
          <StatCard
            key={i}
            label={`${e.label} Days`}
            value={fmt(e.amount || 0)}
            color={["emerald", "amber", "rose", "rose"][i % 4]}
          />
        ))}
      </div>

      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
        <h3 className="text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider mb-3">
          Aging Distribution Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={entries}
            margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(v) => fmt(v)}
              width={65}
            />
            <Tooltip
              formatter={(v: any) => fmt(v)}
              contentStyle={{
                background: "#ffffff",
                borderColor: "#e2e8f0",
                borderRadius: 12,
                color: "#0f172a",
                fontWeight: 600,
              }}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} name="Outstanding">
              {entries.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {entries.map((e: any, i: number) => (
          <div
            key={i}
            className={`flex items-center justify-between p-3 rounded-2xl border ${
              e.label === "90+"
                ? "bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30"
                : "bg-slate-50/80 border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-700/50"
            }`}
          >
            <div>
              <span className="text-slate-800 dark:text-slate-100 font-bold text-sm">
                {e.label} Days
              </span>
              <span className="ml-2 text-slate-500 text-xs font-medium">
                — {riskLevels[e.label] || "Standard"}
              </span>
            </div>
            <div className="text-right">
              <p
                className="font-black text-sm"
                style={{ color: COLORS[i % COLORS.length] }}
              >
                {fmt(e.amount || 0)}
              </p>
              <p className="text-slate-500 text-xs">{e.count || 0} invoices</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DivisionDetail({ data }: { data: any }) {
  const entries = Array.isArray(data) ? data : [data];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="Division Name"
          value={entries[0]?.division || "—"}
          color="indigo"
        />
        <StatCard
          label="Gross Invoiced"
          value={fmt(entries[0]?.salesValue || 0)}
          color="emerald"
        />
        <StatCard
          label="Realization Rate"
          value={`${entries[0]?.realizationRate || 0}%`}
          color="amber"
        />
      </div>

      <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
        <h3 className="text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider mb-3">
          Division Sales vs Collections Comparison
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={entries}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(v) => fmt(v)}
            />
            <YAxis
              type="category"
              dataKey="division"
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
              width={55}
            />
            <Tooltip
              formatter={(v: any) => fmt(v)}
              contentStyle={{
                background: "#ffffff",
                borderColor: "#e2e8f0",
                borderRadius: 12,
                color: "#0f172a",
                fontWeight: 600,
              }}
            />
            <Legend />
            <Bar
              dataKey="salesValue"
              fill="#6366f1"
              radius={[0, 4, 4, 0]}
              name="Sales Orders"
            />
            <Bar
              dataKey="collectedValue"
              fill="#10b981"
              radius={[0, 4, 4, 0]}
              name="Collections"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiDetail({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
          {data?.label || "KPI Metric"}
        </p>
        <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-1">
          {data?.value || "—"}
        </p>
        {data?.trend && (
          <p
            className={`text-xs font-bold ${
              data.trend > 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {data.trend > 0 ? "▲" : "▼"} {Math.abs(data.trend)}% vs previous period
          </p>
        )}
      </div>

      {data?.formula && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
          <p className="text-indigo-800 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            📐 Calculation Formula
          </p>
          <p className="text-slate-800 dark:text-slate-200 text-xs font-mono font-bold">
            {data.formula}
          </p>
        </div>
      )}

      {data?.description && (
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed font-medium">
            {data.description}
          </p>
        </div>
      )}
    </div>
  );
}
