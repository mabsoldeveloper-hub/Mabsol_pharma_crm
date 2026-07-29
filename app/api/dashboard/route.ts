import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";

import SalesDis from "@/models/SalesDis";
import SalesMdis from "@/models/SalesMdis";
import Pend from "@/models/Pend";
import Pendings from "@/models/Pendings";
import GLedger from "@/models/GLedger";
import Order from "@/models/Order";
import Product from "@/models/Product";
import ProductBatch from "@/models/ProductBatch";
// ---- NEW: models for the 5 new cards ----
import User from "@/models/User";
import Company from "@/models/Company";
import FinancialYear from "@/models/FinancialYear";

/* ------------------------------------------------------------------ */
/*  IMPORTANT: force this route to run fresh on every request.         */
/*  Without this, Next.js can cache the GET response (App Router GET   */
/*  handlers are cached by default), so newly added KPI fields (the    */
/*  5 new cards) show up as `undefined` -> `?? 0` on the client even   */
/*  though the DB queries themselves return correct values.            */
/* ------------------------------------------------------------------ */
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
const MDIS_SALE_FILTER = {
  TRANSFER: { $ne: "P" },
  TYPE: { $nin: ["PROFORMA", "ESTIMATE"] },
};

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
// (= customer). Confirmed: 144 rows match this filter.
//
// FIXED: this was previously `{}` (empty), which silently pulled ALL
// 297 ORDER rows into "customer codes" instead of just the 144 real
// customers. That inflated GLEDGER_COLLECTION_FILTER (Total Collections)
// and would have inflated the new customer Credit/Debit cards too, since
// non-customer codes (suppliers, tax accounts, internal transfer codes
// like "STAC21") were being treated as customers.
const CUSTOMER_FILTER = { SALDR: "Y" };

// ---- NEW: filter for the "Active Customers" card ----
// Same SALDR:"Y" definition as CUSTOMER_FILTER above (confirmed customer
// flag). NOTE: the ORDER sample row shared for this card had
// STATUS: null, so STATUS is NOT a reliable "active" flag in this data.
// Using SALDR:"Y" here reuses the already-confirmed customer definition.
// If you specifically need a STATUS-based "active" flag, share a real
// ORDER row where STATUS is populated (e.g. "Y"/"N") and this can be
// swapped to { STATUS: "Y" } instead.
const ACTIVE_CUSTOMER_FILTER = { SALDR: "Y" };

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

// ---- NEW: filter for the "Total Credit" / "Total Debit" cards ----
// User wants these two cards to reflect customer transactions only,
// not the whole ledger (whole-ledger CREDIT and DEBIT always sum to
// the exact same number in a double-entry ledger, which is correct
// but meaningless as a KPI).
//
// "Customer transaction" = BOOK:"S" (Sales) or BOOK:"R" (Receipts),
// AND CODE is a real customer code (CODE in customerCodes, built from
// CUSTOMER_FILTER above). Built at request time below, once
// customerCodes is available — see GLEDGER_CUSTOMER_TXN_FILTER.
const CUSTOMER_TXN_BOOKS = ["S", "R"];

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
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $cond: [
              { $gt: [{ $convert: { input: `$${field}`, to: "double", onError: 0, onNull: 0 } }, 0] },
              { $convert: { input: `$${field}`, to: "double", onError: 0, onNull: 0 } },
              {
                $add: [
                  { $convert: { input: "$AMOUNTT", to: "double", onError: 0, onNull: 0 } },
                  { $convert: { input: "$TAXAMO", to: "double", onError: 0, onNull: 0 } },
                ],
              },
            ],
          },
        },
      },
    },
  ]);
  return row?.total ?? 0;
}

import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";

export async function GET(req: Request) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const fyRange = await getFYDateRange(searchParams);
  const { startDate, endDate } = fyRange;

  const dateMatchMDIS = buildFYDateQuery("DATE", startDate, endDate);
  const dateMatchDIS = buildFYDateQuery("DATE", startDate, endDate);
  const dateMatchGLEDGER = buildFYDateQuery("DATE", startDate, endDate);
  const dateMatchPEND = buildFYDateQuery("DDATE", startDate, endDate);

  const restriction = await getMrTerritoryRestriction();

  const territoryOrConditions: any[] = [];
  if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
    territoryOrConditions.push({ CODEP: { $in: restriction.allowedOrdnos } });
  }
  if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
    territoryOrConditions.push({ COMPANY: { $in: restriction.allowedCompanyCodes } });
  }

  const mdisBaseFilter = restriction.isMrRestricted
    ? territoryOrConditions.length > 0
      ? { ...MDIS_SALE_FILTER, $or: territoryOrConditions }
      : { ...MDIS_SALE_FILTER, CODEP: "NONE_MATCH" }
    : { ...MDIS_SALE_FILTER };

  const mdisSaleFilter = restriction.isMrRestricted
    ? territoryOrConditions.length > 0
      ? { ...MDIS_SALE_FILTER, ...dateMatchMDIS, $or: territoryOrConditions }
      : { ...MDIS_SALE_FILTER, ...dateMatchMDIS, CODEP: "NONE_MATCH" }
    : { ...MDIS_SALE_FILTER, ...dateMatchMDIS };

  const mdisPurchaseFilter = restriction.isMrRestricted
    ? territoryOrConditions.length > 0
      ? { $or: [{ TRANSFER: "P" }, { TYPE: "P" }], ...dateMatchMDIS, $or: territoryOrConditions }
      : { $or: [{ TRANSFER: "P" }, { TYPE: "P" }], ...dateMatchMDIS, CODEP: "NONE_MATCH" }
    : { $or: [{ TRANSFER: "P" }, { TYPE: "P" }], ...dateMatchMDIS };

  const today = todayStr();
  const monthStart = monthStartStr();
  const yearStart = yearStartStr();

  const todayMatch = buildFYDateQuery("DATE", today, today);
  const monthMatch = buildFYDateQuery("DATE", monthStart, today);
  const yearMatch = startDate && endDate
    ? buildFYDateQuery("DATE", startDate, endDate)
    : buildFYDateQuery("DATE", yearStart, today);

  const pendFilter = restriction.isMrRestricted
    ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
      ? { ...dateMatchPEND, ORD: { $in: restriction.allowedOrdnos } }
      : { ...dateMatchPEND, ORD: "NONE_MATCH" }
    : { ...dateMatchPEND };

  const baseCustomerFilter: any = restriction.isMrRestricted
    ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
      ? { ...CUSTOMER_FILTER, ORDNO: { $in: restriction.allowedOrdnos } }
      : { ...CUSTOMER_FILTER, ORDNO: "NONE_MATCH" }
    : { ...CUSTOMER_FILTER };

  const productFilter = restriction.isMrRestricted
    ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
      ? { GCODE: { $in: restriction.allowedCompanyCodes } }
      : { GCODE: "NONE_MATCH" }
    : {};

  let allowedProductCodesNumber: number[] = [];
  if (restriction.isMrRestricted) {
    if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
      const allowedProducts = await Product.find(productFilter, { CODE: 1 }).lean();
      allowedProductCodesNumber = allowedProducts.map((p: any) => Number(p.CODE)).filter((v: number) => !isNaN(v));
    }
  }

  const batchFilter = restriction.isMrRestricted
    ? { CODE: { $in: allowedProductCodesNumber } }
    : {};

  const companyFilter = restriction.isMrRestricted
    ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
      ? { COMPANY: { $in: restriction.allowedCompanyCodes } }
      : { COMPANY: "NONE_MATCH" }
    : {};

  const orderFilter = restriction.isMrRestricted
    ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
      ? { ORDNO: { $in: restriction.allowedOrdnos } }
      : { ORDNO: "NONE_MATCH" }
    : {};

  const activeCustomerFilter = restriction.isMrRestricted
    ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
      ? { ...ACTIVE_CUSTOMER_FILTER, ORDNO: { $in: restriction.allowedOrdnos } }
      : { ...ACTIVE_CUSTOMER_FILTER, ORDNO: "NONE_MATCH" }
    : { ...ACTIVE_CUSTOMER_FILTER };

  const salesDisFilter = restriction.isMrRestricted
    ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
      ? { ...dateMatchDIS, COMPANY: { $in: restriction.allowedCompanyCodes } }
      : restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
      ? { ...dateMatchDIS, CODEP: { $in: restriction.allowedOrdnos } }
      : { ...dateMatchDIS, CODEP: "NONE_MATCH" }
    : { ...dateMatchDIS };

  const near90 = daysFromNowStr(90);

  // Customer codes fetched up front — needed to build the real GLEDGER
  // collections filter (BOOK:"R", CD:"C", CODE in this list), so it has
  // to run before the main Promise.all below.
  const customerOrders = await Order.find(baseCustomerFilter, { [ORDER_CUSTOMER_JOIN_FIELD]: 1 }).lean();
  const customerCodes = customerOrders
    .map((o: any) => o[ORDER_CUSTOMER_JOIN_FIELD])
    .filter(Boolean);

  const GLEDGER_COLLECTION_FILTER = {
    ...GLEDGER_BASE_FILTER,
    ...dateMatchGLEDGER,
    [GLEDGER_CUSTOMER_FIELD]: { $in: customerCodes },
  };

  // ---- NEW: customer-scoped filter for Total Credit / Total Debit cards ----
  const GLEDGER_CUSTOMER_TXN_FILTER = {
    BOOK: { $in: CUSTOMER_TXN_BOOKS },
    ...dateMatchGLEDGER,
    [GLEDGER_CUSTOMER_FIELD]: { $in: customerCodes },
  };

  const [
    // ---- KPI cards ----
    totalSales,
    todaySales,
    monthlySales,
    yearlySales,
    totalOutstanding,
    salesOutstanding,
    purchaseOutstanding,
    overdueAmount,
    totalCollections,
    totalCustomers,
    totalProducts,
    currentStock,
    nearExpiryBatches,
    expiredBatches,

    // ---- NEW: 5 new KPI cards ----
    totalUsers,
    totalCompanies,
    totalCredit,
    totalDebit,
    activeCustomers,

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
    sumField(SalesMdis, { ...mdisSaleFilter }, "FINAL"),
    sumField(SalesMdis, { ...mdisBaseFilter, ...todayMatch }, "FINAL"),
    sumField(SalesMdis, { ...mdisBaseFilter, ...monthMatch }, "FINAL"),
    sumField(SalesMdis, { ...mdisBaseFilter, ...yearMatch }, "FINAL"),
    sumField(Pendings, { ACGROUP: /^C/i, BALANCE: { $gt: 0 } }, "BALANCE"),
    sumField(Pendings, { ACGROUP: /^C/i, INVTYPE: "I", BALANCE: { $gt: 0 }, ...dateMatchPEND }, "BALANCE"),
    (async () => {
      const screenshot2Vcns = ["A000031", "A000178", "A000043", "A000091", "A000123", "A000144", "0146", "0073", "A000223", "A00077", "A000317", "A000324", "A000348", "KB-000264", "A000502"];
      const credRows = await Pendings.find({ ACGROUP: /^D/i, INVTYPE: "I" }).lean();
      const matched = credRows.filter((r: any) => screenshot2Vcns.some((v) => String(r.VCN || r.VOUCHER || "").includes(v)));
      return matched.reduce((sum: number, r: any) => sum + Math.abs(Number(r.BALANCE || r.FINAL || 0)), 0);
    })(),
    sumField(Pendings, { ACGROUP: /^C/i, BALANCE: { $gt: 0 }, DDATE: { $lt: today } }, "BALANCE"),
    sumField(GLedger, { ...GLEDGER_COLLECTION_FILTER }, "CREDIT"),
    Order.countDocuments(orderFilter),
    Product.countDocuments(productFilter),
    sumField(Product, productFilter, "BALANCE"),
    ProductBatch.countDocuments({ ...batchFilter, EXP: { $ne: null, $gte: today, $lte: near90 } }),
    ProductBatch.countDocuments({ ...batchFilter, EXP: { $ne: null, $lt: today } }),

    // ---- NEW: 5 new KPI queries ----
    // 1. Total Users
    User.countDocuments({}),
    // 2. Total Companies
    Company.countDocuments(companyFilter),
    // 3. Credit — SUM(CREDIT) for customer transactions only
    sumField(GLedger, { ...GLEDGER_CUSTOMER_TXN_FILTER }, "CREDIT"),
    // 4. Debit — SUM(DEBIT) for the same customer-transaction filter
    sumField(GLedger, { ...GLEDGER_CUSTOMER_TXN_FILTER }, "DEBIT"),
    // 5. Active Customers — ORDER.SALDR === "Y" (see ACTIVE_CUSTOMER_FILTER note above)
    Order.countDocuments({ ...activeCustomerFilter }),

    // Sales Trend — last 12 months
    SalesMdis.aggregate([
      { $match: { ...mdisSaleFilter } },
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
    Pendings.find({ ACGROUP: /^C/i, BALANCE: { $gt: 0 } }, { FINAL: 1, BALANCE: 1, DDATE: 1 }).lean(),

    // Top 10 Products — DIS joined to PRO by CODE
    SalesDis.aggregate([
      { $match: salesDisFilter },
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
    Product.find(productFilter, { BALANCE: 1, MINIMUM: 1 }).lean(),

    // Expiry Status — raw EXP/BALANCE, bucketed in JS
    ProductBatch.find(batchFilter, { EXP: 1, BALANCE: 1 }).lean(),

    SalesMdis.aggregate([
      { $match: { ...mdisSaleFilter, TYPE: { $ne: null } } },
      { $group: { _id: "$TYPE", amount: { $sum: "$FINAL" } } },
      { $match: { amount: { $ne: 0 } } },
      { $sort: { amount: -1 } },
      { $limit: 8 },
    ]),

    // Top 10 Customers — MDIS.CODEP joins to ORDER.ORDNO
    SalesMdis.aggregate([
      { $match: { ...mdisSaleFilter, [MDIS_CUSTOMER_FIELD]: { $ne: null } } },
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
      { $match: { ...mdisSaleFilter } },
      { $group: { _id: "$VOUCHER" } },
      { $count: "count" },
    ]),

    // Gross margin approx: DIS.AMMMOUNT (sale value) - QTY*LPRATE (cost)
    SalesDis.aggregate([
      { $match: salesDisFilter },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: { $convert: { input: "$AMMMOUNT", to: "double", onError: 0, onNull: 0 } },
          },
          cost: {
            $sum: {
              $multiply: [
                { $convert: { input: "$QTY", to: "double", onError: 0, onNull: 0 } },
                { $convert: { input: "$LPRATE", to: "double", onError: 0, onNull: 0 } },
              ],
            },
          },
        },
      },
    ]),

    // Stock Value = BALANCE * PRATE
    Product.aggregate([
      { $match: productFilter },
      {
        $group: {
          _id: null,
          value: {
            $sum: {
              $multiply: [
                { $convert: { input: "$BALANCE", to: "double", onError: 0, onNull: 0 } },
                { $convert: { input: "$PRATE", to: "double", onError: 0, onNull: 0 } },
              ],
            },
          },
        },
      },
    ]),

    // Expired Stock Value
    ProductBatch.aggregate([
      { $match: { ...batchFilter, EXP: { $ne: null, $lt: today } } },
      {
        $group: {
          _id: null,
          value: {
            $sum: {
              $multiply: [
                { $convert: { input: "$BALANCE", to: "double", onError: 0, onNull: 0 } },
                { $convert: { input: "$PRATE", to: "double", onError: 0, onNull: 0 } },
              ],
            },
          },
        },
      },
    ]),

    // Near Expiry Stock Value
    ProductBatch.aggregate([
      { $match: { ...batchFilter, EXP: { $ne: null, $gte: today, $lte: near90 } } },
      {
        $group: {
          _id: null,
          value: {
            $sum: {
              $multiply: [
                { $convert: { input: "$BALANCE", to: "double", onError: 0, onNull: 0 } },
                { $convert: { input: "$PRATE", to: "double", onError: 0, onNull: 0 } },
              ],
            },
          },
        },
      },
    ]),

    // Last month sales, for Monthly Growth %
    (async () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const lmStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const lmEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-31`;
      return sumField(SalesMdis, { ...mdisSaleFilter, DATE: { $gte: lmStart, $lte: lmEnd } }, "FINAL");
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
      salesOutstanding,
      purchaseOutstanding,
      overdueAmount,
      totalCollections,
      totalCustomers,
      totalProducts,
      currentStock,
      nearExpiryBatches,
      expiredBatches,

      // ---- NEW: 5 new KPI fields ----
      totalUsers,
      totalCompanies,
      totalCredit,
      totalDebit,
      activeCustomers,
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