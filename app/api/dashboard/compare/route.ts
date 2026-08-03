import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { SalesDis, SalesMdis, Product, GLedger, Pendings } from "@/models/dashboardModels";
import Company from "@/models/Company";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const restriction = await getMrTerritoryRestriction();

        const mdisMatch: any = combineFilters(
          companyVfpMatch,
          restriction.isMrRestricted
            ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
                ? { COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                : restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { CODEP: "NONE_MATCH" }
            : {}
        );

        const disMatch: any = combineFilters(
          companyVfpMatch,
          restriction.isMrRestricted
            ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
                ? { COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                : restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { CODEP: "NONE_MATCH" }
            : {}
        );

        const pendingsMatch: any = combineFilters(
          companyVfpMatch,
          restriction.isMrRestricted
            ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { ORD: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { ORD: "NONE_MATCH" }
            : {}
        );

        const gledgerMatch: any = combineFilters(
          companyVfpMatch,
          restriction.isMrRestricted
            ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { CODE: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { CODE: "NONE_MATCH" }
            : {}
        );

        let from = searchParams.get("from");
        let to = searchParams.get("to");

        if (!from || !to) {
            const fyRange = await getFYDateRange(searchParams);
            if (!from && fyRange.startDate) from = fyRange.startDate;
            if (!to && fyRange.endDate) to = fyRange.endDate;
        }

        const dateQueryMDIS = buildFYDateQuery("DATE", from, to);
        const dateQueryDIS = buildFYDateQuery("DATE", from, to);
        const dateQueryGLedger = buildFYDateQuery("DATE", from, to);

        // Fetch Company map for company codes
        const companyDocs = await Company.find({}, { GCODE: { $toString: "$GCODE" }, GNAME: 1, CCODE: 1, CNAME: 1 }).lean();
        const companyNameMap = new Map<string, string>();
        companyDocs.forEach((c: any) => {
            const name = String(c.CNAME || c.GNAME || "").trim();
            [c.GCODE, c.CCODE].forEach((k) => {
                if (k) {
                    const key = String(k).trim().toUpperCase();
                    if (key && !companyNameMap.has(key)) companyNameMap.set(key, name);
                }
            });
        });

        // ---------------------------------------------------------------------
        // 1. SALES vs PURCHASE (TYPE: S vs P)
        // ---------------------------------------------------------------------
        const salesVsPurchaseDocs = await SalesMdis.find(
            combineFilters(mdisMatch, dateQueryMDIS, { TYPE: { $in: ["S", "P"] } })
        ).lean();

        const salesVsPurchaseMap = new Map<string, { month: string; sales: number; purchase: number }>();
        let summaryGrossSales = 0;
        let summaryPurchases = 0;

        salesVsPurchaseDocs.forEach((doc: any) => {
            if (!doc.DATE) return;
            const monthStr = String(doc.DATE).slice(0, 7);
            if (!salesVsPurchaseMap.has(monthStr)) {
                salesVsPurchaseMap.set(monthStr, { month: monthStr, sales: 0, purchase: 0 });
            }
            const entry = salesVsPurchaseMap.get(monthStr)!;
            const amt = Number(doc.FINAL || 0);

            if (doc.TYPE === "S") {
                entry.sales += amt;
                summaryGrossSales += amt;
            } else if (doc.TYPE === "P") {
                entry.purchase += amt;
                summaryPurchases += amt;
            }
        });

        const salesVsPurchase = Array.from(salesVsPurchaseMap.values()).sort((a, b) =>
            a.month.localeCompare(b.month)
        );

        // ---------------------------------------------------------------------
        // SALES RETURNS & NET SALES
        // ---------------------------------------------------------------------
        const returnDocs = await SalesMdis.find(
            combineFilters(mdisMatch, dateQueryMDIS, { TYPE: "R" })
        ).lean();

        let summaryReturns = 0;
        returnDocs.forEach((doc: any) => {
            summaryReturns += Number(doc.FINAL || 0);
        });

        const summaryNetSales = summaryGrossSales - summaryReturns;

        // ---------------------------------------------------------------------
        // 2. COLLECTION vs OUTSTANDING & PAYMENTS
        // ---------------------------------------------------------------------
        const gledgerDocs = await GLedger.find(
            combineFilters(gledgerMatch, dateQueryGLedger, { BOOK: { $in: ["R", "P"] } })
        ).lean();

        const collectionsMonthlyMap = new Map<string, { month: string; debit: number; credit: number }>();
        let summaryCollections = 0;
        let summaryPayments = 0;

        gledgerDocs.forEach((doc: any) => {
            if (!doc.DATE) return;
            const monthStr = String(doc.DATE).slice(0, 7);
            if (!collectionsMonthlyMap.has(monthStr)) {
                collectionsMonthlyMap.set(monthStr, { month: monthStr, debit: 0, credit: 0 });
            }
            const entry = collectionsMonthlyMap.get(monthStr)!;
            const dr = Number(doc.DEBIT || 0);
            const cr = Number(doc.CREDIT || 0);

            if (doc.BOOK === "P" && doc.CD === "D") {
                entry.debit += dr; // Supplier Payments
                summaryPayments += dr;
            }
            if (doc.BOOK === "R" && doc.CD === "C") {
                entry.credit += cr; // Customer Collections
                summaryCollections += cr;
            }
        });

        const collectionsMonthly = Array.from(collectionsMonthlyMap.values()).sort((a, b) =>
            a.month.localeCompare(b.month)
        );

        // Creditor Purchase Outstanding
        const outstandingDocs = await Pendings.find(
            combineFilters(pendingsMatch, { ACGROUP: /^D/i, INVTYPE: "I", BALANCE: { $lt: 0 } })
        ).lean();

        const totalOutstanding = outstandingDocs.reduce(
            (sum: number, r: any) => sum + Math.abs(Number(r.BALANCE || 0)),
            0
        );
        const totalPendingInvoices = outstandingDocs.length;

        // Outstanding Aging
        const agingBuckets = [
            { bucket: "Not Due", min: -Infinity, max: 0, totalBalance: 0, count: 0 },
            { bucket: "0-30 days", min: 1, max: 30, totalBalance: 0, count: 0 },
            { bucket: "31-60 days", min: 31, max: 60, totalBalance: 0, count: 0 },
            { bucket: "61-90 days", min: 61, max: 90, totalBalance: 0, count: 0 },
            { bucket: "90+ days", min: 91, max: Infinity, totalBalance: 0, count: 0 },
        ];

        outstandingDocs.forEach((r: any) => {
            const days = Number(r.DUEDAYS || 0);
            const bal = Math.abs(Number(r.BALANCE || 0));
            const b = agingBuckets.find((bk) => days >= bk.min && days <= bk.max) || agingBuckets[4];
            b.totalBalance += bal;
            b.count++;
        });

        const aging = agingBuckets.map((b) => ({
            bucket: b.bucket,
            totalBalance: b.totalBalance,
            count: b.count,
        }));

        const collectionVsOutstanding = {
            collectionsMonthly,
            totalOutstanding,
            totalPendingInvoices,
            aging,
        };

        // ---------------------------------------------------------------------
        // 3. PRODUCT COMPARISON (SalesDis records)
        // ---------------------------------------------------------------------
        const productDisDocs = await SalesDis.find(
            combineFilters(disMatch, dateQueryDIS)
        ).lean();

        const productMapAgg = new Map<number, { code: number; qty: number; amount: number }>();
        const companyMapAgg = new Map<string, { company: string; qty: number; amount: number }>();

        productDisDocs.forEach((doc: any) => {
            const amt = Number(doc.AMMMOUNT || doc.AMOUNT || 0);
            const qty = Number(doc.QTY || 0);

            // Product aggregation
            const code = Number(doc.CODE || 0);
            if (code) {
                if (!productMapAgg.has(code)) {
                    productMapAgg.set(code, { code, qty: 0, amount: 0 });
                }
                const pEntry = productMapAgg.get(code)!;
                pEntry.qty += qty;
                pEntry.amount += amt;
            }

            // Company aggregation
            const compCode = String(doc.COMPANY || "Unknown").trim().toUpperCase();
            if (compCode) {
                const resolvedName = companyNameMap.get(compCode) || compCode;
                if (!companyMapAgg.has(resolvedName)) {
                    companyMapAgg.set(resolvedName, { company: resolvedName, qty: 0, amount: 0 });
                }
                const cEntry = companyMapAgg.get(resolvedName)!;
                cEntry.qty += qty;
                cEntry.amount += amt;
            }
        });

        const sortedProductAgg = Array.from(productMapAgg.values())
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 15);

        const productCodes = sortedProductAgg.map((p) => p.code);
        const productDetails = await Product.find({ CODE: { $in: productCodes } })
            .select({ CODE: 1, PRODUCT: 1 })
            .lean();
        const productNameMap = new Map(productDetails.map((p: any) => [p.CODE, p.PRODUCT]));

        const productComparison = sortedProductAgg.map((p) => ({
            code: p.code,
            productName: productNameMap.get(p.code) || `Product #${p.code}`,
            qty: p.qty,
            amount: p.amount,
        }));

        const companyComparison = Array.from(companyMapAgg.values()).sort((a, b) => b.amount - a.amount);

        // ---------------------------------------------------------------------
        // 5. MONTHLY COMPARISON (Gross Sales Turnover)
        // ---------------------------------------------------------------------
        const monthlySalesMap = new Map<string, { month: string; totalAmount: number; count: number }>();
        salesVsPurchaseDocs.forEach((doc: any) => {
            if (doc.TYPE !== "S" || !doc.DATE) return;
            const monthStr = String(doc.DATE).slice(0, 7);
            if (!monthlySalesMap.has(monthStr)) {
                monthlySalesMap.set(monthStr, { month: monthStr, totalAmount: 0, count: 0 });
            }
            const entry = monthlySalesMap.get(monthStr)!;
            entry.totalAmount += Number(doc.FINAL || 0);
            entry.count++;
        });

        const monthlyComparison = Array.from(monthlySalesMap.values()).sort((a, b) =>
            a.month.localeCompare(b.month)
        );

        // ---------------------------------------------------------------------
        // 6. QUARTERLY COMPARISON (Indian FY: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar)
        // ---------------------------------------------------------------------
        const quarterlyMap = new Map<string, { label: string; totalAmount: number; count: number }>();
        salesVsPurchaseDocs.forEach((doc: any) => {
            if (doc.TYPE !== "S" || !doc.DATE) return;
            const d = new Date(doc.DATE);
            const m = d.getMonth() + 1; // 1-12
            const y = d.getFullYear();
            if (isNaN(m) || isNaN(y)) return;

            let qLabel = "Q1";
            if ([7, 8, 9].includes(m)) qLabel = "Q2";
            else if ([10, 11, 12].includes(m)) qLabel = "Q3";
            else if ([1, 2, 3].includes(m)) qLabel = "Q4";

            const fyYear = m >= 4 ? y : y - 1;
            const key = `FY${fyYear}-${String(fyYear + 1).slice(-2)} ${qLabel}`;

            if (!quarterlyMap.has(key)) {
                quarterlyMap.set(key, { label: key, totalAmount: 0, count: 0 });
            }
            const entry = quarterlyMap.get(key)!;
            entry.totalAmount += Number(doc.FINAL || 0);
            entry.count++;
        });

        const quarterlyComparison = Array.from(quarterlyMap.values()).sort((a, b) =>
            a.label.localeCompare(b.label)
        );

        return NextResponse.json({
            success: true,
            filters: { from, to },
            summary: {
                totalSales: summaryGrossSales,
                salesReturns: summaryReturns,
                netSales: summaryNetSales,
                totalPurchases: summaryPurchases,
                totalOutstanding,
                totalPendingInvoices,
                totalCollections: summaryCollections,
                totalPayments: summaryPayments,
            },
            data: {
                salesVsPurchase,
                collectionVsOutstanding,
                productComparison,
                companyComparison,
                monthlyComparison,
                quarterlyComparison,
            },
        });
    } catch (err: any) {
        console.error("Dashboard compare API error:", err);
        return NextResponse.json(
            { success: false, error: err?.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}