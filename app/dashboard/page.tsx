"use client";

import DashboardCards from "@/components/DashboardCards";
import ProtectedPage from "@/components/ProtectedPage";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Building2,
  FileSpreadsheet,
  FileText,
  Mail,
  PackagePlus,
  Phone,
  UserPlus
} from "lucide-react";

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

export default function DashboardPage() {
  return (
    <ProtectedPage permission="dashboard.view">
      <DashboardCards />
    </ProtectedPage>
  );
}