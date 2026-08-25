import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";
import SubDis from "@/models/SubDis";
import PurchaseBill from "@/models/PurchaseBill";
import PurchaseReturn from "@/models/PurchaseReturn";
import GLedger from "@/models/GLedger";
import Customer from "@/models/Customer";
import { SalesDis, SalesMdis, Product } from "@/models/dashboardModels";
import {
    buildStateResolution,
    resolveState,
    STATE_NAME_TO_MAP_ID,
    stateFromGstno,
    stateFromCity,
    resolveStateFromText,
    cleanPartyName,
    extractDistrict,
    extractPincode,
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
}

interface CustomerAgg {
    code: string;
    name: string;
    city: string;
    district: string;
    area: string;
    route: string;
    state: string;
    pincode: string;
    gstno: string;
    phone: string;
    dlno: string;
    email: string;
    address: string;
    dsm: string;
    asm: string;
    rsm: string;
    balance: number;
    creditLimit: number;
    creditDays: number;
    totalSales: number;
    totalNetSales: number;
    totalReturns: number;
    invoicesCount: number;
    lastSaleDate?: string;
    byFy: Record<string, { sales: number; netSales: number; returns: number; invoicesCount: number }>;
    productSales: Map<string, { name: string; qty: number; amount: number }>;
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

        // Fetch customer master directory for accurate name and details resolution
        const allCustomerDocs = await Customer.find(
            {},
            {
                ORDNO: 1, CODEP: 1, PARNAM: 1, CITY: 1, AREA: 1, ROUT: 1, DSM: 1, ASM: 1, RSM: 1,
                STATE: 1, GSTNO: 1, DLNO: 1, DLNO1: 1, DLNO2: 1, PANNO: 1, PHONE1: 1, PHONE2: 1,
                MOBILE: 1, EMAIL: 1, PARADD: 1, PARADD1: 1, PARADD2: 1, BALANCE: 1, CRLIMIT: 1,
                CRDAYS: 1, SALCR: 1, SALDR: 1, PURCR: 1, PURDR: 1, STATUS: 1
            }
        ).lean().catch(() => []);

        const customerMasterMap = new Map<string, any>();
        (allCustomerDocs as any[]).forEach((c: any) => {
            const keys = [c.ORDNO, c.CODEP].filter(Boolean).map(k => String(k).trim());
            keys.forEach(k => {
                if (!customerMasterMap.has(k)) {
                    const city = c.CITY ? String(c.CITY).trim() : "";
                    const { district } = extractDistrict(city, c.PARADD, c.PARADD1, c.PARADD2);
                    const pincode = extractPincode(c.PARADD, c.PARADD1, c.PARADD2, city) || "";
                    const state = (c.STATE ? String(c.STATE).trim() : "") || stateFromGstno(c.GSTNO) || stateFromCity(city) || "";
                    const phone = (c.PHONE1 || c.PHONE2 || c.MOBILE || "").toString().trim();
                    const dlno = (c.DLNO || c.DLNO1 || c.DLNO2 || "").toString().trim();
                    const address = [c.PARADD, c.PARADD1, c.PARADD2].filter(Boolean).map(s => String(s).trim()).join(", ");

                    customerMasterMap.set(k, {
                        code: k,
                        name: cleanPartyName(c.PARNAM, city) || (c.PARNAM ? String(c.PARNAM).trim() : `Customer ${k}`),
                        rawName: c.PARNAM ? String(c.PARNAM).trim() : "",
                        city,
                        district: district || "",
                        area: (c.AREA || "").toString().trim(),
                        route: (c.ROUT || "").toString().trim(),
                        state,
                        pincode,
                        gstno: (c.GSTNO || "").toString().trim(),
                        phone,
                        dlno,
                        email: (c.EMAIL || "").toString().trim(),
                        panno: (c.PANNO || "").toString().trim(),
                        address,
                        dsm: (c.DSM || "").toString().trim(),
                        asm: (c.ASM || "").toString().trim(),
                        rsm: (c.RSM || "").toString().trim(),
                        balance: Number(c.BALANCE || 0),
                        creditLimit: Number(c.CRLIMIT || 0),
                        creditDays: Number(c.CRDAYS || 0),
                        status: (c.STATUS || "ACTIVE").toString().trim(),
                        isBuyer: c.SALDR === "Y",
                        isSupplier: c.PURCR === "Y",
                    });
                }
            });
        });

        if (hasTerritoryFilter) {
            const codepSet = new Set<string>();

            (allCustomerDocs as any[]).forEach((c: any) => {
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
        const stateCustomerMap = new Map<string, Map<string, CustomerAgg>>();

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
                });
            }
            return fyMapAcc.get(fyId)!;
        };

        const getCustomerAcc = (stateName: string, partyCode: string): CustomerAgg => {
            if (!stateCustomerMap.has(stateName)) {
                stateCustomerMap.set(stateName, new Map());
            }
            const partyMap = stateCustomerMap.get(stateName)!;
            if (!partyMap.has(partyCode)) {
                const master = customerMasterMap.get(partyCode) || {
                    code: partyCode,
                    name: cleanPartyName(partyCode) || `Customer ${partyCode}`,
                    city: "",
                    district: "",
                    area: "",
                    route: "",
                    state: stateName,
                    pincode: "",
                    gstno: "",
                    phone: "",
                    dlno: "",
                    email: "",
                    address: "",
                    dsm: "",
                    asm: "",
                    rsm: "",
                    balance: 0,
                    creditLimit: 0,
                    creditDays: 0,
                };

                partyMap.set(partyCode, {
                    code: partyCode,
                    name: master.name,
                    city: master.city,
                    district: master.district,
                    area: master.area,
                    route: master.route,
                    state: master.state || stateName,
                    pincode: master.pincode,
                    gstno: master.gstno,
                    phone: master.phone,
                    dlno: master.dlno,
                    email: master.email,
                    address: master.address,
                    dsm: master.dsm,
                    asm: master.asm,
                    rsm: master.rsm,
                    balance: master.balance,
                    creditLimit: master.creditLimit,
                    creditDays: master.creditDays,
                    totalSales: 0,
                    totalNetSales: 0,
                    totalReturns: 0,
                    invoicesCount: 0,
                    byFy: {},
                    productSales: new Map(),
                });
            }
            return partyMap.get(partyCode)!;
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
            const partyCode = r.CODEP ? String(r.CODEP).trim() : "";

            if (r.TYPE === "S") {
                acc.sales += amt;
                acc.netSales += amt;
                acc.monthlySales[fyRes.monthIndex] += amt;
                if (partyCode) {
                    acc.customers.add(partyCode);

                    const custAgg = getCustomerAcc(state, partyCode);
                    custAgg.totalSales += amt;
                    custAgg.totalNetSales += amt;
                    custAgg.invoicesCount += 1;

                    if (!custAgg.lastSaleDate || (r.DATE && new Date(r.DATE) > new Date(custAgg.lastSaleDate))) {
                        custAgg.lastSaleDate = r.DATE ? new Date(r.DATE).toISOString().slice(0, 10) : "";
                    }

                    const fyCust = custAgg.byFy[fyRes.fyId] || { sales: 0, netSales: 0, returns: 0, invoicesCount: 0 };
                    fyCust.sales += amt;
                    fyCust.netSales += amt;
                    fyCust.invoicesCount += 1;
                    custAgg.byFy[fyRes.fyId] = fyCust;
                }
            } else if (r.TYPE === "P") {
                acc.purchase += amt;
                if (partyCode) acc.suppliers.add(partyCode);
            } else if (r.TYPE === "B") {
                acc.salesReturns += amt;
                acc.netSales -= amt;
                if (partyCode) {
                    const custAgg = getCustomerAcc(state, partyCode);
                    custAgg.totalReturns += amt;
                    custAgg.totalNetSales -= amt;

                    const fyCust = custAgg.byFy[fyRes.fyId] || { sales: 0, netSales: 0, returns: 0, invoicesCount: 0 };
                    fyCust.returns += amt;
                    fyCust.netSales -= amt;
                    custAgg.byFy[fyRes.fyId] = fyCust;
                }
            }
        });

        // ---- B. Process SalesDis Rows for Accurate Product Breakdown ----
        try {
            const [allProds, disRows] = await Promise.all([
                Product.find({}, { CODE: 1, PRODUCT: 1, NAME: 1 }).lean().catch(() => []),
                SalesDis.find(combineFilters(companyVfpMatch, codepFilter)).lean().catch(() => []),
            ]);

            const proMap = new Map<string, string>();
            (allProds as any[]).forEach((p: any) => {
                const code = String(p.CODE || "").trim();
                const name = String(p.PRODUCT || p.NAME || code).trim();
                if (code && name) proMap.set(code, name);
            });

            (disRows as any[]).forEach((d: any) => {
                const fyRes = matchFy(d.DATE);
                if (!fyRes) return;
                const state = resolveState(resolution, d.CODEP, d.VOUCHER);
                if (!state) return;
                if (stateFilter && !state.toLowerCase().includes(stateFilter.toLowerCase())) return;

                const pCode = String(d.CODE || d.PROCD || "").trim();
                if (!pCode || pCode.toUpperCase() === "GENERIC") return;

                const qty = Number(d.QTY || d.ISSUEQTY || 0);
                const amt = Number(d.AMMMOUNT || d.AMOUNT || d.FINAL || d.COST || (d.RATE ? Number(d.RATE) * qty : 0));
                if (qty <= 0 && amt <= 0) return;

                const pName = proMap.get(pCode) || d.PRODUCT || d.PRONAM || pCode;
                if (!pName || pName.toLowerCase() === "generic") return;

                const acc = getMetricAcc(state, fyRes.fyId);
                const pAcc = acc.productSales.get(pCode) || { name: pName, qty: 0, amount: 0 };
                pAcc.qty += qty;
                pAcc.amount += amt;
                acc.productSales.set(pCode, pAcc);

                // Track product for specific customer
                const partyCode = d.CODEP ? String(d.CODEP).trim() : "";
                if (partyCode) {
                    const custAgg = getCustomerAcc(state, partyCode);
                    const cpAcc = custAgg.productSales.get(pCode) || { name: pName, qty: 0, amount: 0 };
                    cpAcc.qty += qty;
                    cpAcc.amount += amt;
                    custAgg.productSales.set(pCode, cpAcc);
                }
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
                    monthlySales: Array(12).fill(0), productSales: new Map(),
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

            // Extract Top Products across all FYs for this state
            const allStateProducts = new Map<string, { name: string; qty: number; amount: number }>();
            fyAccMap.forEach(acc => {
                acc.productSales.forEach((p, code) => {
                    const existing = allStateProducts.get(code) || { name: p.name, qty: 0, amount: 0 };
                    existing.qty += p.qty;
                    existing.amount += p.amount;
                    allStateProducts.set(code, existing);
                });
            });

            const topProducts = Array.from(allStateProducts.values())
                .filter(p => (p.qty > 0 || p.amount > 0) && !p.name.toUpperCase().includes("GENERIC"))
                .sort((a, b) => b.amount - a.amount || b.qty - a.qty)
                .slice(0, 15);

            // Extract Enriched Customer Details for this State
            const stateCustAccMap = stateCustomerMap.get(stateName) || new Map<string, CustomerAgg>();
            const isInternalTaxLedger = (name: string, code?: string) => {
                if (code && ["MM", "JF", "SGST", "CGST", "IGST"].includes(code.toUpperCase().trim())) return true;
                if (!name) return false;
                const n = name.toUpperCase();
                return /\b(CGST|SGST|IGST|SALES TAX|PURCHASE TAX|TAX A\/C|TAX ACCOUNT|ROUND OFF|DISCOUNT ALLOWED|TDS A\/C)\b/.test(n);
            };

            const customerList = Array.from(stateCustAccMap.values())
                .filter(c => !isInternalTaxLedger(c.name, c.code))
                .map(c => {
                const firstCustSales = c.byFy[firstFyId]?.sales ?? 0;
                const lastCustSales = c.byFy[lastFyId]?.sales ?? 0;
                const custGrowth = firstCustSales > 0 ? Number((((lastCustSales - firstCustSales) / firstCustSales) * 100).toFixed(1)) : null;
                const retPct = c.totalSales > 0 ? Number(((c.totalReturns / c.totalSales) * 100).toFixed(1)) : 0;

                let category: "Key Account" | "Growth Account" | "Standard" | "High Return Risk" = "Standard";
                if (retPct > 8) {
                    category = "High Return Risk";
                } else if (custGrowth !== null && custGrowth > 25) {
                    category = "Growth Account";
                }

                const topProds = Array.from(c.productSales.values())
                    .filter(p => (p.qty > 0 || p.amount > 0) && !p.name.toUpperCase().includes("GENERIC"))
                    .sort((a, b) => b.amount - a.amount || b.qty - a.qty)
                    .slice(0, 5);

                return {
                    code: c.code,
                    name: c.name,
                    city: c.city,
                    district: c.district,
                    area: c.area,
                    route: c.route,
                    state: c.state || stateName,
                    pincode: c.pincode,
                    gstno: c.gstno,
                    phone: c.phone,
                    dlno: c.dlno,
                    email: c.email,
                    address: c.address,
                    dsm: c.dsm,
                    asm: c.asm,
                    rsm: c.rsm,
                    totalSales: Math.round(c.totalSales),
                    totalNetSales: Math.round(c.totalNetSales),
                    totalReturns: Math.round(c.totalReturns),
                    returnsRatioPercent: retPct,
                    invoicesCount: c.invoicesCount,
                    balance: Math.round(c.balance),
                    creditLimit: Math.round(c.creditLimit),
                    creditDays: c.creditDays,
                    lastSaleDate: c.lastSaleDate,
                    byFy: c.byFy,
                    salesGrowthPct: custGrowth,
                    category: category as "Key Account" | "Growth Account" | "Standard" | "High Return Risk",
                    topProducts: topProds,
                };
            });

            // Sort customers by total sales descending
            customerList.sort((a, b) => b.totalSales - a.totalSales);

            // Assign Top 20% Key Accounts
            const keyCount = Math.max(1, Math.ceil(customerList.length * 0.2));
            customerList.slice(0, keyCount).forEach(cust => {
                if (cust.category !== "High Return Risk") {
                    cust.category = "Key Account";
                }
            });

            const topCustomers = customerList.slice(0, 10).map(c => ({
                code: c.code,
                name: c.name,
                city: c.city,
                area: c.area,
                sales: c.totalSales,
                netSales: c.totalNetSales,
                gstno: c.gstno,
                phone: c.phone,
                invoicesCount: c.invoicesCount,
                byFy: c.byFy,
            }));

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
                customers: customerList,
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

