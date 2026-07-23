import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import AccountGroup from "@/models/AccountGroup";
import Customer from "@/models/Customer";
import GLedger from "@/models/GLedger";

// GET /api/master/accounting-group/[id]/ledger
//
// Returns every GLEDGER entry belonging to any customer/party whose
// SCODE equals this group's ORDNO, newest first, with a running balance.

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    await connectDB();

    let group: any = null;
    try {
        group = await AccountGroup.findById(params.id).lean();
    } catch (err) {
        console.error("[accountgroup/:id/ledger] invalid id or query error:", params.id, err);
        return NextResponse.json({ error: "Invalid account group id" }, { status: 400 });
    }

    if (!group) {
        console.warn("[accountgroup/:id/ledger] no document found for _id:", params.id);
        return NextResponse.json({ error: "Account group not found" }, { status: 404 });
    }

    const ordno = group.ORDNO ? String(group.ORDNO).trim() : "";

    const customers: any[] = await Customer.find({ SCODE: ordno }, { ORDNO: 1, PARNAM: 1 }).lean();
    const codeToName = new Map<string, string>();
    customers.forEach((c) => {
        if (c.ORDNO) codeToName.set(String(c.ORDNO).trim(), c.PARNAM || "");
    });
    const customerCodes = Array.from(codeToName.keys());

    if (!customerCodes.length) {
        return NextResponse.json({
            group: { _id: group._id, ORDNO: group.ORDNO, PARNAM: group.PARNAM },
            entries: [],
            openingBalance: Number(group.OPNING || 0),
            totals: { debit: 0, credit: 0, balance: 0, count: 0 },
        });
    }

    const rows: any[] = await GLedger.find({ CODE: { $in: customerCodes } })
        .sort({ DATE: 1, _id: 1 })
        .lean();

    const opening = Number(group.OPNING || 0);
    let running = opening;

    const entries = rows.map((r: any) => {
        const debit = Number(r.DEBIT || 0);
        const credit = Number(r.CREDIT || 0);
        running += debit - credit;
        return {
            _id: r._id,
            DATE: r.DATE,
            PARTYCODE: r.CODE,
            PARTYNAME: codeToName.get(String(r.CODE || "").trim()) || "",
            COUNTERCODE: r.CODE1,
            BOOK: r.BOOK,
            TYPE: r.TYPE,
            VOUCHER: r.VOUCHER,
            DEBIT: debit,
            CREDIT: credit,
            RUNNINGBALANCE: running,
            REMARK1: r.REMARK1,
            REMARK2: r.REMARK2,
        };
    });

    const totals = entries.reduce(
        (acc, e) => {
            acc.debit += e.DEBIT;
            acc.credit += e.CREDIT;
            acc.count += 1;
            return acc;
        },
        { debit: 0, credit: 0, count: 0 }
    );

    // Present newest-first for the UI, keep running balance computed chronologically above
    entries.reverse();

    return NextResponse.json({
        group: { _id: group._id, ORDNO: group.ORDNO, PARNAM: group.PARNAM },
        entries,
        openingBalance: opening,
        totals: { ...totals, balance: opening + totals.debit - totals.credit },
    });
}