import Customer from "@/models/Customer";
import SalesDis from "@/models/SalesDis";       // DIS collection
import SalesMdis from "@/models/SalesMdis";     // MDIS collection
import GLedger from "@/models/GLedger";         // GLEDGER collection
import {
    extractPincode,
    extractDistrict,
    stateFromGstno,
    stateFromCity,
    cleanPartyName,
    isRealParty,
} from "@/lib/indiaMapStateResolver";

/**
 * lib/areaMasterData.ts
 * -----------------------------------------------------------------------------
 * Single source of truth for the Area Master (list page + per-area "View"
 * detail page both call getEnrichedParties() and derive their own rollups
 * from the same enriched party rows, so the two screens can never disagree).
 *
 * WHAT CHANGED vs the old area/route.ts:
 *   1. isRealParty() now filters out ledger/accounting heads (RENT, CASH,
 *      FREIGHT, CAPITAL ACCOUNT, tax heads, etc.) — same filter already
 *      proven out on the Party Directory. Previously every VFP account
 *      (real customers AND ledger heads) was counted, which inflated
 *      TOTALCUSTOMERS and diluted every financial rollup.
 *   2. Customer.AREA is still 0% populated in the real export, so instead
 *      of dumping every party into a single "Unassigned" bucket, each party
 *      is now assigned an area key with this priority:
 *          explicit AREA  ->  District (parsed from address)  ->  City  ->  "Unassigned"
 *      `areaSource` on every row says which of those was actually used, so
 *      the UI can flag derived (non-explicit) areas instead of pretending
 *      they're confirmed.
 *   3. District / Pincode / State are parsed per party from PARADD/PARADD1/
 *      PARADD2 + GSTNO — identical logic to the Party Directory — and rolled
 *      up per area.
 *   4. Phone now falls back PHONE1 -> PHONE2 -> PHONE4. PHONE4 is the field
 *      that's actually populated in the real export (~126/297 rows) —
 *      PHONE1/PHONE2 are almost always blank.
 * -----------------------------------------------------------------------------
 */

export const UNASSIGNED = "Unassigned";

export type AreaSource = "area" | "district" | "city" | "unassigned";

export interface EnrichedParty {
    ordno: string;
    name: string;
    area: string;
    areaSource: AreaSource;
    city: string | null;
    district: string | null;
    districtSource: "address" | "city" | null;
    pincode: string | null;
    state: string | null;
    gstno: string | null;
    phone: string | null;
    status: any;
    dsmList: string[];
    rsm: string;
    asm: string;
    rout: string;
    hasGst: boolean;
    balance: number;
    limit: number;
    isBuyer: boolean;
    isSupplier: boolean;
    totalSales: number;
    saleCount: number;
    lastSaleDate: any;
    totalPurchase: number;
    purchaseCount: number;
    lastPurchaseDate: any;
    ledgerDebit: number;
    ledgerCredit: number;
    ledgerTxnCount: number;
    lastLedgerDate: any;
}

export async function getEnrichedParties(): Promise<EnrichedParty[]> {
    // ---- Base customer records (added PARADD*/PHONE*/SALDR/PURCR vs before) --
    const customers: any[] = await Customer.find(
        {},
        {
            ORDNO: 1,
            PARNAM: 1,
            AREA: 1,
            CITY: 1,
            STATUS: 1,
            DSM: 1,
            RSM: 1,
            ASM: 1,
            ROUT: 1,
            GSTNO: 1,
            BALANCE: 1,
            LIMIT: 1,
            PARADD: 1,
            PARADD1: 1,
            PARADD2: 1,
            PHONE1: 1,
            PHONE2: 1,
            PHONE4: 1,
            SALDR: 1,
            PURCR: 1,
        }
    ).lean();

    // ---- Sales summary (DIS), grouped by CODEP -----------------------------
    const disAgg = await SalesDis.aggregate([
        {
            $group: {
                _id: "$CODEP",
                totalSales: { $sum: { $ifNull: ["$AMMMOUNT", 0] } },
                saleCount: { $sum: 1 },
                lastSaleDate: { $max: "$DATE" },
                dsmCodes: { $addToSet: "$DSM" },
            },
        },
    ]);
    const disMap = new Map<string, any>();
    disAgg.forEach((d: any) => {
        if (d._id) disMap.set(String(d._id).trim(), d);
    });

    // ---- Purchase summary (MDIS), grouped by CODEP ------------------------
    const mdisAgg = await SalesMdis.aggregate([
        {
            $group: {
                _id: "$CODEP",
                totalPurchase: { $sum: { $ifNull: ["$AMOUNTT", 0] } },
                purchaseCount: { $sum: 1 },
                lastPurchaseDate: { $max: "$DATE" },
            },
        },
    ]);
    const mdisMap = new Map<string, any>();
    mdisAgg.forEach((d: any) => {
        if (d._id) mdisMap.set(String(d._id).trim(), d);
    });

    // ---- Ledger summary (GLEDGER), grouped by CODE ------------------------
    const gledgerAgg = await GLedger.aggregate([
        {
            $group: {
                _id: "$CODE",
                totalDebit: { $sum: { $ifNull: ["$DEBIT", 0] } },
                totalCredit: { $sum: { $ifNull: ["$CREDIT", 0] } },
                txnCount: { $sum: 1 },
                lastLedgerDate: { $max: "$DATE" },
            },
        },
    ]);
    const gledgerMap = new Map<string, any>();
    gledgerAgg.forEach((d: any) => {
        if (d._id) gledgerMap.set(String(d._id).trim(), d);
    });

    // ---- Drop ledger/accounting heads, keep only real trade parties --------
    const realCustomers = customers.filter((c: any) => isRealParty(c.PARNAM, c));

    // ---- Enrich every real party --------------------------------------------
    return realCustomers.map((c: any) => {
        const ordno = c.ORDNO ? String(c.ORDNO).trim() : "";
        const dis = disMap.get(ordno);
        const mdis = mdisMap.get(ordno);
        const gl = gledgerMap.get(ordno);
        const balance = Number(c.BALANCE || 0);

        const city = c.CITY ? String(c.CITY).trim() : null;
        const pincode = extractPincode(c.PARADD, c.PARADD1, c.PARADD2, city);
        const { district, source: districtSource } = extractDistrict(city, c.PARADD, c.PARADD1, c.PARADD2);
        const state = stateFromGstno(c.GSTNO) ?? stateFromCity(city);
        const phone = c.PHONE1 || c.PHONE2 || c.PHONE4 || null;

        // Area key priority: explicit AREA -> District -> City -> Unassigned
        const explicitArea = (c.AREA || "").toString().trim();
        let area = explicitArea;
        let areaSource: AreaSource = "area";
        if (!area) {
            if (district) {
                area = district;
                areaSource = "district";
            } else if (city) {
                area = city;
                areaSource = "city";
            } else {
                area = UNASSIGNED;
                areaSource = "unassigned";
            }
        }

        // DSM sourced from actual sales activity (DIS), not Customer.DSM.
        const dsmList: string[] = (dis?.dsmCodes || [])
            .map((d: any) => (d || "").toString().trim())
            .filter(Boolean);

        return {
            ordno,
            name: cleanPartyName(c.PARNAM, city),
            area,
            areaSource,
            city,
            district,
            districtSource,
            pincode,
            state,
            gstno: c.GSTNO || null,
            phone,
            status: c.STATUS,
            dsmList,
            rsm: (c.RSM || "").toString().trim(),
            asm: (c.ASM || "").toString().trim(),
            rout: (c.ROUT || "").toString().trim(),
            hasGst: !!c.GSTNO,
            balance,
            limit: Number(c.LIMIT || 0),
            isBuyer: c.SALDR === "Y",
            isSupplier: c.PURCR === "Y",
            totalSales: dis?.totalSales || 0,
            saleCount: dis?.saleCount || 0,
            lastSaleDate: dis?.lastSaleDate || null,
            totalPurchase: mdis?.totalPurchase || 0,
            purchaseCount: mdis?.purchaseCount || 0,
            lastPurchaseDate: mdis?.lastPurchaseDate || null,
            ledgerDebit: gl?.totalDebit || 0,
            ledgerCredit: gl?.totalCredit || 0,
            ledgerTxnCount: gl?.txnCount || 0,
            lastLedgerDate: gl?.lastLedgerDate || null,
        };
    });
}