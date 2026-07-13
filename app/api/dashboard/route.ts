import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";

import SalesDis from "@/models/SalesDis";
import SalesMdis from "@/models/SalesMdis";
import Pend from "@/models/Pend";
import GLedger from "@/models/GLedger";
import Order from "@/models/Order";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";

/* ------------------------------------------------------------------ */
/*  CONFIG — confirm these against real Sales/Receipt rows before      */
/*  trusting the numbers. Everything else below is derived from the    */
/*  sample documents you shared.                                       */
/* ------------------------------------------------------------------ */

// MDIS holds both Sales and Purchase vouchers. TRANSFER:"S" turned out
// to match zero rows (dashboard showed ₹0 everywhere), so this now
// excludes confirmed-Purchase rows (TRANSFER:"P") instead of trying to
// guess the exact "Sale" value. Sanity-check the resulting Total Sales
// number against your existing MDIS-based report — if it's too high
// (includes non-sale voucher types), tell me the real TRANSFER/TYPE
// value used on a genuine sale row and I'll tighten this back to an
// exact match.
const MDIS_SALE_FILTER = { TRANSFER: { $ne: "P" } };

// GLEDGER is a double-entry ledger: every transaction writes one CD:"C"
// row and one CD:"D" row, and both sides always sum to the same total
// (confirmed: {CD:"C"} sum === {CD:"D"} sum === the inflated number the
// dashboard was showing as "Total Collections"). So {CD:"C"} alone is
// just "the credit side of every transaction in the whole ledger" —
// sales, purchases, journal entries, bank transfers, everything — not
// money received from customers.
//
// CONFIRMED breakdown: GLEDGER.BOOK marks the register a row belongs to
// (S=Sales, R=Receipts, A/P/J=purchase/adjustment/journal). Even within
// BOOK:"R" (Receipts), some rows are internal bank transfers / owner
// capital entries, not customer payments (e.g. a sample row credited a
// "CAPITAL A/C" code, not a customer). The reliable definition of "money
// received from a customer" is:
//   BOOK:"R"  AND  CD:"C"  AND  CODE is a real customer code
// "real customer code" = GLEDGER.CODE matching ORDER.ORDNO where
// ORDER.SALDR === "Y" (same link used for Top Customers — see below).
// This filter is assembled at request time once customer codes are
// fetched (see customerCodes below); GLEDGER_BASE_FILTER only holds
// the static part.
const GLEDGER_BASE_FILTER = { BOOK: "R", CD: "C" };

// ORDER is a mixed party/ledger master (customers, suppliers, tax
// accounts all live here). SALDR:"Y" = "this account can be sold to"
// (= customer). Confirmed: 144 rows match this filter, which equals
// the Total Customers KPI already shown on the dashboard.
const CUSTOMER_FILTER = { SALDR: "Y" };

// Field in MDIS that links a sale voucher to its customer/party code.
// CONFIRMED against your sample exports: MDIS.CODEP values overlap
// almost entirely with ORDER.ORDNO values (NOT ORDER.CODE / SCODE /
// CODER — those don't match at all). So the join is:
//   MDIS.CODEP  ==  ORDER.ORDNO   (where ORDER.SALDR === "Y")
// GLEDGER.CODE was also confirmed to use the same ORDNO codes (e.g.
// GLEDGER row with CODE:"HW" lines up with ORDER.ORDNO:"HW").
const MDIS_CUSTOMER_FIELD = "CODEP";
const ORDER_CUSTOMER_JOIN_FIELD = "ORDNO";
const GLEDGER_CUSTOMER_FIELD = "CODE";

// The actual Mongo collection name behind the Order model (used in
// $lookup, which needs the raw collection name, not the model name).
const ORDER_COLLECTION_NAME = "vfp_new_folder_order";

/* ------------------------------------------------------------------ */

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function yearStartStr() {
  // Calendar year start. Swap to April 1 here if you run on Indian FY.
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}
function daysFromNowStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function sumField(model: any, match: Record<string, any>, field: string) {
  const [row] = await model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return row?.total ?? 0;
}

export async function GET() {
  await dbConnect();

  const today = todayStr();
  const monthStart = monthStartStr();
  const yearStart = yearStartStr();
  const near90 = daysFromNowStr(90);

  // Customer codes fetched up front — needed to build the real GLEDGER
  // collections filter (BOOK:"R", CD:"C", CODE in this list), so it has
  // to run before the main Promise.all below.
  const customerOrders = await Order.find({ ...CUSTOMER_FILTER }, { [ORDER_CUSTOMER_JOIN_FIELD]: 1 }).lean();
  const customerCodes = customerOrders
    .map((o: any) => o[ORDER_CUSTOMER_JOIN_FIELD])
    .filter(Boolean);

  const GLEDGER_COLLECTION_FILTER = {
    ...GLEDGER_BASE_FILTER,
    [GLEDGER_CUSTOMER_FIELD]: { $in: customerCodes },
  };

  const [
    // ---- KPI cards ----
    totalSales,
    todaySales,
    monthlySales,
    yearlySales,
    totalOutstanding,
    overdueAmount,
    totalCollections,
    totalCustomers,
    totalProducts,
    currentStock,
    nearExpiryBatches,
    expiredBatches,

    // ---- charts ----
    salesTrend,
    collectionTrend,
    outstandingAgingRaw,
    topProducts,
    stockStatusRaw,
    expiryStatusRaw,
    saleTypeDist,
    topCustomersRaw,

    // ---- analytics helpers ----
    invoiceCount,
    disMarginRow,
    stockValueRow,
    expiredStockValueRow,
    nearExpiryStockValueRow,
    lastMonthSales,
  ] = await Promise.all([
    sumField(SalesMdis, { ...MDIS_SALE_FILTER }, "FINAL"),
    sumField(SalesMdis, { ...MDIS_SALE_FILTER, DATE: today }, "FINAL"),
    sumField(SalesMdis, { ...MDIS_SALE_FILTER, DATE: { $gte: monthStart, $lte: today } }, "FINAL"),
    sumField(SalesMdis, { ...MDIS_SALE_FILTER, DATE: { $gte: yearStart, $lte: today } }, "FINAL"),
    sumField(Pend, {}, "FINAL"),
    sumField(Pend, { DDATE: { $lt: today } }, "FINAL"),
    sumField(GLedger, { ...GLEDGER_COLLECTION_FILTER }, "CREDIT"),
    Order.countDocuments({ ...CUSTOMER_FILTER }),
    Product.countDocuments({}),
    sumField(Product, {}, "BALANCE"),
    ProductBatch.countDocuments({ EXP: { $ne: null, $gte: today, $lte: near90 } }),
    ProductBatch.countDocuments({ EXP: { $ne: null, $lt: today } }),

    // Sales Trend — last 12 months
    SalesMdis.aggregate([
      { $match: { ...MDIS_SALE_FILTER } },
      { $group: { _id: { $substr: ["$DATE", 0, 7] }, total: { $sum: "$FINAL" } } },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),

    // Collection Trend — last 12 months
    GLedger.aggregate([
      { $match: { ...GLEDGER_COLLECTION_FILTER } },
      { $group: { _id: { $substr: ["$DATE", 0, 7] }, total: { $sum: "$CREDIT" } } },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),

    // Outstanding Aging — raw rows, bucketed in JS below (DUEDAYS varies per voucher)
    Pend.find({}, { FINAL: 1, DDATE: 1 }).lean(),

    // Top 10 Products — DIS joined to PRO by CODE
    // NOTE: $lookup "from" must be the actual Mongo collection name for
    // Product (e.g. "vfp_new_folder_pro") — check your Product.ts schema's
    // `collection` option and update the string below if it differs.
    SalesDis.aggregate([
      { $group: { _id: "$CODE", qty: { $sum: "$QTY" }, amount: { $sum: "$AMMMOUNT" } } },
      { $sort: { amount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "vfp_new_folder_pro",
          localField: "_id",
          foreignField: "CODE",
          as: "product",
        },
      },
      {
        $project: {
          code: "$_id",
          qty: 1,
          amount: 1,
          name: { $arrayElemAt: ["$product.PRODUCT", 0] },
          billName: { $arrayElemAt: ["$product.BILLNAME", 0] },
        },
      },
    ]),

    // Stock Status — raw BALANCE/MINIMUM, bucketed in JS
    Product.find({}, { BALANCE: 1, MINIMUM: 1 }).lean(),

    // Expiry Status — raw EXP/BALANCE, bucketed in JS
    ProductBatch.find({}, { EXP: 1, BALANCE: 1 }).lean(),

    SalesMdis.aggregate([
      { $match: { ...MDIS_SALE_FILTER, TYPE: { $ne: null } } },
      { $group: { _id: "$TYPE", amount: { $sum: "$FINAL" } } },
      { $match: { amount: { $ne: 0 } } },
      { $sort: { amount: -1 } },
      { $limit: 8 },
    ]),

    // Top 10 Customers — MDIS.CODEP joins to ORDER.ORDNO (confirmed match,
    // see MDIS_CUSTOMER_FIELD / ORDER_CUSTOMER_JOIN_FIELD notes above).
    SalesMdis.aggregate([
      { $match: { ...MDIS_SALE_FILTER, [MDIS_CUSTOMER_FIELD]: { $ne: null } } },
      { $group: { _id: `$${MDIS_CUSTOMER_FIELD}`, amount: { $sum: "$FINAL" } } },
      { $sort: { amount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: ORDER_COLLECTION_NAME,
          localField: "_id",
          foreignField: ORDER_CUSTOMER_JOIN_FIELD,
          as: "customer",
        },
      },
      {
        $project: {
          code: "$_id",
          amount: 1,
          name: { $arrayElemAt: ["$customer.PARNAM", 0] },
        },
      },
    ]),

    // Distinct invoice count for Avg Invoice Value
    SalesMdis.aggregate([
      { $match: { ...MDIS_SALE_FILTER } },
      { $group: { _id: "$VOUCHER" } },
      { $count: "count" },
    ]),

    // Gross margin approx: DIS.AMMMOUNT (sale value) - QTY*LPRATE (cost)
    SalesDis.aggregate([
      {
        $group: {
          _id: null,
          revenue: { $sum: "$AMMMOUNT" },
          cost: { $sum: { $multiply: ["$QTY", "$LPRATE"] } },
        },
      },
    ]),

    // Stock Value = BALANCE * PRATE
    Product.aggregate([
      { $group: { _id: null, value: { $sum: { $multiply: ["$BALANCE", "$PRATE"] } } } },
    ]),

    // Expired Stock Value
    ProductBatch.aggregate([
      { $match: { EXP: { $ne: null, $lt: today } } },
      { $group: { _id: null, value: { $sum: { $multiply: ["$BALANCE", "$PRATE"] } } } },
    ]),

    // Near Expiry Stock Value
    ProductBatch.aggregate([
      { $match: { EXP: { $ne: null, $gte: today, $lte: near90 } } },
      { $group: { _id: null, value: { $sum: { $multiply: ["$BALANCE", "$PRATE"] } } } },
    ]),

    // Last month sales, for Monthly Growth %
    (async () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const lmStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const lmEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-31`;
      return sumField(SalesMdis, { ...MDIS_SALE_FILTER, DATE: { $gte: lmStart, $lte: lmEnd } }, "FINAL");
    })(),
  ]);

  // ---- Outstanding Aging buckets ----
  const agingBuckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const row of outstandingAgingRaw as any[]) {
    if (!row.DDATE) continue;
    const diffDays = Math.floor(
      (new Date(today).getTime() - new Date(row.DDATE).getTime()) / 86400000
    );
    const amt = row.FINAL ?? 0;
    if (diffDays <= 0) agingBuckets.current += amt;
    else if (diffDays <= 30) agingBuckets["1-30"] += amt;
    else if (diffDays <= 60) agingBuckets["31-60"] += amt;
    else if (diffDays <= 90) agingBuckets["61-90"] += amt;
    else agingBuckets["90+"] += amt;
  }

  // ---- Stock Status buckets ----
  const stockBuckets = { inStock: 0, lowStock: 0, zeroStock: 0, negativeStock: 0 };
  for (const row of stockStatusRaw as any[]) {
    const bal = row.BALANCE ?? 0;
    const min = row.MINIMUM ?? 0;
    if (bal < 0) stockBuckets.negativeStock++;
    else if (bal === 0) stockBuckets.zeroStock++;
    else if (min > 0 && bal <= min) stockBuckets.lowStock++;
    else stockBuckets.inStock++;
  }

  // ---- Expiry Status buckets ----
  const expiryBuckets = { expired: 0, "0-30": 0, "31-90": 0, "90+": 0, noExpiry: 0 };
  for (const row of expiryStatusRaw as any[]) {
    if (!row.EXP) {
      expiryBuckets.noExpiry++;
      continue;
    }
    const diffDays = Math.floor(
      (new Date(row.EXP).getTime() - new Date(today).getTime()) / 86400000
    );
    if (diffDays < 0) expiryBuckets.expired++;
    else if (diffDays <= 30) expiryBuckets["0-30"]++;
    else if (diffDays <= 90) expiryBuckets["31-90"]++;
    else expiryBuckets["90+"]++;
  }

  // ---- Analytics ----
  const invCount = invoiceCount[0]?.count || 1;
  const avgInvoiceValue = totalSales / invCount;
  const dayOfMonth = new Date().getDate();
  const avgDailySales = monthlySales / dayOfMonth;
  const avgCustomerSale = totalCustomers ? totalSales / totalCustomers : 0;
  const stockValue = stockValueRow[0]?.value ?? 0;
  const expiredStockValue = expiredStockValueRow[0]?.value ?? 0;
  const nearExpiryStockValue = nearExpiryStockValueRow[0]?.value ?? 0;
  const grossMargin = disMarginRow[0] ? disMarginRow[0].revenue - disMarginRow[0].cost : 0;
  const collectionEfficiency = totalSales ? (totalCollections / totalSales) * 100 : 0;
  const monthlyGrowth = lastMonthSales
    ? ((monthlySales - lastMonthSales) / lastMonthSales) * 100
    : 0;

  return NextResponse.json({
    kpis: {
      totalSales,
      todaySales,
      monthlySales,
      yearlySales,
      totalOutstanding,
      overdueAmount,
      totalCollections,
      totalCustomers,
      totalProducts,
      currentStock,
      nearExpiryBatches,
      expiredBatches,
    },
    charts: {
      salesTrend: salesTrend.map((r: any) => ({ month: r._id, total: r.total })),
      collectionTrend: collectionTrend.map((r: any) => ({ month: r._id, total: r.total })),
      outstandingAging: Object.entries(agingBuckets).map(([bucket, total]) => ({ bucket, total })),
      topProducts: topProducts.map((p: any) => ({
        name: p.name || p.billName || `Code ${p.code}`,
        qty: p.qty,
        amount: p.amount,
      })),
      stockStatus: Object.entries(stockBuckets).map(([status, count]) => ({ status, count })),
      expiryStatus: Object.entries(expiryBuckets).map(([status, count]) => ({ status, count })),
      saleTypeDistribution: saleTypeDist.map((s: any) => ({
        name: `Type ${s._id}`,
        amount: s.amount,
      })),
      monthlyGrowth,
      topCustomers: topCustomersRaw.map((c: any) => ({
        name: (c.name || `Code ${c.code}`).trim(),
        amount: c.amount,
      })),
    },
    analytics: {
      avgInvoiceValue,
      avgDailySales,
      avgCustomerSale,
      stockValue,
      expiredStockValue,
      nearExpiryStockValue,
      grossMargin,
      collectionEfficiency,
    },
  });
}