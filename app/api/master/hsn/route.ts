import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import Product from "@/models/Product";     // PRO collection
import SaleType from "@/models/SaleType";   // SALETYPE collection
import Rate from "@/models/Rate";           // RATE collection

// NOTE: Put this file at: src/app/api/master/hsn/route.ts
// (matching page.tsx at src/app/dashboard/master/hsn-master/page.tsx)
//
// This is an HSN-level master, not a product-level list — one row per
// distinct HSN/SAC code. Join keys:
//
//   SaleType (SGCODE === "COMMCD") IS the HSN master itself:
//     SaleType.SNAME   -> the HSN / SAC code, and — on a few rows — extra
//                         trailing text after padding (e.g. "21069099  FOOD").
//                         Split into HSNCODE (first token) and DESCRIPTION
//                         (anything after it, blank when there isn't any).
//                         PARNAM on this table just duplicates SNAME, so it's
//                         not used.
//     SaleType.CGST    -> CGST % for that HSN     (authoritative, straight from the table)
//     SaleType.IGST    -> IGST % for that HSN     (authoritative, straight from the table)
//     SGST is not stored separately — under GST rules SGST always equals CGST,
//     so it's derived here, not pulled from any table.
//     "Normal" / total GST % = CGST + SGST (this is what was missing before).
//     GCODE on SaleType is blank on every COMMCD row in the real data, so it's
//     dropped from the output entirely — showing it added a useless column.
//
//   PRO.GCODE6  <-->  SaleType.SCODE   — links each product to its HSN, used
//                     only to build the product-coverage numbers below.
//
//   RATE.PCODE  <-->  PRO.CODE (string vs number, cast both to string) — this
//                     is a per-product scheme/deal rate history, NOT GST. Kept
//                     as a separate "Scheme Rate" range so it isn't confused
//                     with the actual GST% above.

export async function GET() {
    await connectDB();

    const products = await Product.find(
        {},
        { CODE: 1, PRODUCT: 1, BILLNAME: 1, GCODE6: 1, STATUS: 1 }
    ).lean();

    const saleTypes = await SaleType.find(
        {},
        { SCODE: 1, SNAME: 1, SGCODE: 1, PARNAM: 1, CGST: 1, IGST: 1 }
    ).lean();

    const rates = await Rate.find({}, { PCODE: 1, RATE: 1, DATE: 1 }).lean();

    // ---- Latest scheme rate per product code (RATE.PCODE -> PRO.CODE) ------
    const latestRateMap = new Map<string, { rate: number; date: string }>();
    rates.forEach((r: any) => {
        if (r.PCODE === undefined || r.PCODE === null) return;
        const key = String(r.PCODE).trim();
        const existing = latestRateMap.get(key);
        const date = r.DATE || "";
        if (!existing || String(date) > String(existing.date)) {
            latestRateMap.set(key, { rate: Number(r.RATE || 0), date: String(date) });
        }
    });

    // ---- HSN master = SaleType rows tagged SGCODE === "COMMCD" -------------
    const hsnRows = saleTypes.filter((s: any) => String(s.SGCODE || "").trim() === "COMMCD");

    const hsnMap = new Map<string, any>();
    hsnRows.forEach((h: any) => {
        const code = h.SCODE ? String(h.SCODE).trim() : "";
        if (!code) return;

        const cgst = Number(h.CGST || 0);
        const sgst = cgst; // SGST always mirrors CGST under GST rules
        const igst = Number(h.IGST || 0);

        // SNAME is normally just the HSN code (e.g. "30049069"). A handful of
        // rows carry extra trailing text after padding (e.g. "21069099   FOOD")
        // — split it so the code stays clean and the trailing word, if any,
        // becomes the description. PARNAM on this table always duplicates the
        // HSN code, so it's not used here.
        const rawSname = String(h.SNAME || "").trim();
        const snameParts = rawSname.split(/\s+/).filter(Boolean);
        const hsnCode = snameParts[0] || "";
        const description = snameParts.slice(1).join(" ");

        hsnMap.set(code, {
            HSNCODE: hsnCode,
            SCODE: code,
            DESCRIPTION: description,
            CGST: cgst,
            SGST: sgst,
            IGST: igst,
            TOTALGST: cgst + sgst, // the "normal"/overall GST %
            productCount: 0,
            activeCount: 0,
            schemeRateValues: [] as number[],
            productNames: [] as string[],
            productItems: [] as any[],
        });
    });

    // ---- Attach each product to its HSN bucket ------------------------------
    products.forEach((p: any) => {
        const gcode6 = p.GCODE6 ? String(p.GCODE6).trim() : "";
        if (!gcode6 || !hsnMap.has(gcode6)) return;

        const bucket = hsnMap.get(gcode6);
        bucket.productCount += 1;
        const isActive = String(p.STATUS || "").trim() !== "C";
        if (isActive) bucket.activeCount += 1; // "C" = closed/discontinued in PRO

        const pcode = String(p.CODE || "").trim();
        const rateEntry = latestRateMap.get(pcode);
        if (rateEntry) bucket.schemeRateValues.push(rateEntry.rate);

        const name = p.PRODUCT || p.BILLNAME || pcode;
        bucket.productNames.push(name);
        bucket.productItems.push({
            code: pcode,
            name,
            pack: p.PACK || "",
            status: isActive ? "Active" : "Closed",
            rate: rateEntry?.rate || 0,
        });
    });

    // ---- Build the final HSN master rows ------------------------------------
    const range = (vals: number[]) => {
        if (vals.length === 0) return { min: null, max: null };
        return { min: Math.min(...vals), max: Math.max(...vals) };
    };

    const result = Array.from(hsnMap.values()).map((h: any) => {
        const scheme = range(h.schemeRateValues);

        return {
            HSNCODE: h.HSNCODE,
            SCODE: h.SCODE,
            DESCRIPTION: h.DESCRIPTION,
            CGST: h.CGST,
            SGST: h.SGST,
            IGST: h.IGST,
            TOTALGST: h.TOTALGST,
            PRODUCTCOUNT: h.productCount,
            ACTIVECOUNT: h.activeCount,
            SCHEMERATEMIN: scheme.min,
            SCHEMERATEMAX: scheme.max,
            PRODUCTS: h.productNames.join(", "),
            PRODUCTLIST: h.productItems,
        };
    });

    return NextResponse.json(result);
}