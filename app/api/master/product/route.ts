import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";

// NOTE: Put this file at: src/app/api/products/full/route.ts
// (or src/app/api/master/product/route.ts, wherever the page.tsx fetches from)
//
// HSN mapping logic:
//   Product.GCODE6  -->  SaleType.SCODE   (only rows where SaleType.SGCODE === "COMMCD")
//   That row's SaleType.SNAME is the actual HSN / SAC code.
//
// Company name mapping logic (unchanged):
//   Product.GCODE   -->  SaleType.SCODE   -> SaleType.SNAME

export async function GET() {
    await connectDB();

    const products = await Product.find({}).sort({ PRODUCT: 1 });

    // Pull every SaleType row we need in one query, then split them
    // client-side by SGCODE so we don't need two separate DB round trips.
    const saleTypes = await SaleType.find(
        {},
        { SCODE: 1, SNAME: 1, SGCODE: 1 }
    );

    // SCODE -> SNAME map, for company / category names (Product.GCODE join)
    const companyMap = new Map<string, string>();

    // SCODE -> SNAME map, ONLY for HSN rows (Product.GCODE6 join)
    const hsnMap = new Map<string, string>();

    saleTypes.forEach((item: any) => {
        if (!item.SCODE) return;
        const code = String(item.SCODE).trim();

        // Every row can still be used for the generic company/category name
        companyMap.set(code, item.SNAME);

        // Only rows tagged as commodity codes hold an actual HSN value
        if (String(item.SGCODE || "").trim() === "COMMCD") {
            hsnMap.set(code, item.SNAME);
        }
    });

    const result = products.map((p: any) => {
        const gcode = p.GCODE ? String(p.GCODE).trim() : "";
        const gcode6 = p.GCODE6 ? String(p.GCODE6).trim() : "";
        const obj = p.toObject();

        const ratef = Number(obj.RATEF || 0);
        const prate = Number(obj.PRATE || 0);
        const mrp = Number(obj.MRP || 0);
        const bal = Number(obj.BALANCE || 0);

        const marginPct = ratef > 0 && prate > 0 ? Math.round(((ratef - prate) / ratef) * 100) : 0;
        const stockValue = bal > 0 ? Math.round(bal * (ratef || mrp)) : 0;

        return {
            ...obj,
            companyName: companyMap.get(gcode) || "",
            HSN: hsnMap.get(gcode6) || "",
            marginPct,
            stockValue,
        };
    });

    return NextResponse.json(result);
}