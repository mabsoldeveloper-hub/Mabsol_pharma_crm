import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import Customer from "@/models/Customer";
import AccountGroup from "@/models/AccountGroup";
import SalesDis from "@/models/SalesDis";       // DIS collection
import SalesMdis from "@/models/SalesMdis";     // MDIS collection
import GLedger from "@/models/GLedger";         // GLEDGER collection
import SaleType from "@/models/SaleType";       // SALETYPE collection
import MrTerritory from "@/models/MrTerritory";
import { getCurrentUser } from "@/lib/auth";

import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const companyVfpMatch = await getCompanyVfpFilter(searchParams);
    const restriction = await getMrTerritoryRestriction();

    // ---- Base customer records (every field on the Customer/Order table) ----
    const allCustomers: any[] = await Customer.find(combineFilters(companyVfpMatch)).sort({ PARNAM: 1 }).lean();

    const customers = restriction.isMrRestricted
        ? allCustomers.filter((c: any) => restriction.isPartyAllowed(c))
        : allCustomers;


    // ---- Account group lookup: Customer.SCODE -> AccountGroup.ORDNO ----
    const groups = await AccountGroup.find(
        {},
        { ORDNO: 1, PARNAM: 1, GROUP: 1, GCODE: 1 }
    ).lean();

    const groupMap = new Map<string, any>();
    groups.forEach((g: any) => {
        if (g.ORDNO) groupMap.set(String(g.ORDNO).trim(), g);
    });

    // ---- Sale type / tax lookup: Customer.SCODE -> SaleType.SCODE ----
    const saleTypes = await SaleType.find({}, { SCODE: 1, SNAME: 1 }).lean();
    const saleTypeMap = new Map<string, string>();
    saleTypes.forEach((s: any) => {
        if (s.SCODE) saleTypeMap.set(String(s.SCODE).trim(), s.SNAME || "");
    });

    // ---- Sales summary (DIS), grouped by CODEP -----------------------------
    const disAgg = await SalesDis.aggregate([
        {
            $group: {
                _id: "$CODEP",
                totalSales: { $sum: { $ifNull: ["$AMMMOUNT", 0] } },
                saleCount: { $sum: 1 },
                lastSaleDate: { $max: "$DATE" },
            },
        },
    ]);
    const disMap = new Map<string, any>();
    disAgg.forEach((d: any) => {
        if (d._id) disMap.set(String(d._id).trim(), d);
    });

    // ---- Purchase summary (MDIS), grouped by CODEP -------------------------
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

    // ---- Ledger summary (GLEDGER), grouped by CODE -------------------------
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

    // ---- Merge everything against each customer ----------------------------
    const result = customers.map((c: any) => {
        const ordno = c.ORDNO ? String(c.ORDNO).trim() : "";
        const scode = c.SCODE ? String(c.SCODE).trim() : "";

        const grp = groupMap.get(scode);
        const dis = disMap.get(ordno);
        const mdis = mdisMap.get(ordno);
        const gl = gledgerMap.get(ordno);

        return {
            ...c,

            // Group info
            GROUPCODE: scode,
            GROUPNAME: grp?.PARNAM || "",
            MAINGROUP: grp?.GROUP || "",
            PARENTGROUP: grp?.GCODE || "",

            // Tax / sale-type name
            TAXTYPENAME: saleTypeMap.get(scode) || "",

            // Sales (DIS)
            TOTALSALES: dis?.totalSales || 0,
            SALECOUNT: dis?.saleCount || 0,
            LASTSALEDATE: dis?.lastSaleDate || null,

            // Purchase (MDIS)
            TOTALPURCHASE: mdis?.totalPurchase || 0,
            PURCHASECOUNT: mdis?.purchaseCount || 0,
            LASTPURCHASEDATE: mdis?.lastPurchaseDate || null,

            // Ledger (GLEDGER)
            LEDGERDEBIT: gl?.totalDebit || 0,
            LEDGERCREDIT: gl?.totalCredit || 0,
            LEDGERBALANCE: (gl?.totalDebit || 0) - (gl?.totalCredit || 0),
            LEDGERTXNCOUNT: gl?.txnCount || 0,
            LASTLEDGERDATE: gl?.lastLedgerDate || null,
        };
    });

    return NextResponse.json(result);
}