import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { SalesDis, SalesMdis, Product, GLedger } from "@/models/dashboardModels";
import Company from "@/models/Company";
import FinancialYear from "@/models/FinancialYear";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { buildFYDateQuery } from "@/lib/financialYearHelper";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

// ─────────────────────────────────────────────────────────────────────────────
// Color palette — one per FY slot (max 6 FYs)
// ─────────────────────────────────────────────────────────────────────────────
const FY_COLORS = ["#3B82F6", "#22C55E", "#F59E0B", "#A855F7", "#EF4444", "#06B6D4"];

// Indian FY month order: Apr=1 … Mar=12
const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

function calendarMonthToFYIndex(calMonth: number): number {
    // calMonth: 1-12 (Jan=1)
    // FY index:  Apr=0, May=1, ..., Mar=11
    return calMonth >= 4 ? calMonth - 4 : calMonth + 8;
}

function fyIndexLabel(idx: number): string {
    return MONTH_LABELS[idx] ?? `M${idx + 1}`;
}

function fyQuarterLabel(calMonth: number): string {
    if ([4, 5, 6].includes(calMonth)) return "Q1 (Apr-Jun)";
    if ([7, 8, 9].includes(calMonth)) return "Q2 (Jul-Sep)";
    if ([10, 11, 12].includes(calMonth)) return "Q3 (Oct-Dec)";
    return "Q4 (Jan-Mar)";
}

// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);

        // ── Parse requested FY IDs (comma-separated) ──────────────────────────
        const fyIdsParam = searchParams.get("fyIds") || "";
        const fyIds = fyIdsParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        if (fyIds.length === 0) {
            return NextResponse.json(
                { success: false, error: "At least one fyId is required. Pass ?fyIds=id1,id2" },
                { status: 400 }
            );
        }

        // ── Fetch all requested FinancialYear docs ────────────────────────────
        const fyDocs = await FinancialYear.find({ _id: { $in: fyIds } }).lean();

        if (fyDocs.length === 0) {
            return NextResponse.json(
                { success: false, error: "No valid Financial Years found for the given fyIds" },
                { status: 404 }
            );
        }

        // ── Common: company VFP filter + MR territory restriction ─────────────
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const restriction = await getMrTerritoryRestriction();

        const mrMdisFilter: any = restriction.isMrRestricted
            ? restriction.allowedCompanyCodes?.length
                ? { COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                : restriction.allowedOrdnos?.length
                ? { CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { CODEP: "NONE_MATCH" }
            : {};

        const mrDisFilter: any = mrMdisFilter;

        const mrGledgerFilter: any = restriction.isMrRestricted
            ? restriction.allowedOrdnos?.length
                ? { CODE: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { CODE: "NONE_MATCH" }
            : {};

        // ── Company name map (for resolving COMPANY code → readable name) ─────
        const companyDocs = await Company.find(
            {},
            { GCODE: { $toString: "$GCODE" }, GNAME: 1, CCODE: 1, CNAME: 1 }
        ).lean();
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

        // ─────────────────────────────────────────────────────────────────────
        // Process each FY
        // ─────────────────────────────────────────────────────────────────────
        const fyDataResults = await Promise.all(
            fyDocs.map(async (fyDoc: any, fyIdx: number) => {
                const startDate = new Date(fyDoc.startDate).toISOString().slice(0, 10);
                const endDate = new Date(fyDoc.endDate).toISOString().slice(0, 10);
                const color = FY_COLORS[fyIdx % FY_COLORS.length];

                const dateQueryMDIS = buildFYDateQuery("DATE", startDate, endDate);
                const dateQueryDIS = buildFYDateQuery("DATE", startDate, endDate);
                const dateQueryGLedger = buildFYDateQuery("DATE", startDate, endDate);

                // ── 1. SalesMdis: Sales / Purchase / Returns ─────────────────
                const mdisMatch = combineFilters(companyVfpMatch, mrMdisFilter, dateQueryMDIS, {
                    TYPE: { $in: ["S", "P", "R"] },
                });
                const mdisDocs = await SalesMdis.find(mdisMatch).lean();

                // Monthly breakdown init (12 slots: Apr=0 … Mar=11)
                const monthlyMap: Record<
                    number,
                    { monthLabel: string; monthIndex: number; sales: number; purchase: number; returns: number; collections: number; payments: number }
                > = {};
                for (let i = 0; i < 12; i++) {
                    monthlyMap[i] = { monthLabel: fyIndexLabel(i), monthIndex: i, sales: 0, purchase: 0, returns: 0, collections: 0, payments: 0 };
                }

                // Quarterly breakdown
                const quarterMap: Record<string, { quarter: string; sales: number; purchase: number; collections: number; returns: number }> = {
                    "Q1 (Apr-Jun)": { quarter: "Q1 (Apr-Jun)", sales: 0, purchase: 0, collections: 0, returns: 0 },
                    "Q2 (Jul-Sep)": { quarter: "Q2 (Jul-Sep)", sales: 0, purchase: 0, collections: 0, returns: 0 },
                    "Q3 (Oct-Dec)": { quarter: "Q3 (Oct-Dec)", sales: 0, purchase: 0, collections: 0, returns: 0 },
                    "Q4 (Jan-Mar)": { quarter: "Q4 (Jan-Mar)", sales: 0, purchase: 0, collections: 0, returns: 0 },
                };

                let totalSales = 0;
                let totalPurchases = 0;
                let salesReturns = 0;

                mdisDocs.forEach((doc: any) => {
                    if (!doc.DATE) return;
                    const d = new Date(doc.DATE);
                    const calMonth = d.getMonth() + 1;
                    const fyIdx = calendarMonthToFYIndex(calMonth);
                    const qLabel = fyQuarterLabel(calMonth);
                    const amt = Number(doc.FINAL || 0);

                    if (doc.TYPE === "S") {
                        totalSales += amt;
                        monthlyMap[fyIdx].sales += amt;
                        quarterMap[qLabel].sales += amt;
                    } else if (doc.TYPE === "P") {
                        totalPurchases += amt;
                        monthlyMap[fyIdx].purchase += amt;
                        quarterMap[qLabel].purchase += amt;
                    } else if (doc.TYPE === "R") {
                        salesReturns += amt;
                        monthlyMap[fyIdx].returns += amt;
                        quarterMap[qLabel].returns += amt;
                    }
                });

                const netSales = totalSales - salesReturns;

                // ── 2. GLedger: Collections & Payments ───────────────────────
                const gledgerMatch = combineFilters(companyVfpMatch, mrGledgerFilter, dateQueryGLedger, {
                    BOOK: { $in: ["R", "P"] },
                });
                const gledgerDocs = await GLedger.find(gledgerMatch).lean();

                let totalCollections = 0;
                let totalPayments = 0;

                gledgerDocs.forEach((doc: any) => {
                    if (!doc.DATE) return;
                    const d = new Date(doc.DATE);
                    const calMonth = d.getMonth() + 1;
                    const fyIdx = calendarMonthToFYIndex(calMonth);
                    const qLabel = fyQuarterLabel(calMonth);

                    if (doc.BOOK === "R" && doc.CD === "C") {
                        const cr = Number(doc.CREDIT || 0);
                        totalCollections += cr;
                        monthlyMap[fyIdx].collections += cr;
                        quarterMap[qLabel].collections += cr;
                    }
                    if (doc.BOOK === "P" && doc.CD === "D") {
                        const dr = Number(doc.DEBIT || 0);
                        totalPayments += dr;
                        monthlyMap[fyIdx].payments += dr;
                    }
                });

                // ── 3. SalesDis: Product + Company breakdown ──────────────────
                const disMatch = combineFilters(companyVfpMatch, mrDisFilter, dateQueryDIS);
                const disDocs = await SalesDis.find(disMatch).lean();

                const productMapAgg = new Map<number, { code: number; qty: number; amount: number }>();
                const companyMapAgg = new Map<string, { company: string; qty: number; amount: number }>();

                disDocs.forEach((doc: any) => {
                    const amt = Number(doc.AMMMOUNT || doc.AMOUNT || 0);
                    const qty = Number(doc.QTY || 0);

                    const code = Number(doc.CODE || 0);
                    if (code) {
                        if (!productMapAgg.has(code)) productMapAgg.set(code, { code, qty: 0, amount: 0 });
                        const p = productMapAgg.get(code)!;
                        p.qty += qty;
                        p.amount += amt;
                    }

                    const compCode = String(doc.COMPANY || "Unknown").trim().toUpperCase();
                    if (compCode) {
                        const resolvedName = companyNameMap.get(compCode) || compCode;
                        if (!companyMapAgg.has(resolvedName)) companyMapAgg.set(resolvedName, { company: resolvedName, qty: 0, amount: 0 });
                        const c = companyMapAgg.get(resolvedName)!;
                        c.qty += qty;
                        c.amount += amt;
                    }
                });

                // Top 10 products
                const sortedProducts = Array.from(productMapAgg.values())
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 10);

                const productCodes = sortedProducts.map((p) => p.code);
                const productDetails = await Product.find({ CODE: { $in: productCodes } })
                    .select({ CODE: 1, PRODUCT: 1 })
                    .lean();
                const productNameMap = new Map(productDetails.map((p: any) => [p.CODE, p.PRODUCT]));

                const topProducts = sortedProducts.map((p) => ({
                    code: p.code,
                    productName: productNameMap.get(p.code) || `Product #${p.code}`,
                    qty: p.qty,
                    amount: p.amount,
                }));

                const companyBreakdown = Array.from(companyMapAgg.values())
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 10);

                return {
                    fyId: String(fyDoc._id),
                    fyName: fyDoc.fyName,
                    fyCode: fyDoc.fyCode || "",
                    startDate,
                    endDate,
                    color,
                    summary: {
                        totalSales,
                        netSales,
                        salesReturns,
                        totalPurchases,
                        totalCollections,
                        totalPayments,
                        returnsRatioPercent: totalSales > 0 ? Number(((salesReturns / totalSales) * 100).toFixed(2)) : 0,
                        collectionEfficiencyPercent: totalSales > 0 ? Number(((totalCollections / totalSales) * 100).toFixed(2)) : 0,
                    },
                    monthlyBreakdown: Object.values(monthlyMap),
                    quarterlyBreakdown: Object.values(quarterMap),
                    topProducts,
                    companyBreakdown,
                };
            })
        );

        // Sort by startDate ascending
        fyDataResults.sort((a, b) => a.startDate.localeCompare(b.startDate));

        return NextResponse.json({ success: true, fyData: fyDataResults });
    } catch (err: any) {
        console.error("FY-wise compare API error:", err);
        return NextResponse.json(
            { success: false, error: err?.message ?? "Internal server error" },
            { status: 500 }
        );
    }
}
