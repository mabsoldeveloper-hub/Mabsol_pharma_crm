import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { SalesDis, SalesMdis, Product, GLedger, Pendings } from "@/models/dashboardModels";
import Company from "@/models/Company";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";
import Customer from "@/models/Customer";
import { stateFromGstno, stateFromCity } from "@/lib/indiaMapStateResolver";

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);

        // ── Filter-options mode: returns distinct State/Area/Route/DSM/ASM/RSM values ──
        if (searchParams.get("mode") === "filter-options") {
            const companyVfpMatch = await getCompanyVfpFilter(searchParams);
            const restriction = await getMrTerritoryRestriction();

            const baseMatch: any = combineFilters(
                companyVfpMatch,
                restriction.isMrRestricted && restriction.allowedCompanyCodes?.length
                    ? { COMPANY: { $in: [...restriction.allowedCompanyCodes] } }
                    : {}
            );

            const [
                allCustomers,
                mdisAreas, disAreas,
                mdisRoutes, disRoutes,
                mdisDsms, disDsms,
                mdisAsms, disAsms,
                mdisRsms, disRsms,
            ] = await Promise.all([
                Customer.find({}, { ORDNO: 1, PARNAM: 1, CITY: 1, AREA: 1, ROUT: 1, DSM: 1, ASM: 1, RSM: 1, STATE: 1, GSTNO: 1 }).lean().catch(() => []),
                SalesMdis.distinct("AREA", combineFilters(baseMatch, { AREA: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesDis.distinct("AREA", combineFilters(baseMatch, { AREA: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesMdis.distinct("ROUT", combineFilters(baseMatch, { ROUT: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesDis.distinct("ROUT", combineFilters(baseMatch, { ROUT: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesMdis.distinct("DSM", combineFilters(baseMatch, { DSM: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesDis.distinct("DSM", combineFilters(baseMatch, { DSM: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesMdis.distinct("ASM", combineFilters(baseMatch, { ASM: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesDis.distinct("ASM", combineFilters(baseMatch, { ASM: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesMdis.distinct("RSM", combineFilters(baseMatch, { RSM: { $exists: true, $nin: [null, ""] } })).catch(() => []),
                SalesDis.distinct("RSM", combineFilters(baseMatch, { RSM: { $exists: true, $nin: [null, ""] } })).catch(() => []),
            ]);

            const isValid = (v: string) => {
                if (!v) return false;
                const lower = v.toLowerCase();
                return (
                    lower !== "null" &&
                    lower !== "undefined" &&
                    lower !== "n/a" &&
                    lower !== "none" &&
                    v !== "-"
                );
            };

            const stateMap = new Map<string, number>();
            const areaMap = new Map<string, number>();
            const routeMap = new Map<string, number>();
            const dsmMap = new Map<string, number>();
            const asmMap = new Map<string, number>();
            const rsmMap = new Map<string, number>();

            (allCustomers as any[]).forEach((c: any) => {
                const city = c.CITY ? String(c.CITY).trim() : "";
                const explicitArea = c.AREA ? String(c.AREA).trim() : "";
                const state = (c.STATE ? String(c.STATE).trim() : null) || stateFromGstno(c.GSTNO) || stateFromCity(city);
                const route = c.ROUT ? String(c.ROUT).trim() : "";
                const dsm = c.DSM ? String(c.DSM).trim() : "";
                const asm = c.ASM ? String(c.ASM).trim() : "";
                const rsm = c.RSM ? String(c.RSM).trim() : "";

                if (state && isValid(state)) {
                    stateMap.set(state, (stateMap.get(state) || 0) + 1);
                }
                const areaKey = explicitArea || city;
                if (areaKey && isValid(areaKey)) {
                    areaMap.set(areaKey, (areaMap.get(areaKey) || 0) + 1);
                }
                if (route && isValid(route)) {
                    routeMap.set(route, (routeMap.get(route) || 0) + 1);
                }
                if (dsm && isValid(dsm)) {
                    dsmMap.set(dsm, (dsmMap.get(dsm) || 0) + 1);
                }
                if (asm && isValid(asm)) {
                    asmMap.set(asm, (asmMap.get(asm) || 0) + 1);
                }
                if (rsm && isValid(rsm)) {
                    rsmMap.set(rsm, (rsmMap.get(rsm) || 0) + 1);
                }
            });

            const addFromList = (list: any[], map: Map<string, number>) => {
                (list || []).forEach((item: any) => {
                    const str = String(item || "").trim();
                    if (str && isValid(str) && !map.has(str)) {
                        map.set(str, 1);
                    }
                });
            };

            addFromList(mdisAreas, areaMap);
            addFromList(disAreas, areaMap);
            addFromList(mdisRoutes, routeMap);
            addFromList(disRoutes, routeMap);
            addFromList(mdisDsms, dsmMap);
            addFromList(disDsms, dsmMap);
            addFromList(mdisAsms, asmMap);
            addFromList(disAsms, asmMap);
            addFromList(mdisRsms, rsmMap);
            addFromList(disRsms, rsmMap);

            const toSortedCountList = (map: Map<string, number>) => {
                return Array.from(map.entries())
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
            };

            return NextResponse.json({
                success: true,
                states: toSortedCountList(stateMap),
                areas: toSortedCountList(areaMap),
                routes: toSortedCountList(routeMap),
                dsms: toSortedCountList(dsmMap),
                asms: toSortedCountList(asmMap),
                rsms: toSortedCountList(rsmMap),
            });
        }

        // ── Main compare data ──
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const restriction = await getMrTerritoryRestriction();

        // Territory filters
        const stateFilter = (searchParams.get("state") || "").trim();
        const areaFilter  = (searchParams.get("area")  || "").trim();
        const routeFilter = (searchParams.get("route") || "").trim();
        const dsmFilter   = (searchParams.get("dsm")   || "").trim();
        const asmFilter   = (searchParams.get("asm")   || "").trim();
        const rsmFilter   = (searchParams.get("rsm")   || "").trim();

        const hasTerritoryFilter = Boolean(stateFilter || areaFilter || routeFilter || dsmFilter || asmFilter || rsmFilter);

        let territoryCodeps: string[] | null = null;
        let territoryVouchers: number[] | null = null;

        if (hasTerritoryFilter) {
            const allCustomers = await Customer.find(
                {},
                { ORDNO: 1, PARNAM: 1, CITY: 1, AREA: 1, ROUT: 1, DSM: 1, ASM: 1, RSM: 1, STATE: 1, GSTNO: 1 }
            ).lean();

            const codepSet = new Set<string>();

            (allCustomers as any[]).forEach((c: any) => {
                const city = (c.CITY || "").toString().trim();
                const explicitArea = (c.AREA || "").toString().trim();
                const state = (c.STATE || "").toString().trim() || stateFromGstno(c.GSTNO) || stateFromCity(city) || "";
                const route = (c.ROUT || "").toString().trim();
                const dsm = (c.DSM || "").toString().trim();
                const asm = (c.ASM || "").toString().trim();
                const rsm = (c.RSM || "").toString().trim();

                if (stateFilter && !state.toLowerCase().includes(stateFilter.toLowerCase())) return;
                if (areaFilter && !city.toLowerCase().includes(areaFilter.toLowerCase()) && !explicitArea.toLowerCase().includes(areaFilter.toLowerCase())) return;
                if (routeFilter && !route.toLowerCase().includes(routeFilter.toLowerCase())) return;
                if (dsmFilter && !dsm.toLowerCase().includes(dsmFilter.toLowerCase())) return;
                if (asmFilter && !asm.toLowerCase().includes(asmFilter.toLowerCase())) return;
                if (rsmFilter && !rsm.toLowerCase().includes(rsmFilter.toLowerCase())) return;

                if (c.ORDNO) codepSet.add(String(c.ORDNO).trim());
            });

            // Check if there are direct field matches on SalesDis
            const disGeoMatch: any = {};
            if (areaFilter)  disGeoMatch.AREA = { $regex: escapeRegex(areaFilter),  $options: "i" };
            if (routeFilter) disGeoMatch.ROUT = { $regex: escapeRegex(routeFilter), $options: "i" };
            if (dsmFilter)   disGeoMatch.DSM  = { $regex: escapeRegex(dsmFilter),   $options: "i" };
            if (asmFilter)   disGeoMatch.ASM  = { $regex: escapeRegex(asmFilter),   $options: "i" };
            if (rsmFilter)   disGeoMatch.RSM  = { $regex: escapeRegex(rsmFilter),   $options: "i" };

            const matchedDisVouchers = Object.keys(disGeoMatch).length
                ? await SalesDis.distinct("VOUCHER", disGeoMatch).catch(() => [])
                : [];

            territoryCodeps = Array.from(codepSet);
            territoryVouchers = (matchedDisVouchers as number[]).filter(
                (v) => v !== null && v !== undefined
            );
        }

        // Build territory conditions for MDIS / DIS / Pendings / GLedger
        const buildMdisTerritoryMatch = () => {
            if (!hasTerritoryFilter) return {};
            const directGeo: any = {};
            if (areaFilter)  directGeo.AREA = { $regex: escapeRegex(areaFilter),  $options: "i" };
            if (routeFilter) directGeo.ROUT = { $regex: escapeRegex(routeFilter), $options: "i" };
            if (dsmFilter)   directGeo.DSM  = { $regex: escapeRegex(dsmFilter),   $options: "i" };
            if (asmFilter)   directGeo.ASM  = { $regex: escapeRegex(asmFilter),   $options: "i" };
            if (rsmFilter)   directGeo.RSM  = { $regex: escapeRegex(rsmFilter),   $options: "i" };

            const conditions: any[] = [];
            if (Object.keys(directGeo).length > 0) conditions.push(directGeo);
            if (territoryCodeps && territoryCodeps.length > 0) {
                conditions.push({ CODEP: { $in: territoryCodeps } });
            }
            if (territoryVouchers && territoryVouchers.length > 0) {
                conditions.push({ VOUCHER: { $in: territoryVouchers } });
            }

            if (conditions.length === 0) {
                // If filter specified but matched 0 parties, force empty match
                return { CODEP: "NO_TERRITORY_MATCH" };
            }

            return conditions.length === 1 ? conditions[0] : { $or: conditions };
        };

        const mdisTerritoryMatch = buildMdisTerritoryMatch();

        const mdisMatch: any = combineFilters(
          companyVfpMatch,
          mdisTerritoryMatch,
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
          mdisTerritoryMatch,
          restriction.isMrRestricted
            ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
                ? { COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                : restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { CODEP: "NONE_MATCH" }
            : {}
        );

        const pendingsTerritoryMatch = () => {
            if (!hasTerritoryFilter) return {};
            const directGeo: any = {};
            if (areaFilter)  directGeo.AREA = { $regex: escapeRegex(areaFilter),  $options: "i" };
            if (routeFilter) directGeo.ROUT = { $regex: escapeRegex(routeFilter), $options: "i" };
            if (dsmFilter)   directGeo.DSM  = { $regex: escapeRegex(dsmFilter),   $options: "i" };
            if (asmFilter)   directGeo.ASM  = { $regex: escapeRegex(asmFilter),   $options: "i" };
            if (rsmFilter)   directGeo.RSM  = { $regex: escapeRegex(rsmFilter),   $options: "i" };

            const orConds: any[] = [];
            if (Object.keys(directGeo).length > 0) orConds.push(directGeo);
            if (territoryCodeps && territoryCodeps.length > 0) {
                orConds.push({ ORD: { $in: territoryCodeps } });
            }
            if (territoryVouchers && territoryVouchers.length > 0) {
                orConds.push({ VOUCHER: { $in: territoryVouchers } });
                orConds.push({ SVOUCHER: { $in: territoryVouchers } });
            }

            if (orConds.length === 0) return { ORD: "NO_TERRITORY_MATCH" };
            return orConds.length === 1 ? orConds[0] : { $or: orConds };
        };

        const pendingsMatch: any = combineFilters(
          companyVfpMatch,
          pendingsTerritoryMatch(),
          restriction.isMrRestricted
            ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { ORD: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { ORD: "NONE_MATCH" }
            : {}
        );

        const gledgerTerritoryMatch = () => {
            if (!hasTerritoryFilter) return {};
            const directGeo: any = {};
            if (areaFilter)  directGeo.AREA = { $regex: escapeRegex(areaFilter),  $options: "i" };
            if (routeFilter) directGeo.ROUT = { $regex: escapeRegex(routeFilter), $options: "i" };
            if (dsmFilter)   directGeo.DSM  = { $regex: escapeRegex(dsmFilter),   $options: "i" };
            if (asmFilter)   directGeo.ASM  = { $regex: escapeRegex(asmFilter),   $options: "i" };
            if (rsmFilter)   directGeo.RSM  = { $regex: escapeRegex(rsmFilter),   $options: "i" };

            const orConds: any[] = [];
            if (Object.keys(directGeo).length > 0) orConds.push(directGeo);
            if (territoryCodeps && territoryCodeps.length > 0) {
                orConds.push({ CODE: { $in: territoryCodeps } });
                orConds.push({ CODE1: { $in: territoryCodeps } });
            }

            if (orConds.length === 0) return { CODE: "NO_TERRITORY_MATCH" };
            return orConds.length === 1 ? orConds[0] : { $or: orConds };
        };

        const gledgerMatch: any = combineFilters(
          companyVfpMatch,
          gledgerTerritoryMatch(),
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
            filters: {
                from,
                to,
                state: stateFilter,
                area: areaFilter,
                route: routeFilter,
                dsm: dsmFilter,
                asm: asmFilter,
                rsm: rsmFilter,
            },
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