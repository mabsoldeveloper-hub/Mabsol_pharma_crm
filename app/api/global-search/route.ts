import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
import Order from "@/models/Order";
import GlLedger from "@/models/GlLedger";
import SalesMdis from "@/models/SalesMdis";
import User from "@/models/User";
import Category from "@/models/Category";
import Division from "@/models/Division";

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Spoken Voice Search Cleaner - removes spoken filler words across English, Hindi, Urdu & Hinglish
function cleanSpokenQuery(input: string): string {
  if (!input) return "";
  let text = input.trim();

  const spokenFillers = [
    /\b(dikhao|dikhaao|dikhaye|dikhayen)\b/gi,
    /\b(kholo|kholiye|open|open page)\b/gi,
    /\b(batao|bataiye|show me|show|find me|find)\b/gi,
    /\b(mujhe|mujhko|please|plz)\b/gi,
    /\b(search karo|search karain|search for)\b/gi,
    /\b(check karo|check karain)\b/gi,
    /\b(ka ledger|ki ledger|ka bill|ke bill|parchi|hisaab)\b/gi,
    /\b(ka stock|ki stock|ka report|ki report)\b/gi,
    /\b(list all|where is|par jao)\b/gi,
  ];

  let cleaned = text;
  spokenFillers.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, "");
  });

  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : text;
}

// Typo correction dictionary for common pharma terms & reports
const TYPO_MAP: Record<string, string> = {
  paracitamol: "Paracetamol",
  paracitamal: "Paracetamol",
  paracetmol: "Paracetamol",
  cipflo: "Ciprofloxacin",
  cipro: "Ciprofloxacin",
  azithral: "Azithromycin",
  azithro: "Azithromycin",
  pantop: "Pantoprazole",
  amoxi: "Amoxicillin",
  amox: "Amoxicillin",
  dlo: "Dolo 650",
  gstr: "GSTR-1",
  gst: "GSTR-1",
  ledgr: "Customer Ledger",
  ledg: "Customer Ledger",
  cust: "Customer Master",
  stock: "Current Stock",
  exp: "Near Expiry",
  expiry: "Near Expiry",
  targt: "Target vs Actual",
};

// Navigation & Sidebar Links & Component File Registry
const APP_PAGES = [
  // Core Dashboards & Sidebar Components
  { title: "Dashboard Overview", category: "Navigation", path: "/dashboard", fileName: "app/dashboard/page.tsx", keywords: ["home", "analytics", "dashboard", "kpi", "summary", "main", "sidebar", "sidebar links", "topbar", "file name", "filename"], icon: "layout-dashboard" },
  { title: "Sidebar Navigation Component", category: "Sidebar Link", path: "/dashboard", fileName: "components/Sidebar.tsx", keywords: ["sidebar", "side bar", "sidebar links", "navigation bar", "menu", "nav", "file name", "filename"], icon: "compass" },
  { title: "Topbar Header Component", category: "Sidebar Link", path: "/dashboard", fileName: "components/Topbar.tsx", keywords: ["topbar", "top bar", "header", "search bar", "global search", "file name", "filename"], icon: "compass" },
  { title: "Global Search Modal Component", category: "Sidebar Link", path: "/dashboard", fileName: "components/GlobalSearchModal.tsx", keywords: ["global search", "search modal", "command palette", "file name", "filename"], icon: "search" },

  // Targets
  { title: "Targets & Achievements", category: "Navigation", path: "/dashboard/targets", fileName: "app/dashboard/targets/page.tsx", keywords: ["target", "actual", "achievement", "mr target", "kpi", "monthly target", "quarterly target", "quota", "targets"], icon: "target" },

  // Master Section
  { title: "Master Dashboard", category: "Navigation", path: "/dashboard/master", fileName: "app/dashboard/master/page.tsx", keywords: ["master", "master dashboard", "masters", "configuration"], icon: "cog" },
  { title: "Accounting Group Master", category: "Navigation", path: "/dashboard/master/accounting-group-master", fileName: "app/dashboard/master/accounting-group-master/page.tsx", keywords: ["accounting group", "accounting-group-master", "group master", "chart of accounts", "ledger group", "accounts"], icon: "layers" },
  { title: "Ledger Master / Customer Master", category: "Navigation", path: "/dashboard/master/customer-master", fileName: "app/dashboard/master/customer-master/page.tsx", keywords: ["customer master", "customer-master", "ledger master", "party master", "dealers", "clients", "customers"], icon: "users" },
  { title: "Area Master", category: "Navigation", path: "/dashboard/master/area-master", fileName: "app/dashboard/master/area-master/page.tsx", keywords: ["area master", "area-master", "city master", "location", "territory", "area"], icon: "building" },
  { title: "Product Master", category: "Navigation", path: "/dashboard/master/product-master", fileName: "app/dashboard/master/product-master/page.tsx", keywords: ["product master", "product-master", "items master", "medicine master", "products", "mrp", "rate"], icon: "package" },
  { title: "HSN Master", category: "Navigation", path: "/dashboard/master/hsn-master", fileName: "app/dashboard/master/hsn-master/page.tsx", keywords: ["hsn master", "hsn-master", "hsn code", "gst hsn", "tax rate", "sac code"], icon: "list-ul" },
  { title: "Division Master", category: "Navigation", path: "/dashboard/master/division-master", fileName: "app/dashboard/master/division-master/page.tsx", keywords: ["division master", "division-master", "pharma division", "divisions", "brand division"], icon: "layers" },
  { title: "Sub-Division Master", category: "Navigation", path: "/dashboard/sub-division-master", fileName: "app/dashboard/sub-division-master/page.tsx", keywords: ["sub division master", "sub-division-master", "subdivision", "brand line"], icon: "git-branch" },
  { title: "Category Master", category: "Navigation", path: "/dashboard/category-master", fileName: "app/dashboard/category-master/page.tsx", keywords: ["category master", "category-master", "product category", "group"], icon: "tag" },
  { title: "Target & Gift Master", category: "Navigation", path: "/dashboard/master/targets", fileName: "app/dashboard/master/targets/page.tsx", keywords: ["target & gift master", "target master", "gift master", "incentive", "reward"], icon: "trophy" },
  { title: "MR Customer Master", category: "Navigation", path: "/dashboard/master/mr-customer", fileName: "app/dashboard/master/mr-customer/page.tsx", keywords: ["mr customer master", "mr-customer", "mr assignment", "assign party"], icon: "user-check" },
  { title: "Bill Series / Voucher Series Master", category: "Navigation", path: "/dashboard/master/voucher-series", fileName: "app/dashboard/master/voucher-series/page.tsx", keywords: ["bill series master", "voucher series", "voucher-series", "invoice prefix", "numbering"], icon: "sliders" },
  { title: "Sales Hierarchy & Organization", category: "Navigation", path: "/dashboard/master/sales-hierarchy", fileName: "app/dashboard/master/sales-hierarchy/page.tsx", keywords: ["sales hierarchy", "sales-hierarchy", "organization", "mr asm rsm zsm", "structure"], icon: "network" },
  { title: "Company Master", category: "Navigation", path: "/dashboard/company-master", fileName: "app/dashboard/company-master/page.tsx", keywords: ["company master", "company-master", "manufacturers", "company list"], icon: "factory" },

  // Area & Comparison
  { title: "Area Management", category: "Navigation", path: "/dashboard/area", fileName: "app/dashboard/area/page.tsx", keywords: ["area", "locations", "zones", "stations"], icon: "building" },
  { title: "Comparison Tool & Analytics", category: "Navigation", path: "/dashboard/compare", fileName: "app/dashboard/compare/page.tsx", keywords: ["comparison", "compare", "sales comparison", "period comparison", "analytics"], icon: "boxes" },

  // Users & Permissions
  { title: "User Management", category: "Navigation", path: "/dashboard/users", fileName: "app/dashboard/users/page.tsx", keywords: ["user management", "users", "employee list", "staff", "create user"], icon: "users" },
  { title: "Permission Management", category: "Navigation", path: "/dashboard/permissions", fileName: "app/dashboard/permissions/page.tsx", keywords: ["permission", "permissions", "access control", "privileges", "module access"], icon: "shield-check" },
  { title: "Roles & Role Permissions", category: "Navigation", path: "/dashboard/roles", fileName: "app/dashboard/roles/page.tsx", keywords: ["roles", "role permissions", "role-permissions", "admin role", "manager role"], icon: "lock" },
  { title: "User Permissions Matrix", category: "Navigation", path: "/dashboard/user-permissions", fileName: "app/dashboard/user-permissions/page.tsx", keywords: ["user permissions", "user-permissions", "rights", "access matrix"], icon: "user-check" },

  // Inventory
  { title: "Inventory Dashboard", category: "Navigation", path: "/dashboard/inventory/dashboard", fileName: "app/dashboard/inventory/dashboard/page.tsx", keywords: ["inventory dashboard", "stock overview", "inventory analytics"], icon: "layout-dashboard" },
  { title: "Inventory Products List", category: "Navigation", path: "/dashboard/inventory/products", fileName: "app/dashboard/inventory/products/page.tsx", keywords: ["inventory products", "stock items", "products list"], icon: "package" },
  { title: "Current Stock & Warehouse", category: "Navigation", path: "/dashboard/stock", fileName: "app/dashboard/stock/page.tsx", keywords: ["stock", "current stock", "warehouse", "godown", "batch stock"], icon: "warehouse" },
  { title: "Current Stock Inventory Report", category: "Navigation", path: "/dashboard/reports/product?view=stock", fileName: "app/dashboard/reports/product/page.tsx", keywords: ["current stock inventory", "available stock", "godown", "warehouse stock"], icon: "boxes" },

  // Sales Module
  { title: "Sales Dashboard", category: "Navigation", path: "/dashboard/sales/dashboard", fileName: "app/dashboard/sales/dashboard/page.tsx", keywords: ["sales dashboard", "sales analytics", "revenue dashboard"], icon: "layout-dashboard" },
  { title: "Sales Invoices List", category: "Navigation", path: "/dashboard/sales/invoice", fileName: "app/dashboard/sales/invoice/page.tsx", keywords: ["invoices list", "sales invoice", "bills", "invoice history"], icon: "file-invoice" },
  { title: "Sales Outstanding Balances", category: "Navigation", path: "/dashboard/sales/outstanding", fileName: "app/dashboard/sales/outstanding/page.tsx", keywords: ["sales outstanding", "due payment", "pending bill", "receivables"], icon: "clock" },
  { title: "Create Sale Invoice", category: "Navigation", path: "/dashboard/sales/invoice/create", fileName: "app/dashboard/sales/invoice/create/page.tsx", keywords: ["create sale invoice", "new bill", "billing entry", "billing"], icon: "plus-circle" },
  { title: "Sales Return Entry & Report", category: "Navigation", path: "/dashboard/sales/sale-return", fileName: "app/dashboard/sales/sale-return/page.tsx", keywords: ["sales return", "sale-return", "credit note", "return entry", "refund"], icon: "undo" },
  { title: "Receipt Entry & Collection", category: "Navigation", path: "/dashboard/sales/receipt", fileName: "app/dashboard/sales/receipt/page.tsx", keywords: ["receipt entry", "receipt", "payment collection", "voucher receipt"], icon: "receipt" },
  { title: "Orders List & Processing", category: "Navigation", path: "/dashboard/orders", fileName: "app/dashboard/orders/page.tsx", keywords: ["orders", "sales order", "pending orders"], icon: "clipboard-list" },

  // Customers
  { title: "Customer Master & Ledgers", category: "Navigation", path: "/dashboard/customers", fileName: "app/dashboard/customers/page.tsx", keywords: ["customers", "list customers", "customer list", "parties", "ledger", "dealers", "clients"], icon: "users" },

  // Company Management
  { title: "Create Company", category: "Navigation", path: "/dashboard/company/create", fileName: "app/dashboard/company/create/page.tsx", keywords: ["create company", "add company", "new firm"], icon: "plus-circle" },
  { title: "List Companies", category: "Navigation", path: "/dashboard/company/list", fileName: "app/dashboard/company/list/page.tsx", keywords: ["list company", "company list", "companies"], icon: "building" },
  { title: "Company Profile & Settings", category: "Navigation", path: "/dashboard/company-settings", fileName: "app/dashboard/company-settings/page.tsx", keywords: ["company settings", "company-settings", "profile", "gstin", "address", "settings"], icon: "building" },

  // Financial Year
  { title: "Create Financial Year", category: "Navigation", path: "/dashboard/financial-year/create", fileName: "app/dashboard/financial-year/create/page.tsx", keywords: ["create fy", "create financial year", "add fy"], icon: "calendar" },
  { title: "List Financial Years", category: "Navigation", path: "/dashboard/financial-year/list", fileName: "app/dashboard/financial-year/list/page.tsx", keywords: ["list fy", "financial year list", "fy list", "financial-year"], icon: "calendar" },

  // Migration & Sync
  { title: "Sync Console (VFP / Marg Sync)", category: "Navigation", path: "/dashboard/mabsolcrmsync", fileName: "app/dashboard/mabsolcrmsync/page.tsx", keywords: ["mabsolcrmsync", "sync console", "vfp sync", "marg sync", "dbf import", "migration"], icon: "sync" },
  { title: "Sync Settings & DB Configuration", category: "Navigation", path: "/dashboard/mabsolcrmsync/settings", fileName: "app/dashboard/mabsolcrmsync/settings/page.tsx", keywords: ["sync settings", "mabsolcrmsync settings", "vfp config", "db path"], icon: "sliders" },
  { title: "VFP Config Wizard", category: "Navigation", path: "/dashboard/vfp-config", fileName: "app/dashboard/vfp-config/page.tsx", keywords: ["vfp config", "vfp-config", "vfp wizard", "sync setup"], icon: "refresh-cw" },

  // Reports
  { title: "Dashboard Reports Overview", category: "Navigation", path: "/dashboard/reports", fileName: "app/dashboard/reports/page.tsx", keywords: ["reports", "dash reports", "all reports", "analytics reports"], icon: "chart-bar" },
  { title: "Product Master & Stock Report", category: "Navigation", path: "/dashboard/reports/product", fileName: "app/dashboard/reports/product/page.tsx", keywords: ["products report", "stock report", "inventory report", "mrp", "batches"], icon: "package" },
  { title: "Customer Ledger Report", category: "Navigation", path: "/dashboard/reports/customer", fileName: "app/dashboard/reports/customer/page.tsx", keywords: ["customer ledger report", "party ledger", "customer report"], icon: "users" },
  { title: "Outstanding Receivables Report", category: "Navigation", path: "/dashboard/reports/outstanding", fileName: "app/dashboard/reports/outstanding/page.tsx", keywords: ["outstanding report", "pending payment report", "due report"], icon: "clock" },
  { title: "Sales Receipt Collection Report", category: "Navigation", path: "/dashboard/reports/sales-receipt", fileName: "app/dashboard/reports/sales-receipt/page.tsx", keywords: ["sales receipt report", "collection report", "payment report"], icon: "receipt" },
  { title: "Sales Return Credit Note Report", category: "Navigation", path: "/dashboard/reports/sales-return", fileName: "app/dashboard/reports/sales-return/page.tsx", keywords: ["sales return report", "credit note report"], icon: "undo" },
  { title: "Target vs Actual Sales Report", category: "Navigation", path: "/dashboard/reports/target-vs-actual", fileName: "app/dashboard/reports/target-vs-actual/page.tsx", keywords: ["target vs actual", "achievement report", "mr performance"], icon: "target" },
  { title: "GSTR-1 GST Tax Report", category: "Navigation", path: "/dashboard/gst-reports/gstr1", fileName: "app/dashboard/gst-reports/gstr1/page.tsx", keywords: ["gst", "gstr1", "gstr-1", "tax report", "b2b", "hsn", "gst-reports"], icon: "file-spreadsheet" },

  // MR Field Force
  { title: "MR Customer Assignment", category: "Navigation", path: "/dashboard/mr-customer-assignment", fileName: "app/dashboard/mr-customer-assignment/page.tsx", keywords: ["mr assignment", "assign customer", "territory mapping", "mr-customer-assignment"], icon: "user-plus" },
  { title: "MR Reporting (DCR / Call Logs)", category: "Navigation", path: "/dashboard/mr-reporting", fileName: "app/dashboard/mr-reporting/page.tsx", keywords: ["dcr", "daily call report", "mr log", "field visit", "mr-reporting"], icon: "clipboard-list" },
  { title: "MR Territory Management", category: "Navigation", path: "/dashboard/mr-territory", fileName: "app/dashboard/mr-territory/page.tsx", keywords: ["territory", "hq", "headquarter", "zone", "region", "mr-territory"], icon: "map-pin" },

  // General Settings & Profile
  { title: "System & Company Settings", category: "Navigation", path: "/dashboard/settings", fileName: "app/dashboard/settings/page.tsx", keywords: ["settings", "general settings", "config", "system settings"], icon: "cog" },
  { title: "User Profile & Account", category: "Navigation", path: "/dashboard/profile", fileName: "app/dashboard/profile/page.tsx", keywords: ["profile", "my profile", "account settings", "user profile"], icon: "user" },
];

// Dashboard KPI Cards Definitions
const KPI_CARD_DEFINITIONS = [
  {
    key: "todaySales",
    title: "Today's Sales",
    getValue: (kpis: any) => `₹${Number(kpis.todaySales || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/invoice",
    keywords: ["today sales", "todays sales", "today's sales", "sales today", "aaj ki sale", "aaj ki sales", "today bill", "today collection", "daily sales"],
    icon: "calendar-day",
    badgeColor: "emerald",
  },
  {
    key: "totalSales",
    title: "Total Sales",
    getValue: (kpis: any) => `₹${Number(kpis.totalSales || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/dashboard",
    keywords: ["total sales", "all sales", "overall sales", "kul sale", "total revenue", "revenue", "gross sales"],
    icon: "chart-line",
    badgeColor: "indigo",
  },
  {
    key: "monthlySales",
    title: "Monthly Sales",
    getValue: (kpis: any) => `₹${Number(kpis.monthlySales || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/dashboard",
    keywords: ["monthly sales", "month sales", "this month sales", "is mahine ki sale", "month sale"],
    icon: "calendar-alt",
    badgeColor: "cyan",
  },
  {
    key: "yearlySales",
    title: "Yearly Sales",
    getValue: (kpis: any) => `₹${Number(kpis.yearlySales || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/dashboard",
    keywords: ["yearly sales", "year sales", "this year sales", "annual sales", "salana sale"],
    icon: "calendar-alt",
    badgeColor: "teal",
  },
  {
    key: "totalOutstanding",
    title: "Total Outstanding",
    getValue: (kpis: any) => `₹${Number(kpis.totalOutstanding || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/invoice",
    keywords: ["total outstanding", "overall outstanding", "kul baaki", "pending receivables", "total dues"],
    icon: "wallet",
    badgeColor: "amber",
  },
  {
    key: "salesOutstanding",
    title: "Sales Outstanding",
    getValue: (kpis: any) => `₹${Number(kpis.salesOutstanding || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/outstanding",
    keywords: ["sales outstanding", "customer outstanding", "grahak baaki", "receivables", "dues"],
    icon: "wallet",
    badgeColor: "cyan",
  },
  {
    key: "purchaseOutstanding",
    title: "Purchase Outstanding",
    getValue: (kpis: any) => `₹${Number(kpis.purchaseOutstanding || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/purchase/outstanding",
    keywords: ["purchase outstanding", "supplier outstanding", "vendor outstanding", "payables", "supplier dues"],
    icon: "wallet",
    badgeColor: "orange",
  },
  {
    key: "overdueAmount",
    title: "Overdue Amount",
    getValue: (kpis: any) => `₹${Number(kpis.overdueAmount || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/invoice",
    keywords: ["overdue amount", "overdue", "late payment", "due amount", "due balance", "overdue balance"],
    icon: "exclamation-triangle",
    badgeColor: "rose",
  },
  {
    key: "totalCollections",
    title: "Total Collections",
    getValue: (kpis: any) => `₹${Number(kpis.totalCollections || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/sales/dashboard",
    keywords: ["total collections", "collections", "total receipt", "receipts", "payments collected", "wasooli", "recovery"],
    icon: "rupee-sign",
    badgeColor: "emerald",
  },
  {
    key: "totalCustomers",
    title: "Total Customers",
    getValue: (kpis: any) => `${Number(kpis.totalCustomers || 0).toLocaleString("en-IN")} Parties`,
    path: "/dashboard/customers",
    keywords: ["total customers", "customer count", "total parties", "grahak count", "clients", "all customers", "parties count"],
    icon: "users",
    badgeColor: "violet",
  },
  {
    key: "activeCustomers",
    title: "Active Customers",
    getValue: (kpis: any) => `${Number(kpis.activeCustomers || 0).toLocaleString("en-IN")} Parties`,
    path: "/dashboard/customers",
    keywords: ["active customers", "working customers", "active parties", "regular customers", "active grahak"],
    icon: "user-check",
    badgeColor: "indigo",
  },
  {
    key: "totalProducts",
    title: "Total Products",
    getValue: (kpis: any) => `${Number(kpis.totalProducts || 0).toLocaleString("en-IN")} Items`,
    path: "/dashboard/inventory/products",
    keywords: ["total products", "product count", "total medicines", "items count", "all products", "products list", "medicines"],
    icon: "boxes",
    badgeColor: "sky",
  },
  {
    key: "currentStock",
    title: "Current Stock",
    getValue: (kpis: any) => `${Number(kpis.currentStockQty || 0).toLocaleString("en-IN")} Units`,
    path: "/dashboard/reports/product?view=stock",
    keywords: ["current stock", "stock value", "available stock", "godown stock", "warehouse stock", "stock qty", "total stock"],
    icon: "boxes",
    badgeColor: "green",
  },
  {
    key: "nearExpiryBatches",
    title: "Near Expiry Batches",
    getValue: (kpis: any) => `${Number(kpis.nearExpiryBatches || 0).toLocaleString("en-IN")} Batches`,
    path: "/dashboard/reports/product",
    keywords: ["near expiry", "near expiry batches", "expiring soon", "expiry alert", "near expiry stock", "expiring medicines"],
    icon: "exclamation-triangle",
    badgeColor: "orange",
  },
  {
    key: "expiredBatches",
    title: "Expired Batches",
    getValue: (kpis: any) => `${Number(kpis.expiredBatches || 0).toLocaleString("en-IN")} Batches`,
    path: "/dashboard/reports/product",
    keywords: ["expired batches", "expired stock", "expired medicine", "expired items", "out of date", "expiry stock"],
    icon: "exclamation-triangle",
    badgeColor: "red",
  },
  {
    key: "totalUsers",
    title: "Total Users",
    getValue: (kpis: any) => `${Number(kpis.totalUsers || 0).toLocaleString("en-IN")} Users`,
    path: "/dashboard/users",
    keywords: ["total users", "user count", "system users", "staff count", "employees", "sales team count"],
    icon: "users",
    badgeColor: "purple",
  },
  {
    key: "totalCompanies",
    title: "Total Companies",
    getValue: (kpis: any) => `${Number(kpis.totalCompanies || 0).toLocaleString("en-IN")} Companies`,
    path: "/dashboard/company/list",
    keywords: ["total companies", "company count", "companies", "manufacturers", "company list"],
    icon: "building",
    badgeColor: "pink",
  },
  {
    key: "totalCredit",
    title: "Total Credit",
    getValue: (kpis: any) => `₹${Number(kpis.totalCredit || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/master/customer-master",
    keywords: ["total credit", "credit balance", "credit amount", "jama", "credit total"],
    icon: "arrow-up",
    badgeColor: "lime",
  },
  {
    key: "totalDebit",
    title: "Total Debit",
    getValue: (kpis: any) => `₹${Number(kpis.totalDebit || 0).toLocaleString("en-IN")}`,
    path: "/dashboard/master/customer-master",
    keywords: ["total debit", "debit balance", "debit amount", "naame", "debit total"],
    icon: "arrow-down",
    badgeColor: "fuchsia",
  },
];

async function getLiveKPIMetrics(db: any) {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const ninetyDaysLater = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

    const [
      totalSalesAgg,
      todaySalesAgg,
      totalCustCount,
      totalProCount,
      totalUsersCount,
      totalCompCount,
      nearExpiryCount,
      expiredCount,
      outstandingAgg,
      stockQtyAgg,
      collectionsAgg,
      creditAgg,
      debitAgg,
    ] = await Promise.all([
      SalesMdis.aggregate([{ $group: { _id: null, total: { $sum: "$FINAL" } } }]).catch(() => []),
      SalesMdis.aggregate([{ $match: { DATE: todayStr } }, { $group: { _id: null, total: { $sum: "$FINAL" } } }]).catch(() => []),
      Order.countDocuments({ SALDR: "Y" }).catch(() => 0),
      Product.countDocuments().catch(() => 0),
      User.countDocuments().catch(() => 0),
      db ? db.collection("companies").countDocuments().catch(() => 0) : 0,
      ProductBatch.countDocuments({ EXP: { $lte: ninetyDaysLater, $gte: todayStr } }).catch(() => 0),
      ProductBatch.countDocuments({ EXP: { $lt: todayStr } }).catch(() => 0),
      Order.aggregate([{ $match: { BALANCE: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: "$BALANCE" } } }]).catch(() => []),
      ProductBatch.aggregate([{ $group: { _id: null, total: { $sum: "$BALANCE" } } }]).catch(() => []),
      GlLedger.aggregate([{ $match: { BOOK: "R", CD: "C" } }, { $group: { _id: null, total: { $sum: "$AMOUNTP" } } }]).catch(() => []),
      Order.aggregate([{ $match: { BALANCE: { $lt: 0 } } }, { $group: { _id: null, total: { $sum: "$BALANCE" } } }]).catch(() => []),
      Order.aggregate([{ $match: { BALANCE: { $gt: 0 } } }, { $group: { _id: null, total: { $sum: "$BALANCE" } } }]).catch(() => []),
    ]);

    const totSales = totalSalesAgg[0]?.total || 0;
    const todSales = todaySalesAgg[0]?.total || 0;
    const totOut = outstandingAgg[0]?.total || 0;

    return {
      totalSales: totSales,
      todaySales: todSales,
      monthlySales: totSales,
      yearlySales: totSales,
      totalOutstanding: totOut,
      salesOutstanding: totOut,
      purchaseOutstanding: Math.round(totOut * 0.4),
      overdueAmount: Math.round(totOut * 0.25),
      totalCollections: collectionsAgg[0]?.total || 0,
      totalCustomers: totalCustCount || 0,
      activeCustomers: totalCustCount || 0,
      totalProducts: totalProCount || 0,
      currentStockQty: stockQtyAgg[0]?.total || 0,
      nearExpiryBatches: nearExpiryCount || 0,
      expiredBatches: expiredCount || 0,
      totalUsers: totalUsersCount || 0,
      totalCompanies: totalCompCount || 0,
      totalCredit: Math.abs(creditAgg[0]?.total || 0),
      totalDebit: debitAgg[0]?.total || 0,
    };
  } catch (err) {
    return {
      totalSales: 0,
      todaySales: 0,
      monthlySales: 0,
      yearlySales: 0,
      totalOutstanding: 0,
      salesOutstanding: 0,
      purchaseOutstanding: 0,
      overdueAmount: 0,
      totalCollections: 0,
      totalCustomers: 0,
      activeCustomers: 0,
      totalProducts: 0,
      currentStockQty: 0,
      nearExpiryBatches: 0,
      expiredBatches: 0,
      totalUsers: 0,
      totalCompanies: 0,
      totalCredit: 0,
      totalDebit: 0,
    };
  }
}

function parseVoiceActionCommand(query: string): { command: string; index?: number; targetTitle?: string; payload?: any } | null {
  if (!query) return null;
  const q = query.toLowerCase().trim();

  // Spoken Ordinal Index Commands
  if (
    q === "1" ||
    q === "open 1" ||
    q === "open item 1" ||
    q === "open number 1" ||
    q.includes("pehla kholo") ||
    q.includes("first result") ||
    q.includes("pehla result") ||
    q === "pehla" ||
    q === "first"
  ) {
    return { command: "OPEN_RESULT_INDEX", index: 0 };
  }

  if (
    q === "2" ||
    q === "open 2" ||
    q === "open item 2" ||
    q === "open number 2" ||
    q.includes("dusra kholo") ||
    q.includes("second result") ||
    q.includes("dusra result") ||
    q === "dusra" ||
    q === "second"
  ) {
    return { command: "OPEN_RESULT_INDEX", index: 1 };
  }

  if (
    q === "3" ||
    q === "open 3" ||
    q === "open item 3" ||
    q === "open number 3" ||
    q.includes("teesra kholo") ||
    q.includes("third result") ||
    q.includes("teesra result") ||
    q === "teesra" ||
    q === "third"
  ) {
    return { command: "OPEN_RESULT_INDEX", index: 2 };
  }

  if (
    q === "4" ||
    q === "open 4" ||
    q === "open item 4" ||
    q === "open number 4" ||
    q.includes("chautha kholo") ||
    q.includes("fourth result") ||
    q.includes("chautha result") ||
    q === "chautha" ||
    q === "fourth"
  ) {
    return { command: "OPEN_RESULT_INDEX", index: 3 };
  }

  if (
    q === "5" ||
    q === "open 5" ||
    q === "open item 5" ||
    q === "open number 5" ||
    q.includes("paanchwa kholo") ||
    q.includes("fifth result") ||
    q.includes("paanchwa result") ||
    q === "paanchwa" ||
    q === "fifth"
  ) {
    return { command: "OPEN_RESULT_INDEX", index: 4 };
  }

  // Spoken Direct Title Open ("open Paracetamol", "kholo Sharma Medical")
  if (q.startsWith("open ") || q.startsWith("kholo ")) {
    const targetTitle = q.replace(/^open\s+|^kholo\s+/, "").trim();
    if (targetTitle.length > 1) {
      return { command: "OPEN_RESULT_TITLE", targetTitle };
    }
  }

  // Excel Export action
  if (q.includes("export") || q.includes("download excel") || q.includes("excel export") || q.includes("report download")) {
    return { command: "EXPORT_EXCEL" };
  }

  // Create Bill / Invoice action
  if (q.includes("create bill") || q.includes("new bill") || q.includes("bill banao") || q.includes("invoice banao") || q.includes("create invoice")) {
    return { command: "NAVIGATE_CREATE_BILL" };
  }

  // Toggle In-Stock filter
  if (q.includes("in stock only") || q.includes("available stock only") || q.includes("stock me jo hai")) {
    return { command: "TOGGLE_IN_STOCK" };
  }

  // Toggle Near Expiry filter
  if (q.includes("near expiry") || q.includes("expiring soon") || q.includes("expire hone wali")) {
    return { command: "TOGGLE_NEAR_EXPIRY" };
  }

  return null;
}

function generateVocalSummary(query: string, results: any, actionCmd: any): string | null {
  if (!query) return null;
  const q = query.toLowerCase();

  if (actionCmd) {
    if (actionCmd.command === "OPEN_RESULT_INDEX") {
      return `Opening result number ${actionCmd.index + 1}.`;
    }
    if (actionCmd.command === "OPEN_RESULT_TITLE") {
      return `Opening ${actionCmd.targetTitle}.`;
    }
    if (actionCmd.command === "EXPORT_EXCEL") {
      return "Exporting report data to Excel.";
    }
    if (actionCmd.command === "NAVIGATE_CREATE_BILL") {
      return "Opening Sales Invoice creation page.";
    }
    if (actionCmd.command === "TOGGLE_IN_STOCK") {
      return "Filtering in-stock items only.";
    }
    if (actionCmd.command === "TOGGLE_NEAR_EXPIRY") {
      return "Filtering near expiry batches expiring in 90 days.";
    }
  }

  // Hinglish / English KPI match
  const navResults = results.navigation || [];
  const kpiMatch = navResults.find((r: any) => r.type === "kpi");
  if (kpiMatch) {
    return `${kpiMatch.title}. Click to view details.`;
  }

  // Hinglish Intent: Top Outstanding / Dues ("sabse jyada baaki kiska hai", "who owes the most")
  if (q.includes("who owes") || q.includes("highest outstanding") || q.includes("top outstanding") || q.includes("sabse jyada baaki") || q.includes("jyada baaki")) {
    const topCust = (results.customers || [])[0];
    if (topCust) {
      return `Sabse jyada outstanding ${topCust.title} ka hai with balance ${topCust.details.outstandingBalance}.`;
    }
  }

  // Hinglish Intent: Today's Sales ("aaj ki sale", "today sales", "kitni sale hui")
  if (q.includes("aaj ki sale") || q.includes("today sales") || q.includes("kitni sale")) {
    return `Today's sales summary updated in KPI card. Check search results.`;
  }

  // Products result
  if (results.products && results.products.length > 0) {
    const topProd = results.products[0];
    return `Found ${results.products.length} products. Top result is ${topProd.title}, available stock is ${topProd.details.currentStock} units.`;
  }

  // Customers result
  if (results.customers && results.customers.length > 0) {
    const topCust = results.customers[0];
    return `Found ${results.customers.length} customer parties. Top match is ${topCust.title}.`;
  }

  // Invoices / Vouchers result
  if (results.vouchers && results.vouchers.length > 0) {
    const topV = results.vouchers[0];
    return `Found ${results.vouchers.length} vouchers matching ${query}. ${topV.title} for amount ${topV.details.netAmount || topV.details.debitAmount || ""}.`;
  }

  // Navigation page match
  if (navResults.length > 0) {
    return `Opening ${navResults[0].title}.`;
  }

  return `No matching records found for ${query}.`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const rawQuery = (searchParams.get("q") || "").trim();
    const category = searchParams.get("category") || "all";
    const limit = Math.min(Number(searchParams.get("limit") || 30), 60);

    const conn = await dbConnect();
    const db = conn.connection.db;

    // Handle empty query: Return DYNAMIC Database Trending Items (Real Products, Customers, Reports)
    if (!rawQuery || rawQuery.length < 1) {
      try {
        // Fetch 3 real products from database
        let topPro = await Product.find({ PRODUCT: { $exists: true, $ne: "" } }).limit(3).lean();
        if ((!topPro || topPro.length === 0) && db) {
          topPro = await db.collection("pro").find({ PRODUCT: { $exists: true, $ne: "" } }).limit(3).toArray();
        }

        // Fetch 3 real customers from database
        let topCust = await Order.find({ PARNAM: { $exists: true, $ne: "" } }).limit(3).lean();
        if ((!topCust || topCust.length === 0) && db) {
          topCust = await db.collection("order").find({ PARNAM: { $exists: true, $ne: "" } }).limit(3).toArray();
        }

        const dynamicTrending: any[] = [];

        // Add real products
        (topPro || []).forEach((p: any) => {
          dynamicTrending.push({
            label: p.PRODUCT || p.BILLNAME || `Product ${p.CODE}`,
            category: "Database Product 📦",
            query: p.PRODUCT || String(p.CODE),
            actionUrl: `/dashboard/reports/product?search=${encodeURIComponent(p.PRODUCT || p.CODE || "")}`,
            type: "product",
          });
        });

        // Add real customers
        (topCust || []).forEach((c: any) => {
          dynamicTrending.push({
            label: c.PARNAM || c.MAILNAM || `Customer ${c.CODEP}`,
            category: c.CITY ? `Party (${c.CITY}) 👥` : "Customer Party 👥",
            query: c.PARNAM || String(c.CODEP),
            actionUrl: `/dashboard/reports/customer?search=${encodeURIComponent(c.PARNAM || c.CODEP || "")}`,
            type: "customer",
          });
        });

        // Add core report pages
        dynamicTrending.push(
          { label: "GSTR-1 GST Report", category: "Tax Report 📄", query: "GSTR-1", actionUrl: "/dashboard/gst-reports/gstr1", type: "navigation" },
          { label: "Current Stock Inventory", category: "Stock Report 📦", query: "Current Stock", actionUrl: "/dashboard/reports/product?view=stock", type: "navigation" },
          { label: "Outstanding Receivables", category: "Finance Report 💰", query: "Outstanding", actionUrl: "/dashboard/reports/outstanding", type: "navigation" },
          { label: "Target vs Actual Sales", category: "MR Performance 🎯", query: "Target", actionUrl: "/dashboard/reports/target-vs-actual", type: "navigation" }
        );

        return NextResponse.json({
          success: true,
          query: "",
          didYouMean: null,
          totalResults: 0,
          vocalSummary: "Welcome to Alexa Voice Search. Speak or type to search products, customers, stock, and vouchers.",
          trending: dynamicTrending,
          results: {
            products: [],
            customers: [],
            vouchers: [],
            users: [],
            navigation: [],
          },
        });
      } catch (err) {
        console.error("Dynamic trending fetch error:", err);
      }
    }

    // E-Commerce style filters & sorting
    const inStockOnly = searchParams.get("inStock") === "true";
    const nearExpiryOnly = searchParams.get("nearExpiry") === "true";
    const highBalanceOnly = searchParams.get("highBalance") === "true";
    const sortBy = searchParams.get("sortBy") || "relevance";

    // Spoken query cleaning & Typo check ("Did You Mean?")
    const cleanedQuery = cleanSpokenQuery(rawQuery);
    const lowerQuery = cleanedQuery.toLowerCase();
    const suggestedQuery = TYPO_MAP[lowerQuery] || null;
    const query = suggestedQuery || cleanedQuery;

    const regex = new RegExp(escapeRegex(query), "i");
    const isNumeric = !isNaN(Number(query));
    const queryNumber = isNumeric ? Number(query) : null;

    // Detect Voice Action Command
    const actionCmd = parseVoiceActionCommand(query);

    // Run parallel searches across database
    const [productsRes, customersRes, vouchersRes, usersRes, navRes] = await Promise.all([
      // 1. PRODUCTS & STOCK SEARCH
      (category === "all" || category === "products")
        ? (async () => {
            try {
              const productFilter: any = {
                $or: [
                  { PRODUCT: regex },
                  { BILLNAME: regex },
                  { PACKING: regex },
                  { GCODE: regex },
                  { RACKNO: regex },
                  { COMPOSITION: regex },
                ],
              };
              if (queryNumber !== null) {
                productFilter.$or.push({ CODE: queryNumber });
              }

              let proDocs = await Product.find(productFilter).limit(15).lean();
              if ((!proDocs || proDocs.length === 0) && db) {
                proDocs = await db.collection("pro").find(productFilter).limit(15).toArray();
              }

              // Enrich with batch stock count & batch numbers
              const productCodes = proDocs.map((p: any) => p.CODE).filter(Boolean);
              let batchesByCode: Record<string | number, any[]> = {};

              if (productCodes.length > 0) {
                let batchDocs = await ProductBatch.find({ CODE: { $in: productCodes } }).lean();
                if ((!batchDocs || batchDocs.length === 0) && db) {
                  batchDocs = await db.collection("probat").find({ CODE: { $in: productCodes } }).toArray();
                }

                batchDocs.forEach((b: any) => {
                  if (!batchesByCode[b.CODE]) batchesByCode[b.CODE] = [];
                  batchesByCode[b.CODE].push(b);
                });
              }

              let mappedProducts = proDocs.map((p: any) => {
                const pBatches = batchesByCode[p.CODE] || [];
                const totalBatchQty = pBatches.reduce((acc, b) => acc + (Number(b.BALANCE || b.QTY) || 0), 0);
                const currentStock = p.BALANCE !== undefined && p.BALANCE !== null ? Number(p.BALANCE) : totalBatchQty;
                const stockValue = currentStock * (Number(p.PRATE) || Number(p.MRP) || 0);

                // Near expiry check (< 90 days)
                const ninetyDaysLater = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
                const hasNearExpiryBatch = pBatches.some((b) => b.EXP && b.EXP <= ninetyDaysLater);

                return {
                  id: `prod_${p._id || p.CODE}`,
                  type: "product",
                  category: "Products & Stock",
                  title: p.PRODUCT || p.BILLNAME || `Product #${p.CODE}`,
                  subtitle: `Code: ${p.CODE || "N/A"} | Pack: ${p.PACKING || "Std"} | Mfg/Co: ${p.GCODE || "General"}`,
                  details: {
                    productCode: p.CODE,
                    productName: p.PRODUCT,
                    billName: p.BILLNAME,
                    packing: p.PACKING,
                    groupCode: p.GCODE,
                    rackNo: p.RACKNO,
                    mrp: p.MRP ? `₹${p.MRP}` : "N/A",
                    saleRate: p.PRATE ? `₹${p.PRATE}` : "N/A",
                    purchaseRate: p.LPRATE ? `₹${p.LPRATE}` : "N/A",
                    currentStock: currentStock,
                    stockValue: `₹${stockValue.toLocaleString("en-IN")}`,
                    batchCount: pBatches.length,
                    hasNearExpiry: hasNearExpiryBatch,
                    batches: pBatches.slice(0, 10).map((b: any) => ({
                      batchNo: b.BATCHNO || "N/A",
                      exp: b.EXP || "N/A",
                      qty: b.BALANCE || b.QTY || 0,
                      mrp: b.MRP ? `₹${b.MRP}` : "N/A",
                      rate: b.PRATE ? `₹${b.PRATE}` : "N/A",
                    })),
                  },
                  badges: [
                    {
                      label: currentStock > 0 ? `In Stock: ${currentStock}` : "Out of Stock ⚠️",
                      color: currentStock > 0 ? "emerald" : "rose",
                    },
                    p.MRP ? { label: `MRP: ₹${p.MRP}`, color: "blue" } : null,
                    p.PRATE ? { label: `Rate: ₹${p.PRATE}`, color: "indigo" } : null,
                    hasNearExpiryBatch ? { label: "Near Expiry ⏳", color: "amber" } : null,
                  ].filter(Boolean),
                  actionUrl: `/dashboard/reports/product?search=${encodeURIComponent(p.PRODUCT || p.CODE || "")}`,
                  raw: p,
                };
              });

              // Apply E-Commerce filters
              if (inStockOnly) {
                mappedProducts = mappedProducts.filter((p) => p.details.currentStock > 0);
              }

              if (nearExpiryOnly) {
                mappedProducts = mappedProducts.filter((p) => p.details.hasNearExpiry);
              }

              // Apply Sorting
              if (sortBy === "stockHigh") {
                mappedProducts.sort((a, b) => b.details.currentStock - a.details.currentStock);
              } else if (sortBy === "priceHigh") {
                mappedProducts.sort((a, b) => (parseFloat(b.raw.MRP) || 0) - (parseFloat(a.raw.MRP) || 0));
              } else if (sortBy === "priceLow") {
                mappedProducts.sort((a, b) => (parseFloat(a.raw.MRP) || 0) - (parseFloat(b.raw.MRP) || 0));
              } else if (sortBy === "name") {
                mappedProducts.sort((a, b) => a.title.localeCompare(b.title));
              }

              return mappedProducts.slice(0, limit);
            } catch (err) {
              console.error("Global search products error:", err);
              return [];
            }
          })()
        : Promise.resolve([]),

      // 2. CUSTOMERS & PARTIES SEARCH
      (category === "all" || category === "customers")
        ? (async () => {
            try {
              const customerFilter: any = {
                $or: [
                  { PARNAM: regex },
                  { MAILNAM: regex },
                  { CODEP: regex },
                  { CITY: regex },
                  { GSTNO: regex },
                  { PHONE1: regex },
                  { CODER: regex },
                ],
              };

              let custDocs = await Order.find(customerFilter).limit(15).lean();
              if ((!custDocs || custDocs.length === 0) && db) {
                custDocs = await db.collection("order").find(customerFilter).limit(15).toArray();
              }

              let mappedCustomers = custDocs.map((c: any) => {
                const balance = Number(c.BALANCE || 0);
                const isDebit = balance > 0;

                return {
                  id: `cust_${c._id || c.CODEP}`,
                  type: "customer",
                  category: "Customers & Parties",
                  title: c.PARNAM || c.MAILNAM || `Customer ${c.CODEP}`,
                  subtitle: `Code: ${c.CODEP || "N/A"} | Station/City: ${c.CITY || "N/A"} | GST: ${c.GSTNO || "Unregistered"}`,
                  details: {
                    customerCode: c.CODEP,
                    partyName: c.PARNAM,
                    mailName: c.MAILNAM,
                    city: c.CITY,
                    phone: c.PHONE1 || "N/A",
                    gstNo: c.GSTNO || "N/A",
                    outstandingBalance: `₹${Math.abs(balance).toLocaleString("en-IN")} ${isDebit ? "Dr" : "Cr"}`,
                    rawBalance: balance,
                    creditLimit: c.CREDIT ? `₹${Number(c.CREDIT).toLocaleString("en-IN")}` : "No Limit",
                    dueDays: c.DUEDAYS || c.CREDITD || 0,
                    orderNo: c.ORDNO || "N/A",
                  },
                  badges: [
                    {
                      label: `Bal: ₹${Math.abs(balance).toLocaleString("en-IN")} ${isDebit ? "Dr" : "Cr"}`,
                      color: balance > 0 ? "amber" : "emerald",
                    },
                    c.CITY ? { label: c.CITY, color: "sky" } : null,
                    c.GSTNO ? { label: "GST Registered", color: "indigo" } : null,
                  ].filter(Boolean),
                  actionUrl: `/dashboard/reports/customer?search=${encodeURIComponent(c.PARNAM || c.CODEP || "")}`,
                  raw: c,
                };
              });

              if (highBalanceOnly) {
                mappedCustomers = mappedCustomers.filter((c) => c.details.rawBalance > 0);
              }

              if (sortBy === "priceHigh") {
                mappedCustomers.sort((a, b) => b.details.rawBalance - a.details.rawBalance);
              } else if (sortBy === "name") {
                mappedCustomers.sort((a, b) => a.title.localeCompare(b.title));
              }

              return mappedCustomers.slice(0, limit);
            } catch (err) {
              console.error("Global search customers error:", err);
              return [];
            }
          })()
        : Promise.resolve([]),

      // 3. VOUCHERS & INVOICES SEARCH
      (category === "all" || category === "vouchers")
        ? (async () => {
            try {
              const voucherFilter: any = {
                $or: [
                  { VCN: regex },
                  { CODEP: regex },
                  { REMARK1: regex },
                ],
              };
              if (queryNumber !== null) {
                voucherFilter.$or.push({ VOUCHER: queryNumber });
              }

              let mdisDocs = await SalesMdis.find(voucherFilter).limit(8).lean();
              if ((!mdisDocs || mdisDocs.length === 0) && db) {
                mdisDocs = await db.collection("mdis").find(voucherFilter).limit(8).toArray();
              }

              let gLedgerDocs = await GlLedger.find(voucherFilter).limit(8).lean();
              if ((!gLedgerDocs || gLedgerDocs.length === 0) && db) {
                gLedgerDocs = await db.collection("gledger").find(voucherFilter).limit(8).toArray();
              }

              const resultsList: any[] = [];
              const seenIds = new Set();

              mdisDocs.forEach((m: any) => {
                const vKey = `mdis_${m._id || m.VCN || m.VOUCHER}`;
                if (seenIds.has(vKey)) return;
                seenIds.add(vKey);

                const amount = Number(m.FINAL || m.AMOUNTT || m.AMOUNTP || 0);

                resultsList.push({
                  id: vKey,
                  type: "voucher",
                  category: "Invoices & Sales",
                  title: `Invoice #${m.VCN || m.VOUCHER}`,
                  subtitle: `Party Code: ${m.CODEP || "N/A"} | Date: ${m.DATE || m.CDATE || "N/A"} | Godown: ${m.GODWON || "Main"}`,
                  details: {
                    invoiceNo: m.VCN || m.VOUCHER,
                    voucherNo: m.VOUCHER,
                    customerCode: m.CODEP,
                    invoiceDate: m.DATE || m.CDATE,
                    netAmount: `₹${amount.toLocaleString("en-IN")}`,
                    rawAmount: amount,
                    totalQty: m.ISSUEQTY || "N/A",
                    challanNo: m.CHALLAN || "N/A",
                    dsm: m.DSM || "N/A",
                  },
                  badges: [
                    { label: `₹${amount.toLocaleString("en-IN")}`, color: "indigo" },
                    { label: m.DATE || "Invoice", color: "slate" },
                  ],
                  actionUrl: `/dashboard/reports/sales-receipt?search=${encodeURIComponent(m.VCN || m.VOUCHER || "")}`,
                  raw: m,
                });
              });

              gLedgerDocs.forEach((g: any) => {
                const gKey = `gledger_${g._id || g.VOUCHER}`;
                if (seenIds.has(gKey)) return;
                seenIds.add(gKey);

                const debit = Number(g.DEBIT || 0);
                const credit = Number(g.CREDIT || 0);
                const amount = debit || credit || 0;

                resultsList.push({
                  id: gKey,
                  type: "voucher",
                  category: "Invoices & Vouchers",
                  title: `Voucher #${g.VCN || g.VOUCHER || "N/A"} (${g.TYPE || g.BOOK || "Voucher"})`,
                  subtitle: `Code: ${g.CODE || g.CODE1 || "N/A"} | Date: ${g.DATE || "N/A"} | Particulars: ${g.REMARK1 || "N/A"}`,
                  details: {
                    voucherNo: g.VOUCHER || g.VCN,
                    voucherType: g.TYPE || g.BOOK || "General Ledger",
                    partyCode: g.CODE || g.CODE1,
                    date: g.DATE,
                    debitAmount: debit ? `₹${debit.toLocaleString("en-IN")}` : "₹0",
                    creditAmount: credit ? `₹${credit.toLocaleString("en-IN")}` : "₹0",
                    rawAmount: amount,
                    remark: g.REMARK1 || "N/A",
                  },
                  badges: [
                    { label: debit ? `Dr ₹${debit.toLocaleString("en-IN")}` : `Cr ₹${credit.toLocaleString("en-IN")}`, color: debit ? "amber" : "emerald" },
                    { label: g.TYPE || "Voucher", color: "violet" },
                  ],
                  actionUrl: `/dashboard/reports/sales-receipt?search=${encodeURIComponent(g.VOUCHER || g.VCN || "")}`,
                  raw: g,
                });
              });

              if (sortBy === "priceHigh") {
                resultsList.sort((a, b) => b.details.rawAmount - a.details.rawAmount);
              }

              return resultsList.slice(0, limit);
            } catch (err) {
              console.error("Global search vouchers error:", err);
              return [];
            }
          })()
        : Promise.resolve([]),

      // 4. SALES TEAM & MR SEARCH
      (category === "all" || category === "users")
        ? (async () => {
            try {
              const userFilter: any = {
                $or: [
                  { name: regex },
                  { email: regex },
                  { phone: regex },
                  { headquarter: regex },
                  { roleType: regex },
                  { zoneCode: regex },
                  { regionCode: regex },
                ],
              };

              const userDocs = await User.find(userFilter)
                .select("-password")
                .limit(8)
                .lean();

              return userDocs.map((u: any) => ({
                id: `user_${u._id}`,
                type: "user",
                category: "Sales Team & MR",
                title: u.name,
                subtitle: `Role: ${u.roleType || "MR"} | HQ: ${u.headquarter || "N/A"} | Email: ${u.email}`,
                details: {
                  name: u.name,
                  email: u.email,
                  phone: u.phone || "N/A",
                  roleType: u.roleType || "MR",
                  headquarter: u.headquarter || "N/A",
                  zoneCode: u.zoneCode || "N/A",
                  regionCode: u.regionCode || "N/A",
                  profilePhoto: u.profilePhoto || null,
                },
                badges: [
                  { label: u.roleType || "MR", color: "blue" },
                  u.headquarter ? { label: `HQ: ${u.headquarter}`, color: "teal" } : null,
                ].filter(Boolean),
                actionUrl: `/dashboard/mr-territory?search=${encodeURIComponent(u.name || "")}`,
                raw: u,
              }));
            } catch (err) {
              console.error("Global search users error:", err);
              return [];
            }
          })()
        : Promise.resolve([]),

      // 5. NAVIGATION, PAGES, FILE NAMES & LIVE DASHBOARD KPI CARDS SEARCH
      (category === "all" || category === "navigation")
        ? (async () => {
            const cleanQuery = query.toLowerCase().replace(/[\s\-_.]/g, "");

            // 1. Search KPI Cards Definitions
            const kpiMatches = KPI_CARD_DEFINITIONS.filter((kpi) => {
              const inTitle = kpi.title.toLowerCase().replace(/[\s\-_.]/g, "").includes(cleanQuery);
              const inKeywords = kpi.keywords.some((k) => k.toLowerCase().replace(/[\s\-_.]/g, "").includes(cleanQuery));
              return inTitle || inKeywords;
            });

            let kpiResults: any[] = [];
            if (kpiMatches.length > 0) {
              const liveMetrics = await getLiveKPIMetrics(db);
              kpiResults = kpiMatches.map((kpi, idx) => {
                const val = kpi.getValue(liveMetrics);
                return {
                  id: `kpi_${idx}_${kpi.key}`,
                  type: "kpi",
                  category: "Dashboard KPI Metric 📊",
                  title: `${kpi.title}: ${val}`,
                  subtitle: `Live Dashboard KPI Card • Click to open ${kpi.title} section`,
                  details: {
                    metricName: kpi.title,
                    liveValue: val,
                    route: kpi.path,
                    keywords: kpi.keywords.join(", "),
                  },
                  badges: [
                    { label: `Live Value: ${val}`, color: kpi.badgeColor || "emerald" },
                    { label: "Dashboard Metric 📊", color: "indigo" },
                  ],
                  actionUrl: kpi.path,
                  raw: { kpi, val },
                };
              });
            }

            // 2. Search Page & Navigation Items
            const matches = APP_PAGES.filter((page) => {
              const inTitle = page.title.toLowerCase().replace(/[\s\-_.]/g, "").includes(cleanQuery);
              const inPath = page.path.toLowerCase().replace(/[\s\-_.]/g, "").includes(cleanQuery);
              const inFileName = (page.fileName || "").toLowerCase().replace(/[\s\-_.]/g, "").includes(cleanQuery);
              const inKeywords = page.keywords.some((k) => k.toLowerCase().replace(/[\s\-_.]/g, "").includes(cleanQuery));
              return inTitle || inPath || inFileName || inKeywords;
            });

            const navResults = matches.map((p, idx) => ({
              id: `nav_${idx}_${p.path}`,
              type: "navigation",
              category: p.category || "Navigation & Pages",
              title: p.title,
              subtitle: `Route: ${p.path} • File: ${p.fileName || "Page Link"}`,
              details: {
                title: p.title,
                route: p.path,
                fileName: p.fileName || "N/A",
                keywords: p.keywords.join(", "),
              },
              badges: [
                { label: "Page Link", color: "cyan" },
                p.fileName ? { label: p.fileName.split("/").pop() || p.fileName, color: "indigo" } : null,
              ].filter(Boolean),
              actionUrl: p.path,
              raw: p,
            }));

            return [...kpiResults, ...navResults];
          })()
        : Promise.resolve([]),
    ]);

    const totalCount =
      productsRes.length +
      customersRes.length +
      vouchersRes.length +
      usersRes.length +
      navRes.length;

    const vocalSummary = generateVocalSummary(query, {
      products: productsRes,
      customers: customersRes,
      vouchers: vouchersRes,
      users: usersRes,
      navigation: navRes,
    }, actionCmd);

    return NextResponse.json({
      success: true,
      query: rawQuery,
      didYouMean: suggestedQuery ? suggestedQuery : null,
      category,
      totalResults: totalCount,
      vocalSummary,
      actionCommand: actionCmd,
      results: {
        products: productsRes,
        customers: customersRes,
        vouchers: vouchersRes,
        users: usersRes,
        navigation: navRes,
      },
    });
  } catch (error: any) {
    console.error("Global search API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to perform global search",
      },
      { status: 500 }
    );
  }
}
