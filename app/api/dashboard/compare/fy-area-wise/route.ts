import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";
import SubDis from "@/models/SubDis";
import PurchaseBill from "@/models/PurchaseBill";
import PurchaseReturn from "@/models/PurchaseReturn";
import GLedger from "@/models/GLedger";
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
        const fyIdsParam = searchParams.get("fyIds") || "";
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const restriction = await getMrTerritoryRestriction();

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

        const codepFilter = combineFilters(
            companyVfpMatch,
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
            const subdisRows = await SubDis.find(combineFilters(companyVfpMatch)).lean();
            subdisRows.forEach((d: any) => {
                const fyRes = matchFy(d.DATE);
                if (!fyRes) return;
                const state = resolveState(resolution, d.CODEP, d.VOUCHER);
                if (!state) return;

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
                const acc = getMetricAcc(state, fyRes.fyId);
                const amt = Number(r.grandTotal || 0);
                acc.purchase -= amt;
            });
        } catch {}

        // ---- D. GLEDGER Collections & Payments ----
        try {
            const gledgerRows = await GLedger.find(combineFilters(companyVfpMatch)).lean();
            gledgerRows.forEach((g: any) => {
                const fyRes = matchFy(g.DATE);
                if (!fyRes) return;
                const state = resolveState(resolution, g.CODEP, g.VOUCHER);
                if (!state) return;
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
