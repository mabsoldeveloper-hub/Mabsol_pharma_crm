/**
 * app/api/dashboard/compare/route.ts
 * ---------------------------------------------------------------------------
 * Single API endpoint that returns data for all 6 Comparison Dashboard
 * widgets in one response:
 *
 *   1. salesVsPurchase     -> MDIS.TYPE (S=Sale, P=Purchase) grouped by month
 *   2. collectionVsOutstanding
 *        - collections: GLEDGER.DEBIT/CREDIT grouped by month
 *        - outstanding: PENDINGS.BALANCE totals + DUEDAYS aging buckets
 *   3. productComparison   -> DIS grouped by CODE, joined to PRO for name
 *   4. companyComparison   -> DIS grouped by COMPANY
 *   5. monthlyComparison   -> MDIS.FINAL grouped by calendar month (all types)
 *   6. quarterlyComparison -> MDIS.FINAL grouped by Indian FY quarter (Apr-Mar)
 *
 * Optional query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * (applied to the parsed DATE field wherever the source table has a DATE)
 *
 * NOTE: Customer Comparison & State/Area Comparison are intentionally NOT
 * included — MDIS/DIS.CODEP does not match ORDER.SCODE (verified, zero
 * overlap) and AREA is empty across all tables in the current data. These
 * need a separate party/customer master collection to be added later.
 * ---------------------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { SalesDis, SalesMdis, Product, GLedger, Pendings } from "@/models/dashboardModels";

// Parses "YYYY-MM-DD" style strings safely inside an aggregation pipeline
const parsedDateStage = (field: string) => ({
    $addFields: {
        _dateParsed: {
            $dateFromString: { dateString: `$${field}`, onError: null, onNull: null },
        },
    },
});

const dateRangeMatch = (from: string | null, to: string | null) => {
    if (!from && !to) return null;
    const range: Record<string, Date> = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);
    return { $match: { _dateParsed: range } };
};

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const rangeStage = dateRangeMatch(from, to);

        // ---------------------------------------------------------------------
        // 1. SALES vs PURCHASE  (MDIS.TYPE: S / P, grouped by month)
        // ---------------------------------------------------------------------
        const salesVsPurchaseRaw = await SalesMdis.aggregate([
            { $match: { DATE: { $ne: null }, TYPE: { $in: ["S", "P"] } } },
            parsedDateStage("DATE"),
            { $match: { _dateParsed: { $ne: null } } },
            ...(rangeStage ? [rangeStage] : []),
            {
                $group: {
                    _id: {
                        month: { $dateToString: { format: "%Y-%m", date: "$_dateParsed" } },
                        type: "$TYPE",
                    },
                    total: { $sum: "$FINAL" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.month": 1 } },
        ]);

        const salesVsPurchaseMap = new Map<string, { month: string; sales: number; purchase: number }>();
        for (const row of salesVsPurchaseRaw) {
            const month = row._id.month;
            if (!salesVsPurchaseMap.has(month)) {
                salesVsPurchaseMap.set(month, { month, sales: 0, purchase: 0 });
            }
            const entry = salesVsPurchaseMap.get(month)!;
            if (row._id.type === "S") entry.sales = row.total;
            if (row._id.type === "P") entry.purchase = row.total;
        }
        const salesVsPurchase = Array.from(salesVsPurchaseMap.values()).sort((a, b) =>
            a.month.localeCompare(b.month)
        );

        // ---------------------------------------------------------------------
        // 2. COLLECTION vs OUTSTANDING
        // ---------------------------------------------------------------------
        const collectionsMonthly = await GLedger.aggregate([
            { $match: { DATE: { $ne: null } } },
            parsedDateStage("DATE"),
            { $match: { _dateParsed: { $ne: null } } },
            ...(rangeStage ? [rangeStage] : []),
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$_dateParsed" } },
                    debit: { $sum: "$DEBIT" },
                    credit: { $sum: "$CREDIT" },
                },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, month: "$_id", debit: 1, credit: 1 } },
        ]);

        const outstandingSummary = await Pendings.aggregate([
            {
                $group: {
                    _id: null,
                    totalOutstanding: { $sum: "$BALANCE" },
                    totalInvoices: { $sum: 1 },
                },
            },
        ]);

        const outstandingAging = await Pendings.aggregate([
            { $match: { BALANCE: { $gt: 0 } } },
            {
                $bucket: {
                    groupBy: "$DUEDAYS",
                    boundaries: [-Infinity, 0, 30, 60, 90, Infinity],
                    default: "Unknown",
                    output: { totalBalance: { $sum: "$BALANCE" }, count: { $sum: 1 } },
                },
            },
        ]);

        const bucketLabels: Record<string, string> = {
            "-Infinity": "Not Due",
            "0": "0-30 days",
            "30": "31-60 days",
            "60": "61-90 days",
            "90": "90+ days",
        };
        const outstandingAgingLabeled = outstandingAging.map((b) => ({
            bucket: bucketLabels[String(b._id)] ?? String(b._id),
            totalBalance: b.totalBalance,
            count: b.count,
        }));

        const collectionVsOutstanding = {
            collectionsMonthly,
            totalOutstanding: outstandingSummary[0]?.totalOutstanding ?? 0,
            totalPendingInvoices: outstandingSummary[0]?.totalInvoices ?? 0,
            aging: outstandingAgingLabeled,
        };

        // ---------------------------------------------------------------------
        // 3. PRODUCT COMPARISON  (DIS.CODE -> PRO.CODE)
        // ---------------------------------------------------------------------
        const productComparisonRaw = await SalesDis.aggregate([
            ...(from || to
                ? [
                    { $match: { DATE: { $ne: null } } },
                    parsedDateStage("DATE"),
                    { $match: { _dateParsed: { $ne: null } } },
                    ...(rangeStage ? [rangeStage] : []),
                ]
                : []),
            {
                $group: {
                    _id: "$CODE",
                    totalQty: { $sum: "$QTY" },
                    totalAmount: { $sum: "$AMMMOUNT" },
                },
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 15 },
        ]);

        const productCodes = productComparisonRaw.map((p) => p._id);
        const productDocs = await Product.find({ CODE: { $in: productCodes } })
            .select({ CODE: 1, PRODUCT: 1, GCODE: 1 })
            .lean();
        const productMap = new Map(productDocs.map((p: any) => [p.CODE, p]));

        const productComparison = productComparisonRaw.map((p) => ({
            code: p._id,
            productName: productMap.get(p._id)?.PRODUCT ?? "Unknown",
            qty: p.totalQty,
            amount: p.totalAmount,
        }));

        // ---------------------------------------------------------------------
        // 4. COMPANY COMPARISON  (DIS.COMPANY)
        // ---------------------------------------------------------------------
        const companyComparisonRaw = await SalesDis.aggregate([
            ...(from || to
                ? [
                    { $match: { DATE: { $ne: null } } },
                    parsedDateStage("DATE"),
                    { $match: { _dateParsed: { $ne: null } } },
                    ...(rangeStage ? [rangeStage] : []),
                ]
                : []),
            {
                $group: {
                    _id: "$COMPANY",
                    totalQty: { $sum: "$QTY" },
                    totalAmount: { $sum: "$AMMMOUNT" },
                },
            },
            { $sort: { totalAmount: -1 } },
        ]);

        const companyComparison = companyComparisonRaw.map((c) => ({
            company: c._id ?? "Unknown",
            qty: c.totalQty,
            amount: c.totalAmount,
        }));

        // ---------------------------------------------------------------------
        // 5. MONTHLY COMPARISON  (MDIS.FINAL, all TYPE combined)
        // ---------------------------------------------------------------------
        const monthlyComparison = await SalesMdis.aggregate([
            { $match: { DATE: { $ne: null } } },
            parsedDateStage("DATE"),
            { $match: { _dateParsed: { $ne: null } } },
            ...(rangeStage ? [rangeStage] : []),
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$_dateParsed" } },
                    totalAmount: { $sum: "$FINAL" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, month: "$_id", totalAmount: 1, count: 1 } },
        ]);

        // ---------------------------------------------------------------------
        // 6. QUARTERLY COMPARISON  (Indian FY: Apr-Jun=Q1 ... Jan-Mar=Q4)
        // ---------------------------------------------------------------------
        const quarterlyRaw = await SalesMdis.aggregate([
            { $match: { DATE: { $ne: null } } },
            parsedDateStage("DATE"),
            { $match: { _dateParsed: { $ne: null } } },
            ...(rangeStage ? [rangeStage] : []),
            {
                $addFields: {
                    _month: { $month: "$_dateParsed" },
                    _year: { $year: "$_dateParsed" },
                },
            },
            {
                $addFields: {
                    _fyQuarter: {
                        $switch: {
                            branches: [
                                { case: { $in: ["$_month", [4, 5, 6]] }, then: "Q1" },
                                { case: { $in: ["$_month", [7, 8, 9]] }, then: "Q2" },
                                { case: { $in: ["$_month", [10, 11, 12]] }, then: "Q3" },
                            ],
                            default: "Q4",
                        },
                    },
                    _fyYear: {
                        $cond: [{ $gte: ["$_month", 4] }, "$_year", { $subtract: ["$_year", 1] }],
                    },
                },
            },
            {
                $group: {
                    _id: { fy: "$_fyYear", quarter: "$_fyQuarter" },
                    totalAmount: { $sum: "$FINAL" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.fy": 1, "_id.quarter": 1 } },
        ]);

        const quarterlyComparison = quarterlyRaw.map((q) => ({
            label: `FY${q._id.fy}-${String(q._id.fy + 1).slice(-2)} ${q._id.quarter}`,
            totalAmount: q.totalAmount,
            count: q.count,
        }));

        return NextResponse.json({
            success: true,
            filters: { from, to },
            data: {
                salesVsPurchase,
                collectionVsOutstanding,
                productComparison,
                companyComparison,
                monthlyComparison,
                quarterlyComparison,
            },
            notes:
                "Customer Comparison & State/Area Comparison excluded — no reliable join between MDIS/DIS.CODEP and ORDER.SCODE, and AREA is empty in source data.",
        });
    } catch (err: any) {
        console.error("Dashboard compare API error:", err);
        return NextResponse.json(
            { success: false, error: err?.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}