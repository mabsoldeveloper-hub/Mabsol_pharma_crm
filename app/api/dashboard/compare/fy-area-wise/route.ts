import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";
import SubDis from "@/models/SubDis";
import PurchaseBill from "@/models/PurchaseBill";
import PurchaseReturn from "@/models/PurchaseReturn";
import GLedger from "@/models/GLedger";
import Customer from "@/models/Customer";
import { SalesDis, SalesMdis } from "@/models/dashboardModels";
import {
    buildStateResolution,
    resolveState,
    STATE_NAME_TO_MAP_ID,
    stateFromGstno,
    stateFromCity,
    resolveStateFromText,
    cleanPartyName,
} from "@/lib/indiaMapStateResolver";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const FY_PALETTE = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

const STATE_TO_ZONE: Record<string, string> = {
    "Jammu and Kashmir": "North", "Himachal Pradesh": "North", "Punjab": "North",
    "Chandigarh": "North", "Uttarakhand": "North", "Haryana": "North",
    "Delhi": "North", "Uttar Pradesh": "North", "Rajasthan": "North",
    "Maharashtra": "West", "Gujarat": "West", "Goa": "West",
    "Daman and Diu": "West", "Dadra and Nagar Haveli": "West",
    "Karnataka": "South", "Tamil Nadu": "South", "Kerala": "South",
    "Andhra Pradesh": "South", "Telangana": "South", "Puducherry": "South",
    "Andaman and Nicobar Islands": "South", "Lakshadweep": "South",
    "West Bengal": "East", "Bihar": "East", "Jharkhand": "East", "Odisha": "East",
    "Madhya Pradesh": "Central", "Chhattisgarh": "Central", "Sikkim": "NorthEast",
    "Arunachal Pradesh": "NorthEast", "Nagaland": "NorthEast", "Manipur": "NorthEast",
    "Mizoram": "NorthEast", "Tripura": "NorthEast", "Meghalaya": "NorthEast", "Assam": "NorthEast",
};

interface StateFyMetrics {
    sales: number;
    netSales: number;
    salesReturns: number;
    purchase: number;
    collections: number;
    payments: number;
    customers: Set<string>;
    suppliers: Set<string>;
    monthlySales: number[]; // 12 months Apr..Mar
    productSales: Map<string, { name: string; qty: number; amount: number }>;
    partySales: Map<string, { name: string; sales: number }>;
}

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);

        // ── Filter-options mode: returns distinct State/Area/Route/DSM/ASM/RSM values with counts ──
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

        const fyIdsParam = searchParams.get("fyIds") || "";
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

            // Check direct match on SalesDis
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

        // 1. Fetch Financial Years
        let targetFys: any[] = [];
        if (fyIdsParam) {
            const ids = fyIdsParam.split(",").map(s => s.trim()).filter(Boolean);
            targetFys = await FinancialYear.find({ _id: { $in: ids } }).lean();
        }

        if (targetFys.length === 0) {
            const allFys = await FinancialYear.find({ isAll: { $ne: true } })
                .sort({ startDate: -1 })
                .limit(3)
                .lean();
            targetFys = allFys.reverse();
        } else {
            targetFys.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        }

        if (targetFys.length === 0) {
            return NextResponse.json({ success: false, error: "No financial years found" });
        }

        const fyMap = new Map<string, { fyId: string; fyName: string; startDate: Date; endDate: Date; color: string }>();
        targetFys.forEach((fy, idx) => {
            fyMap.set(fy._id.toString(), {
                fyId: fy._id.toString(),
                fyName: fy.fyName,
                startDate: new Date(fy.startDate),
                endDate: new Date(fy.endDate),
                color: FY_PALETTE[idx % FY_PALETTE.length],
            });
        });

        const matchFy = (dateVal: any): { fyId: string; monthIndex: number } | null => {
            if (!dateVal) return null;
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return null;
            for (const [id, fy] of fyMap.entries()) {
                if (d >= fy.startDate && d <= fy.endDate) {
                    const m = d.getMonth();
                    const monthIndex = (m >= 3) ? (m - 3) : (m + 9); // Apr=0, May=1... Mar=11
                    return { fyId: id, monthIndex };
                }
            }
            return null;
        };

        const buildTerritoryCondition = () => {
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

            if (conditions.length === 0) return { CODEP: "NO_TERRITORY_MATCH" };
            return conditions.length === 1 ? conditions[0] : { $or: conditions };
        };

        const codepFilter = combineFilters(
            companyVfpMatch,
            buildTerritoryCondition(),
            restriction.isMrRestricted
                ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                    ? { CODEP: { $in: restriction.allowedOrdnos } }
                    : { CODEP: "NONE_MATCH" }
                : {}
        );

        // 2. Build State Resolution Anchor
        const resolution = await buildStateResolution(codepFilter);
        const stateDataMap = new Map<string, Map<string, StateFyMetrics>>();

        const getMetricAcc = (stateName: string, fyId: string): StateFyMetrics => {
            if (!stateDataMap.has(stateName)) {
                stateDataMap.set(stateName, new Map());
            }
            const fyMapAcc = stateDataMap.get(stateName)!;
            if (!fyMapAcc.has(fyId)) {
                fyMapAcc.set(fyId, {
                    sales: 0,
                    netSales: 0,
                    salesReturns: 0,
                    purchase: 0,
                    collections: 0,
                    payments: 0,
                    customers: new Set(),
                    suppliers: new Set(),
                    monthlySales: Array(12).fill(0),
                    productSales: new Map(),
                    partySales: new Map(),
                });
            }
            return fyMapAcc.get(fyId)!;
        };

        // ---- A. Process MDIS Rows (Sales / Returns / Purchases) ----
        resolution.mdisRows.forEach((r: any) => {
            if (r.TYPE === "V") return;
            const fyRes = matchFy(r.DATE);
            if (!fyRes) return;

            const state = resolveState(resolution, r.CODEP, r.VOUCHER);
            if (!state) return;

            // If stateFilter is explicitly specified, enforce exact state match
            if (stateFilter && !state.toLowerCase().includes(stateFilter.toLowerCase())) return;

            const acc = getMetricAcc(state, fyRes.fyId);
            const amt = Number(r.FINAL || 0);

            if (r.TYPE === "S") {
                acc.sales += amt;
                acc.netSales += amt;
                acc.monthlySales[fyRes.monthIndex] += amt;
                if (r.CODEP) {
                    const partyName = r.CODEP;
                    acc.customers.add(partyName);
                    const partyAcc = acc.partySales.get(partyName) || { name: cleanPartyName(partyName), sales: 0 };
                    partyAcc.sales += amt;
                    acc.partySales.set(partyName, partyAcc);
                }
            } else if (r.TYPE === "P") {
                acc.purchase += amt;
                if (r.CODEP) acc.suppliers.add(r.CODEP);
            } else if (r.TYPE === "B") {
                acc.salesReturns += amt;
                acc.netSales -= amt;
            }
        });

        // ---- B. Process SubDis Rows for Product Breakdown ----
        try {
            const subdisRows = await SubDis.find(codepFilter).lean();
            subdisRows.forEach((d: any) => {
                const fyRes = matchFy(d.DATE);
                if (!fyRes) return;
                const state = resolveState(resolution, d.CODEP, d.VOUCHER);
                if (!state) return;
                if (stateFilter && !state.toLowerCase().includes(stateFilter.toLowerCase())) return;

                const acc = getMetricAcc(state, fyRes.fyId);
                const pCode = String(d.PROCD || d.PRODUCT || "GENERIC");
                const pName = d.PRONAM || d.PRODUCT_NAME || `Product ${pCode}`;
                const qty = Number(d.QTY || 0);
                const amt = Number(d.AMOUNT || d.FINAL || 0);

                const pAcc = acc.productSales.get(pCode) || { name: pName, qty: 0, amount: 0 };
                pAcc.qty += qty;
                pAcc.amount += amt;
                acc.productSales.set(pCode, pAcc);
            });
        } catch {}

        // ---- C. Web Purchase Bills & Returns ----
        try {
            if (!hasTerritoryFilter || (stateFilter && stateFilter.toLowerCase().includes("haryana"))) {
                const webBills = await PurchaseBill.find(combineFilters(companyVfpMatch)).lean();
                webBills.forEach((b: any) => {
                    const fyRes = matchFy(b.billDate || b.createdAt);
                    if (!fyRes) return;
                    const state =
                        b.state ||
                        stateFromGstno(b.vendorGst) ||
                        stateFromCity(b.city) ||
                        resolveStateFromText(b.vendorName, b.city, b.state) ||
                        "Haryana";
                    if (stateFilter && !state.toLowerCase().includes(stateFilter.toLowerCase())) return;
                    const acc = getMetricAcc(state, fyRes.fyId);
                    const amt = Number(b.netAmount || b.grandTotal || 0);
                    acc.purchase += amt;
                    if (b.vendorName) acc.suppliers.add(b.vendorName);
                });

                const webReturns = await PurchaseReturn.find(combineFilters(companyVfpMatch)).lean();
                webReturns.forEach((r: any) => {
                    const fyRes = matchFy(r.returnDate || r.createdAt);
                    if (!fyRes) return;
                    const state =
                        r.state ||
                        stateFromGstno(r.vendorGst) ||
                        stateFromCity(r.city) ||
                        resolveStateFromText(r.vendorName, r.city, r.state) ||
                        "Haryana";
                    if (stateFilter && !state.toLowerCase().includes(stateFilter.toLowerCase())) return;
                    const acc = getMetricAcc(state, fyRes.fyId);
                    const amt = Number(r.grandTotal || 0);
                    acc.purchase -= amt;
                });
            }
        } catch {}

        // ---- D. GLEDGER Collections & Payments ----
        try {
            const gledgerFilter = combineFilters(
                companyVfpMatch,
                hasTerritoryFilter && territoryCodeps && territoryCodeps.length > 0
                    ? { $or: [{ CODE: { $in: territoryCodeps } }, { CODE1: { $in: territoryCodeps } }] }
                    : hasTerritoryFilter
                    ? { CODE: "NO_TERRITORY_MATCH" }
                    : {}
            );
            const gledgerRows = await GLedger.find(gledgerFilter).lean();
            gledgerRows.forEach((g: any) => {
                const fyRes = matchFy(g.DATE);
                if (!fyRes) return;
                const state = resolveState(resolution, g.CODEP || g.CODE, g.VOUCHER);
                if (!state) return;
                if (stateFilter && !state.toLowerCase().includes(stateFilter.toLowerCase())) return;
                const acc = getMetricAcc(state, fyRes.fyId);

                const cr = Number(g.CREDIT || 0);
                const dr = Number(g.DEBIT || 0);

                if (cr > 0) acc.collections += cr;
                if (dr > 0) acc.payments += dr;
            });
        } catch {}

        // 3. Format State-Wise Data & Zone Rollups
        const selectedFyList = Array.from(fyMap.values());
        const firstFyId = selectedFyList[0]?.fyId;
        const lastFyId = selectedFyList[selectedFyList.length - 1]?.fyId;

        const stateList: any[] = [];
        const zoneMap = new Map<string, Record<string, number>>();

        stateDataMap.forEach((fyAccMap, stateName) => {
            const stateId = STATE_NAME_TO_MAP_ID[stateName] || stateName.toLowerCase().slice(0, 2);
            const zoneName = STATE_TO_ZONE[stateName] || "North";

            if (!zoneMap.has(zoneName)) {
                zoneMap.set(zoneName, {});
            }
            const zAcc = zoneMap.get(zoneName)!;

            const byFy: Record<string, any> = {};
            let stateTotalSales = 0;
            let stateTotalNetSales = 0;
            let stateTotalCollections = 0;
            let stateTotalPurchases = 0;
            let stateTotalReturns = 0;

            selectedFyList.forEach(fy => {
                const acc = fyAccMap.get(fy.fyId) || {
                    sales: 0, netSales: 0, salesReturns: 0, purchase: 0,
                    collections: 0, payments: 0, customers: new Set(), suppliers: new Set(),
                    monthlySales: Array(12).fill(0), productSales: new Map(), partySales: new Map(),
                };

                const returnsRatio = acc.sales > 0 ? Number(((acc.salesReturns / acc.sales) * 100).toFixed(1)) : 0;
                const collEfficiency = acc.sales > 0 ? Number(((acc.collections / acc.sales) * 100).toFixed(1)) : 0;

                stateTotalSales += acc.sales;
                stateTotalNetSales += acc.netSales;
                stateTotalCollections += acc.collections;
                stateTotalPurchases += acc.purchase;
                stateTotalReturns += acc.salesReturns;

                zAcc[fy.fyId] = (zAcc[fy.fyId] || 0) + acc.sales;

                byFy[fy.fyId] = {
                    sales: Math.round(acc.sales),
                    netSales: Math.round(acc.netSales),
                    salesReturns: Math.round(acc.salesReturns),
                    purchase: Math.round(acc.purchase),
                    collections: Math.round(acc.collections),
                    payments: Math.round(acc.payments),
                    customersCount: acc.customers.size,
                    suppliersCount: acc.suppliers.size,
                    returnsRatioPercent: returnsRatio,
                    collectionEfficiencyPercent: collEfficiency,
                    monthlySales: acc.monthlySales.map(v => Math.round(v)),
                };
            });

            // Growth % between first and last FY
            const firstSales = byFy[firstFyId]?.sales ?? 0;
            const lastSales = byFy[lastFyId]?.sales ?? 0;
            const salesGrowthPct = firstSales > 0 ? Number((((lastSales - firstSales) / firstSales) * 100).toFixed(1)) : null;

            const firstNetSales = byFy[firstFyId]?.netSales ?? 0;
            const lastNetSales = byFy[lastFyId]?.netSales ?? 0;
            const netSalesGrowthPct = firstNetSales > 0 ? Number((((lastNetSales - firstNetSales) / firstNetSales) * 100).toFixed(1)) : null;

            // Composite State Health Score (0 - 100)
            const collEff = stateTotalSales > 0 ? (stateTotalCollections / stateTotalSales) * 100 : 0;
            const retRatio = stateTotalSales > 0 ? (stateTotalReturns / stateTotalSales) * 100 : 0;
            const growthFactor = salesGrowthPct ? Math.min(Math.max(salesGrowthPct, -50), 50) + 50 : 50; // 0-100
            const collFactor = Math.min(collEff, 100);
            const retFactor = Math.max(100 - (retRatio * 10), 0);
            const healthScore = Math.round((collFactor * 0.4) + (growthFactor * 0.4) + (retFactor * 0.2));

            // Extract Top 10 Products and Customers
            const latestAcc = fyAccMap.get(lastFyId) || fyAccMap.get(firstFyId);
            const topProducts = latestAcc ? Array.from(latestAcc.productSales.values())
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 10) : [];

            const topCustomers = latestAcc ? Array.from(latestAcc.partySales.values())
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 10) : [];

            stateList.push({
                stateId,
                stateName,
                zoneName,
                totalSales: Math.round(stateTotalSales),
                totalNetSales: Math.round(stateTotalNetSales),
                salesGrowthPct,
                netSalesGrowthPct,
                healthScore,
                byFy,
                topProducts,
                topCustomers,
            });
        });

        // Sort states by total sales descending
        stateList.sort((a, b) => b.totalSales - a.totalSales);

        // 4. Format Zonal Data
        const zonalBreakdown: any[] = [];
        zoneMap.forEach((fyTotals, zoneName) => {
            zonalBreakdown.push({
                zoneName,
                byFy: fyTotals,
                totalSales: Object.values(fyTotals).reduce((a, b) => a + b, 0),
            });
        });
        zonalBreakdown.sort((a, b) => b.totalSales - a.totalSales);

        // 5. Build National Leaderboards & Summary
        const topRevenueState = stateList.length ? stateList[0] : null;
        const validGrowthStates = stateList.filter(s => s.salesGrowthPct !== null).sort((a, b) => (b.salesGrowthPct ?? 0) - (a.salesGrowthPct ?? 0));
        const topGrowthState = validGrowthStates.length ? validGrowthStates[0] : null;
        const topHealthState = [...stateList].sort((a, b) => b.healthScore - a.healthScore)[0] || null;

        const nationalSummary: Record<string, any> = {};
        selectedFyList.forEach(fy => {
            let totalSales = 0; let totalNetSales = 0; let totalPurchases = 0; let totalCollections = 0;
            stateList.forEach(s => {
                const fData = s.byFy[fy.fyId];
                if (fData) {
                    totalSales += fData.sales;
                    totalNetSales += fData.netSales;
                    totalPurchases += fData.purchase;
                    totalCollections += fData.collections;
                }
            });
            nationalSummary[fy.fyId] = {
                totalSales,
                totalNetSales,
                totalPurchases,
                totalCollections,
                collectionEfficiencyPercent: totalSales > 0 ? Number(((totalCollections / totalSales) * 100).toFixed(1)) : 0,
            };
        });

        return NextResponse.json({
            success: true,
            fyList: selectedFyList,
            stateData: stateList,
            zonalBreakdown,
            leaderboards: {
                topRevenueState: topRevenueState ? { stateName: topRevenueState.stateName, sales: topRevenueState.byFy[lastFyId]?.sales ?? topRevenueState.totalSales } : null,
                topGrowthState: topGrowthState ? { stateName: topGrowthState.stateName, growthPct: topGrowthState.salesGrowthPct } : null,
                topHealthState: topHealthState ? { stateName: topHealthState.stateName, score: topHealthState.healthScore } : null,
            },
            nationalSummary,
        });
    } catch (error: any) {
        console.error("FY Area Wise Comparison API Error:", error);
        return NextResponse.json({ success: false, error: error.message || "Failed to load area comparison data" }, { status: 500 });
    }
}
