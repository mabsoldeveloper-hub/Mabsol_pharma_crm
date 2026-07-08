"use client";

import type { LucideIcon } from "lucide-react";
import DashboardCards from "@/components/DashboardCards";
import {
  Users,
  UserCircle2,
  Boxes,
  IndianRupee,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Mail,
  FileText,
  ChevronDown,
  Plus,
  UserPlus,
  FileSpreadsheet,
  PackagePlus,
  Building2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ============================================================
// THEME
// Primary: deep indigo #343872 — structure, headers, primary actions
// Accent:  amber-orange #FB8C00 — highlights, growth signals, CTAs
// ============================================================
const INK = "#343872";
const INK_SOFT = "#5A5E9E";
const INK_TINT = "#EEEEF6";
const AMBER = "#FB8C00";
const AMBER_TINT = "#FFF3E0";

const SERIES = [INK, AMBER, "#5A5E9E", "#F5B95C", "#8A8DC0", "#C77A1E"];

// ---------- Mock data (swap for real API calls) ----------

const revenueTrend = [
  { month: "Jan", revenue: 1180000, target: 1100000 },
  { month: "Feb", revenue: 1410000, target: 1250000 },
  { month: "Mar", revenue: 1295000, target: 1300000 },
  { month: "Apr", revenue: 1540000, target: 1400000 },
  { month: "May", revenue: 1628000, target: 1500000 },
  { month: "Jun", revenue: 1765000, target: 1600000 },
  { month: "Jul", revenue: 1850000, target: 1700000 },
];

const moduleSplit = [
  { name: "Sales", value: 214 },
  { name: "Customers", value: 540 },
  { name: "Inventory", value: 386 },
  { name: "Users", value: 125 },
];

const pipeline = [
  { stage: "New Leads", count: 214, color: INK },
  { stage: "Contacted", count: 156, color: INK_SOFT },
  { stage: "Qualified", count: 92, color: "#8A8DC0" },
  { stage: "Proposal", count: 47, color: "#F5B95C" },
  { stage: "Won", count: 28, color: AMBER },
];

const leadSource = [
  { name: "Referral", value: 78 },
  { name: "Website", value: 61 },
  { name: "WhatsApp", value: 44 },
  { name: "Cold outreach", value: 20 },
  { name: "Partner network", value: 11 },
];

const healthBreakdown = [
  { name: "Sales", value: 82, fill: INK },
  { name: "Collections", value: 74, fill: AMBER },
  { name: "Inventory", value: 91, fill: "#8A8DC0" },
];

const quickActions: { label: string; icon: LucideIcon }[] = [
  { label: "Add user", icon: UserPlus },
  { label: "New invoice", icon: FileSpreadsheet },
  { label: "Add stock", icon: PackagePlus },
  { label: "Add company", icon: Building2 },
];

const activity: { icon: LucideIcon; text: string; time: string }[] = [
  { icon: Phone, text: "Call logged with Karan Mehta — Himalayan Auto Parts", time: "10 min ago" },
  { icon: Mail, text: "Proposal sent to Neha Chopra, ERP Expert Ltd.", time: "45 min ago" },
  { icon: Award, text: "Deal closed — Suresh Rana, ₹1.5L", time: "2 hr ago" },
  { icon: FileText, text: "Invoice #INV-2291 generated for Trident Hospitality", time: "3 hr ago" },
  { icon: UserPlus, text: "New user 'Pooja Sharma' added to Sales team", time: "5 hr ago" },
];

const topRecords = [
  { name: "Vardhman Textiles", type: "Customer", value: "₹4,80,000", status: "Active", date: "05 Jul" },
  { name: "ERP Expert Ltd.", type: "Lead", value: "₹3,10,000", status: "Proposal", date: "03 Jul" },
  { name: "Himalayan Auto Parts", type: "Deal", value: "₹2,40,000", status: "Negotiation", date: "04 Jul" },
  { name: "Shivalik Foods", type: "Customer", value: "₹1,85,000", status: "Active", date: "02 Jul" },
  { name: "Panchkula Motors", type: "Deal", value: "₹1,50,000", status: "Won", date: "03 Jul" },
];

const statusBadge: Record<string, string> = {
  Active: "bg-green-50 text-green-700",
  Proposal: "text-white",
  Negotiation: "bg-purple-50 text-purple-700",
  Won: "bg-green-50 text-green-700",
};

function formatCompactINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// ---------- building blocks ----------

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  accent?: boolean;
}


function RevenueChart() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">Revenue vs target</h3>
          <p className="text-sm text-slate-500">Last 7 months, company-wide</p>
        </div>
        <button className="text-sm text-slate-500 flex items-center gap-1 border border-slate-200 rounded-lg px-3 py-1.5">
          Monthly <ChevronDown size={14} />
        </button>
      </div>
      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer>
          <AreaChart data={revenueTrend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={INK} stopOpacity={0.28} />
                <stop offset="95%" stopColor={INK} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F4" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94A3B8" }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#94A3B8" }}
              tickFormatter={(v: number) => `₹${v / 100000}L`}
              width={45}
            />
            <Tooltip
              formatter={(value: any, name: any) => [
                formatINR(Number(value)),
                name === "revenue" ? "Revenue" : "Target",
              ]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
            />
            <Area type="monotone" dataKey="target" stroke="#CBD1E8" strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
            <Area type="monotone" dataKey="revenue" stroke={INK} strokeWidth={2.5} fill="url(#revFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: INK }} /> Actual revenue</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5" style={{ backgroundColor: "#CBD1E8" }} /> Target</span>
      </div>
    </div>
  );
}

function ModuleDonut() {
  const total = moduleSplit.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-6 flex flex-col">
      <div className="mb-2">
        <h3 className="font-semibold text-slate-900">Records by module</h3>
        <p className="text-sm text-slate-500">Active entries across the CRM</p>
      </div>
      <div style={{ width: "100%", height: 210 }} className="relative">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={moduleSplit} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3} stroke="none">
              {moduleSplit.map((_, i) => (
                <Cell key={i} fill={SERIES[i % SERIES.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: any, n: any) => [`${v} records`, n]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-semibold font-mono text-slate-900">{total}</p>
          <p className="text-xs text-slate-500">Total records</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4">
        {moduleSplit.map((d, i) => (
          <span key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: SERIES[i % SERIES.length] }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function PipelineFunnel() {
  const max = pipeline[0].count;
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-slate-900">Sales pipeline</h3>
          <p className="text-sm text-slate-500">Deal count by stage</p>
        </div>
        <Target size={19} className="text-slate-400" />
      </div>
      <div className="space-y-3">
        {pipeline.map((s) => {
          const width = Math.max((s.count / max) * 100, 16);
          return (
            <div key={s.stage} className="flex items-center gap-4">
              <div className="w-24 shrink-0 text-sm text-slate-600">{s.stage}</div>
              <div className="flex-1">
                <div
                  className="h-8 rounded-lg flex items-center px-3 text-white text-xs font-medium"
                  style={{ width: `${width}%`, backgroundColor: s.color, minWidth: "56px" }}
                >
                  {s.count}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadSourceBar() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">Lead source</h3>
          <p className="text-sm text-slate-500">Where this month's leads came from</p>
        </div>
      </div>
      <div style={{ width: "100%", height: 210 }}>
        <ResponsiveContainer>
          <BarChart data={leadSource} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF1F4" />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94A3B8" }} />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={100} tick={{ fontSize: 12, fill: "#475569" }} />
            <Tooltip
              formatter={(v: any) => [`${v} leads`, "Leads"]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
            />
            <Bar dataKey="value" fill={AMBER} radius={[0, 4, 4, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Signature element — composite "Business Health" gauge blending both
// brand colors, giving the admin a single glanceable read on the business.
function BusinessHealth() {
  const overall = Math.round(healthBreakdown.reduce((s, d) => s + d.value, 0) / healthBreakdown.length);
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-6 flex flex-col">
      <div className="mb-1">
        <h3 className="font-semibold text-slate-900">Business health</h3>
        <p className="text-sm text-slate-500">Composite score across key areas</p>
      </div>
      <div style={{ width: "100%", height: 190 }} className="relative">
        <ResponsiveContainer>
          <RadialBarChart
            innerRadius="38%"
            outerRadius="100%"
            barSize={12}
            data={healthBreakdown}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar dataKey="value" background={{ fill: "#F1F2F8" }} cornerRadius={8} />
            <Tooltip
              formatter={(v: any, _n: any, p: any) => [`${v}/100`, p?.payload?.name ?? ""]}
              contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-semibold font-mono" style={{ color: INK }}>{overall}</p>
          <p className="text-[11px] text-slate-500">out of 100</p>
        </div>
      </div>
      <div className="space-y-2 mt-3">
        {healthBreakdown.map((h) => (
          <div key={h.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: h.fill }} />
              {h.name}
            </span>
            <span className="font-mono text-slate-700">{h.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Quick actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((a) => (
          <button
            key={a.label}
            className="flex flex-col items-start gap-2.5 rounded-xl border border-slate-200 p-3.5 text-left transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = INK_TINT)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: AMBER_TINT }}>
              <a.icon size={15} style={{ color: AMBER }} />
            </div>
            <span className="text-[13px] font-medium text-slate-700">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Recent activity</h3>
      <div className="space-y-4">
        {activity.map((a, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: INK_TINT }}>
              <a.icon size={14} style={{ color: INK }} />
            </div>
            <div>
              <p className="text-[13px] text-slate-700 leading-snug">{a.text}</p>
              <p className="text-xs text-slate-400 mt-0.5">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopRecordsTable() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">Top records</h3>
          <p className="text-sm text-slate-500">Highest value activity across modules</p>
        </div>
        <button className="text-sm font-medium" style={{ color: INK }}>View all</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="font-medium py-2 pr-4">Name</th>
              <th className="font-medium py-2 pr-4">Type</th>
              <th className="font-medium py-2 pr-4">Value</th>
              <th className="font-medium py-2 pr-4">Status</th>
              <th className="font-medium py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {topRecords.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                <td className="py-3 pr-4 font-medium text-slate-800">{r.name}</td>
                <td className="py-3 pr-4 text-slate-500">{r.type}</td>
                <td className="py-3 pr-4 font-mono text-slate-700">{r.value}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge[r.status] || "bg-slate-50 text-slate-600"}`}
                    style={r.status === "Proposal" ? { backgroundColor: AMBER } : undefined}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="py-3 text-slate-400">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Page ----------

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container-fluid w-full px-6 py-8 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: INK }}>Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome back — here's what's happening across your business today</p>
          </div>
          <button
            className="flex items-center gap-1.5 text-sm font-medium text-white px-4 py-2 rounded-lg"
            style={{ backgroundColor: AMBER }}
          >
            <Plus size={15} /> Quick add
          </button>
        </div>
        <DashboardCards /> 

        {/* Revenue + module split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><RevenueChart /></div>
          <ModuleDonut />
        </div>

        {/* Pipeline + lead source */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><PipelineFunnel /></div>
          <LeadSourceBar />
        </div>

        {/* Health + quick actions + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <BusinessHealth />
          <QuickActions />
          <RecentActivity />
        </div>

        {/* Top records table */}
        <TopRecordsTable />
      </div>
    </div>
  );
}