import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import AccountGroup from "@/models/AccountGroup";
import Customer from "@/models/Customer";   // ORDER collection (customers)
import GLedger from "@/models/GLedger";     // GLEDGER collection

// NOTE: Put this file at: src/app/api/accountgroup/full/route.ts
// (matching page.tsx at src/app/dashboard/accounts/group/full/page.tsx)
//
// Join keys (confirmed from real exported data):
//   AccountGroup.GROUP   <-->  AccountGroup.ORDNO   (self join -> parent group)
//   AccountGroup.ORDNO   <-->  Customer.SCODE       (customers that fall under this group)
//   Customer.ORDNO       <-->  GLedger.CODE         (ledger balance per customer)
//
// ACGROUP (ACGROUP_E10.DBF) has 27 real business fields (rest is _vfp* sync metadata):
//   ORDNO, PARNAM, GROUP, GCODE, TYPE, CON, SINGLE,
//   OPNING, OPNINGD, DEBIT, DEBITD, CREDIT, CREDITD, BALANCE, BALANCED, BUDGET,
//   PAYCR, PAYDR, PURCR, PURDR, RECCR, RECDR, SALCR, SALDR,
//   CIN, COUT, DATE

export async function GET() {
    await connectDB();

    // ---- Base account-group records --------------------------------------
    const groups: any[] = await AccountGroup.find({}).sort({ ORDNO: 1 }).lean();

    // ---- Self-join map: ORDNO -> group (so we can resolve parent/child names) ----
    const byOrdno = new Map<string, any>();
    groups.forEach((g: any) => {
        if (g.ORDNO) byOrdno.set(String(g.ORDNO).trim(), g);
    });

    // ---- Child-count map: how many groups point to this one as parent ----
    const childCountMap = new Map<string, number>();
    groups.forEach((g: any) => {
        const parent = g.GROUP ? String(g.GROUP).trim() : "";
        if (parent) childCountMap.set(parent, (childCountMap.get(parent) || 0) + 1);
    });

    // ---- Customers per group: Customer.SCODE -> AccountGroup.ORDNO --------
    const customers: any[] = await Customer.find(
        {},
        { SCODE: 1, ORDNO: 1, BALANCE: 1, STATUS: 1 }
    ).lean();

    const customerAgg = new Map<string, { count: number; activeCount: number; totalBalance: number; codes: string[] }>();
    customers.forEach((c: any) => {
        const scode = c.SCODE ? String(c.SCODE).trim() : "";
        if (!scode) return;
        const entry = customerAgg.get(scode) || { count: 0, activeCount: 0, totalBalance: 0, codes: [] };
        entry.count += 1;
        if (c.STATUS === "Y") entry.activeCount += 1;
        entry.totalBalance += Number(c.BALANCE || 0);
        if (c.ORDNO) entry.codes.push(String(c.ORDNO).trim());
        customerAgg.set(scode, entry);
    });

    // ---- Ledger rollup for every customer code touched above --------------
    const allCustomerCodes = Array.from(new Set(customers.map((c: any) => (c.ORDNO ? String(c.ORDNO).trim() : "")).filter(Boolean)));

    const gledgerAgg = await GLedger.aggregate([
        { $match: { CODE: { $in: allCustomerCodes } } },
        {
            $group: {
                _id: "$CODE",
                totalDebit: { $sum: { $ifNull: ["$DEBIT", 0] } },
                totalCredit: { $sum: { $ifNull: ["$CREDIT", 0] } },
                txnCount: { $sum: 1 },
            },
        },
    ]);
    const gledgerMap = new Map<string, any>();
    gledgerAgg.forEach((d: any) => {
        if (d._id) gledgerMap.set(String(d._id).trim(), d);
    });

    // ---- Merge everything against each account group -----------------------
    const result = groups.map((g: any) => {
        const ordno = g.ORDNO ? String(g.ORDNO).trim() : "";
        const parentCode = g.GROUP ? String(g.GROUP).trim() : "";
        const parent = parentCode ? byOrdno.get(parentCode) : null;

        const custEntry = customerAgg.get(ordno);
        const custCodes = custEntry?.codes || [];

        let ledgerDebit = 0;
        let ledgerCredit = 0;
        let ledgerTxnCount = 0;
        custCodes.forEach((code) => {
            const gl = gledgerMap.get(code);
            if (gl) {
                ledgerDebit += gl.totalDebit || 0;
                ledgerCredit += gl.totalCredit || 0;
                ledgerTxnCount += gl.txnCount || 0;
            }
        });

        return {
            ...g,

            // Hierarchy (derived)
            PARENTCODE: parentCode,
            PARENTNAME: parent?.PARNAM || "",
            ISROOT: !parentCode,
            CHILDCOUNT: childCountMap.get(ordno) || 0,

            // Customer rollup (derived)
            CUSTOMERCOUNT: custEntry?.count || 0,
            ACTIVECUSTOMERCOUNT: custEntry?.activeCount || 0,
            CUSTOMERBALANCE: custEntry?.totalBalance || 0,

            // Ledger rollup (derived)
            LEDGERDEBIT: ledgerDebit,
            LEDGERCREDIT: ledgerCredit,
            LEDGERBALANCE: ledgerDebit - ledgerCredit,
            LEDGERTXNCOUNT: ledgerTxnCount,
        };
    });

    return NextResponse.json(result);
}