import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import AccountGroup from "@/models/AccountGroup";
import Customer from "@/models/Customer";
import GLedger from "@/models/GLedger";

// GET /api/master/accounting-group/[id]
//
// Returns one account group ( _id ) fully expanded:
//   - group            : the ACGROUP row itself
//   - parentChain       : array of ancestor groups, root first
//   - children          : direct sub-groups (one level down)
//   - customers         : parties whose SCODE == group.ORDNO, each with its own ledger totals
//   - totals            : rollups across the customers above

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    await connectDB();

    let group: any = null;
    try {
        group = await AccountGroup.findById(params.id).lean();
    } catch (err) {
        console.error("[accountgroup/:id] invalid id or query error:", params.id, err);
        return NextResponse.json({ error: "Invalid account group id" }, { status: 400 });
    }

    if (!group) {
        console.warn("[accountgroup/:id] no document found for _id:", params.id);
        return NextResponse.json({ error: "Account group not found" }, { status: 404 });
    }

    const allGroups: any[] = await AccountGroup.find({}).lean();
    const byOrdno = new Map<string, any>();
    allGroups.forEach((g) => {
        if (g.ORDNO) byOrdno.set(String(g.ORDNO).trim(), g);
    });

    // ---- Walk up the parent chain (root first) -----------------------------
    const parentChain: any[] = [];
    let cursor = group.GROUP ? String(group.GROUP).trim() : "";
    const seen = new Set<string>();
    while (cursor && byOrdno.has(cursor) && !seen.has(cursor)) {
        seen.add(cursor);
        const p = byOrdno.get(cursor);
        parentChain.unshift({ _id: p._id, ORDNO: p.ORDNO, PARNAM: p.PARNAM });
        cursor = p.GROUP ? String(p.GROUP).trim() : "";
    }

    // ---- Direct children -----------------------------------------------------
    const ordno = group.ORDNO ? String(group.ORDNO).trim() : "";
    const children = allGroups
        .filter((g) => g.GROUP && String(g.GROUP).trim() === ordno)
        .map((g) => ({
            _id: g._id,
            ORDNO: g.ORDNO,
            PARNAM: g.PARNAM,
            BALANCE: g.BALANCE || 0,
            CON: g.CON,
        }));

    // ---- Customers under this group -------------------------------------------
    const customers: any[] = await Customer.find({ SCODE: ordno }).lean();
    const customerCodes = customers.map((c) => (c.ORDNO ? String(c.ORDNO).trim() : "")).filter(Boolean);

    const gledgerAgg = customerCodes.length
        ? await GLedger.aggregate([
            { $match: { CODE: { $in: customerCodes } } },
            {
                $group: {
                    _id: "$CODE",
                    totalDebit: { $sum: { $ifNull: ["$DEBIT", 0] } },
                    totalCredit: { $sum: { $ifNull: ["$CREDIT", 0] } },
                    txnCount: { $sum: 1 },
                    lastDate: { $max: "$DATE" },
                },
            },
        ])
        : [];

    const gledgerMap = new Map<string, any>();
    gledgerAgg.forEach((d: any) => {
        if (d._id) gledgerMap.set(String(d._id).trim(), d);
    });

    const customersOut = customers.map((c: any) => {
        const code = c.ORDNO ? String(c.ORDNO).trim() : "";
        const gl = gledgerMap.get(code);
        return {
            _id: c._id,
            ORDNO: c.ORDNO,
            PARNAM: c.PARNAM,
            CITY: c.CITY,
            PHONE1: c.PHONE1,
            STATUS: c.STATUS,
            BALANCE: c.BALANCE || 0,
            LEDGERDEBIT: gl?.totalDebit || 0,
            LEDGERCREDIT: gl?.totalCredit || 0,
            LEDGERBALANCE: (gl?.totalDebit || 0) - (gl?.totalCredit || 0),
            LEDGERTXNCOUNT: gl?.txnCount || 0,
            LASTTXNDATE: gl?.lastDate || null,
        };
    });

    const totals = customersOut.reduce(
        (acc, c) => {
            acc.customerCount += 1;
            if (c.STATUS === "Y") acc.activeCustomerCount += 1;
            acc.customerBalance += c.BALANCE;
            acc.ledgerDebit += c.LEDGERDEBIT;
            acc.ledgerCredit += c.LEDGERCREDIT;
            acc.ledgerTxnCount += c.LEDGERTXNCOUNT;
            return acc;
        },
        {
            customerCount: 0,
            activeCustomerCount: 0,
            customerBalance: 0,
            ledgerDebit: 0,
            ledgerCredit: 0,
            ledgerTxnCount: 0,
        }
    );

    return NextResponse.json({
        group: {
            ...group,
            PARENTCODE: group.GROUP ? String(group.GROUP).trim() : "",
            PARENTNAME: parentChain.length ? parentChain[parentChain.length - 1].PARNAM : "",
            ISROOT: !group.GROUP,
            CHILDCOUNT: children.length,
        },
        parentChain,
        children,
        customers: customersOut,
        totals: {
            ...totals,
            ledgerBalance: totals.ledgerDebit - totals.ledgerCredit,
        },
    });
}