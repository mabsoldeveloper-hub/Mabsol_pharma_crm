import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { SalesDis, SubDis, Pend, Product } from "@/models/IndiaMapModels";
import { buildStateResolution, resolveState, monthFilter, MAP_ID_TO_STATE_NAMES } from "@/lib/indiaMapStateResolver";

/**
 * GET /api/dashboard/india-map/[state]
 * -----------------------------------------------------------------------------
 * State drill-down that the map's click-through panel was waiting on
 * (previously the frontend only had the summary fields from the national
 * rollup). Groups MDIS/DIS/SUBDIS/PEND by CODEP within the requested state.
 *
 * [state] is the lowercase map id used by india-map-data.ts, e.g. "up", "mh",
 * "jk" (not the full state name) — same id the frontend already has on hand
 * from the click event, so no extra lookup is needed on that side.
 *
 * Party rows are labelled by their CODEP code (e.g. "IQ"), not a real name —
 * see the ORDER join-gap note in models/IndiaMapModels.ts. If/when a mapping
 * from CODEP to ORDER's ledger becomes available, swap the `code` field
 * below for a resolved `name` with no other changes needed here.
 *
 * Query params: ?fy=2026-27&month=Jul (optional, same semantics as the
 * national route).
 * -----------------------------------------------------------------------------
 */

export async function GET(req: Request, { params }: { params: { state: string } }) {
    try {
        await connectDB();

        const stateId = params.state?.toLowerCase();
        const stateNames = MAP_ID_TO_STATE_NAMES[stateId];
        if (!stateNames || stateNames.length === 0) {
            return NextResponse.json({ error: `Unknown state id "${params.state}"` }, { status: 404 });
        }
        const stateNameSet = new Set(stateNames);

        const { searchParams } = new URL(req.url);
        const fy = searchParams.get("fy");
        const month = searchParams.get("month");

        const resolution = await buildStateResolution();
        const inState = (codep?: string | null, voucher?: number | null) => {
            const state = resolveState(resolution, codep, voucher);
            return state ? stateNameSet.has(state) : false;
        };

        // ---- Top parties by Sales + recent sales vouchers ----
        const salesByParty = new Map<string, number>();
        const recentSales: { vcn: string; date: string; final: number; codep: string }[] = [];
        resolution.mdisRows.forEach((r: any) => {
            if (r.TYPE !== "S") return;
            if (!inState(r.CODEP, r.VOUCHER)) return;
            if (!monthFilter(r.DATE, fy, month)) return;
            if (r.CODEP) salesByParty.set(r.CODEP, (salesByParty.get(r.CODEP) || 0) + (r.FINAL || 0));
            recentSales.push({ vcn: r.VCN || "—", date: r.DATE, final: r.FINAL || 0, codep: r.CODEP || "—" });
        });
        recentSales.sort((a, b) => (a.date < b.date ? 1 : -1));

        // ---- Outstanding by party (PEND, not date-filtered — as-of balance) ----
        const pendRows = await Pend.find({}, { VOUCHER: 1, SVOUCHER: 1, ORD: 1, FINAL: 1 }).lean();
        const outstandingByParty = new Map<string, number>();
        pendRows.forEach((r: any) => {
            if (!inState(r.ORD, r.VOUCHER) && !(r.SVOUCHER && inState(null, r.SVOUCHER))) return;
            const key = r.ORD || "—";
            outstandingByParty.set(key, (outstandingByParty.get(key) || 0) + (r.FINAL || 0));
        });

        const topParties = Array.from(salesByParty.entries())
            .map(([code, sales]) => ({
                code,
                sales,
                outstanding: outstandingByParty.get(code) || 0,
            }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10);

        const topOutstandingParties = Array.from(outstandingByParty.entries())
            .map(([code, outstanding]) => ({ code, outstanding }))
            .sort((a, b) => Math.abs(b.outstanding) - Math.abs(a.outstanding))
            .slice(0, 10);

        // ---- Top products (DIS qty within state) ----
        const disRows = await SalesDis.find({}, { VOUCHER: 1, CODEP: 1, CODE: 1, QTY: 1, DATE: 1 }).lean();
        const qtyByProduct = new Map<string, number>();
        disRows.forEach((r: any) => {
            if (!inState(r.CODEP, r.VOUCHER)) return;
            if (!monthFilter(r.DATE, fy, month)) return;
            const key = String(r.CODE);
            qtyByProduct.set(key, (qtyByProduct.get(key) || 0) + (r.QTY || 0));
        });
        const topProductCodes = Array.from(qtyByProduct.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([code]) => code);
        const productDocs = await Product.find(
            { CODE: { $in: topProductCodes.map(Number) } },
            { CODE: 1, BILLNAME: 1, PRODUCT: 1 }
        ).lean();
        const productNames = new Map<string, string>();
        productDocs.forEach((p: any) => productNames.set(String(p.CODE), p.BILLNAME || p.PRODUCT || "—"));
        const topProducts = topProductCodes.map((code) => ({
            code,
            name: productNames.get(code) || "—",
            qty: qtyByProduct.get(code) || 0,
        }));

        // ---- Recent dispatch (SUBDIS within state) ----
        const subdisRows = await SubDis.find({}, { VOUCHER: 1, CODEP: 1, DATE: 1, VCN: 1 }).lean();
        const recentDispatch: { vcn: string; date: string; codep: string }[] = [];
        subdisRows.forEach((r: any) => {
            if (!inState(r.CODEP, r.VOUCHER)) return;
            if (!monthFilter(r.DATE, fy, month)) return;
            recentDispatch.push({ vcn: r.VCN || "—", date: r.DATE, codep: r.CODEP || "—" });
        });
        recentDispatch.sort((a, b) => (a.date < b.date ? 1 : -1));

        return NextResponse.json({
            stateId,
            stateNames,
            topParties,
            topOutstandingParties,
            topProducts,
            recentSales: recentSales.slice(0, 10),
            recentDispatch: recentDispatch.slice(0, 10),
            filters: { fy, month },
            note: "Party rows are labelled by CODEP code, not a resolved name — see models/IndiaMapModels.ts for why ORDER can't be joined here yet.",
        });
    } catch (err) {
        console.error("india-map/[state] API error:", err);
        return NextResponse.json({ error: "Failed to load state drill-down data" }, { status: 500 });
    }
}