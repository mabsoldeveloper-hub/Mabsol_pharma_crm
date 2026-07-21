import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesDis from "@/models/SalesDis";
import SubDis from "@/models/SubDis";
import Pend from "@/models/Pend";
import Product from "@/models/Product";
import {
    buildStateResolution,
    resolveState,
    monthFilter,
    MAP_ID_TO_STATE_NAMES,
    buildOrdnoToPartyMap,
    resolvePartyName,
} from "@/lib/indiaMapStateResolver";


/**
 * GET /api/dashboard/india-map/[state]
 * -----------------------------------------------------------------------------
 * State drill-down for the map's click-through panel.
 *
 * FIX (Bug 1) — Party rows used to be labelled by their raw CODEP code
 * (e.g. "Party PY") because CODEP only exists on 49/297 ORDER rows and
 * matches zero party codes in MDIS/PEND/GLEDGER/SUBDIS. ORDER.ORDNO is the
 * real join key (100% match, verified against your actual export — see
 * lib/indiaMapStateResolver.ts for the exact counts), so every party code
 * below (CODEP from MDIS, ORD from PEND) is now resolved through
 * buildOrdnoToPartyMap() to a real name, falling back to `Party ${code}`
 * only if that specific code genuinely isn't in ORDER.
 *
 * [state] is the lowercase map id used by india-map-data.ts, e.g. "up", "mh",
 * "jk" (not the full state name) — same id the frontend already has on hand
 * from the click event, so no extra lookup is needed on that side.
 *
 * Query params: ?fy=2026-27&month=Jul (optional, same semantics as the
 * national route).
 *
 * FIX (build error) — Next.js 15/16 changed dynamic route handler `params`
 * from a plain object to a Promise: `{ params: Promise<{ state: string }> }`
 * instead of `{ params: { state: string } }`. Fixed by typing params as a
 * Promise and `await`-ing it before use.
 * -----------------------------------------------------------------------------
 */

export async function GET(req: Request, { params }: { params: Promise<{ state: string }> }) {
    try {
        await connectDB();

        const { state: stateParam } = await params;
        const stateId = stateParam?.toLowerCase();
        const stateNames = MAP_ID_TO_STATE_NAMES[stateId];
        if (!stateNames || stateNames.length === 0) {
            return NextResponse.json({ error: `Unknown state id "${stateParam}"` }, { status: 404 });
        }
        const stateNameSet = new Set(stateNames);

        const { searchParams } = new URL(req.url);
        const fy = searchParams.get("fy");
        const month = searchParams.get("month");

        const resolution = await buildStateResolution();
        const ordnoMap = await buildOrdnoToPartyMap();
        const inState = (codep?: string | null, voucher?: number | null) => {
            const state = resolveState(resolution, codep, voucher);
            return state ? stateNameSet.has(state) : false;
        };

        // ---- Top parties by Sales + recent sales vouchers ----
        const salesByParty = new Map<string, number>();
        const recentSales: { vcn: string; date: string; final: number; codep: string; partyName: string }[] = [];
        resolution.mdisRows.forEach((r: any) => {
            if (r.TYPE !== "S") return;
            if (!inState(r.CODEP, r.VOUCHER)) return;
            if (!monthFilter(r.DATE, fy, month)) return;
            if (r.CODEP) salesByParty.set(r.CODEP, (salesByParty.get(r.CODEP) || 0) + (r.FINAL || 0));
            recentSales.push({
                vcn: r.VCN || "—",
                date: r.DATE,
                final: r.FINAL || 0,
                codep: r.CODEP || "—",
                partyName: resolvePartyName(ordnoMap, r.CODEP),
            });
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
                name: resolvePartyName(ordnoMap, code),
                sales,
                outstanding: outstandingByParty.get(code) || 0,
            }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10);

        const topOutstandingParties = Array.from(outstandingByParty.entries())
            .map(([code, outstanding]) => ({
                code,
                name: resolvePartyName(ordnoMap, code),
                outstanding,
            }))
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
        // NOTE: if this list is empty across every state, it's very likely a
        // data-import issue, not a code issue — see the header note in
        // models/SubDis.ts about the exact MongoDB collection name expected
        // ("vfp_new_folder_subdis"), and confirm your import script wrote
        // subdis.json's rows into that exact collection.
        const subdisRows = await SubDis.find({}, { VOUCHER: 1, CODEP: 1, DATE: 1, VCN: 1 }).lean();
        const recentDispatch: { vcn: string; date: string; codep: string; partyName: string }[] = [];
        subdisRows.forEach((r: any) => {
            if (!inState(r.CODEP, r.VOUCHER)) return;
            if (!monthFilter(r.DATE, fy, month)) return;
            recentDispatch.push({
                vcn: r.VCN || "—",
                date: r.DATE,
                codep: r.CODEP || "—",
                partyName: resolvePartyName(ordnoMap, r.CODEP),
            });
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
            note: "Party names are resolved via ORDER.ORDNO (verified 100% match against MDIS/PEND/GLEDGER/SUBDIS party codes in your export) — falls back to the raw code only if a specific code truly has no matching ORDER row.",
        });
    } catch (err) {
        console.error("india-map/[state] API error:", err);
        return NextResponse.json({ error: "Failed to load state drill-down data" }, { status: 500 });
    }
}