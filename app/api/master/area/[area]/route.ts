import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getEnrichedParties } from "@/lib/areaMasterData";

// NOTE: Put this file at: src/app/api/master/area/[area]/route.ts
//
// FIX: On Next.js 15+, route handler `params` is a Promise and MUST be
// awaited. The previous version destructured `params.area` synchronously,
// so `area` was always undefined -> filter matched 0 rows -> "no data"
// on the View page. Also normalized matching (trim + case-insensitive)
// so stray whitespace/case differences between the list page's AREA value
// and this route's param can never cause a silent empty result.

export async function GET(
    _req: Request,
    context: { params: Promise<{ area: string }> }
) {
    await connectDB();

    const { area } = await context.params;
    const areaParam = decodeURIComponent(area || "").trim();

    const parties = await getEnrichedParties();
    const matched = parties.filter(
        (p) => p.area.trim().toLowerCase() === areaParam.toLowerCase()
    );

    if (matched.length === 0) {
        return NextResponse.json({ area: areaParam, parties: [], summary: null }, { status: 200 });
    }

    const summary = matched.reduce(
        (acc, p) => {
            acc.totalCustomers += 1;
            if (p.balance > 0) acc.totalOutstanding += p.balance;
            if (p.balance < 0) acc.totalCreditBal += Math.abs(p.balance);
            acc.totalSales += p.totalSales;
            acc.totalPurchase += p.totalPurchase;
            acc.gstCount += p.hasGst ? 1 : 0;
            acc.phoneCount += p.phone ? 1 : 0;
            return acc;
        },
        { totalCustomers: 0, totalOutstanding: 0, totalCreditBal: 0, totalSales: 0, totalPurchase: 0, gstCount: 0, phoneCount: 0 }
    );

    const parties_ = matched
        .map((p) => ({
            name: p.name,
            city: p.city,
            district: p.district,
            districtSource: p.districtSource,
            pincode: p.pincode,
            state: p.state,
            gstno: p.gstno,
            phone: p.phone,
            balance: p.balance,
            isBuyer: p.isBuyer,
            isSupplier: p.isSupplier,
            totalSales: p.totalSales,
            saleCount: p.saleCount,
            lastSaleDate: p.lastSaleDate,
            totalPurchase: p.totalPurchase,
            purchaseCount: p.purchaseCount,
            lastPurchaseDate: p.lastPurchaseDate,
            ledgerBalance: p.ledgerDebit - p.ledgerCredit,
            ordno: p.ordno,
        }))
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    return NextResponse.json({
        area: areaParam,
        summary,
        parties: parties_,
    });
}