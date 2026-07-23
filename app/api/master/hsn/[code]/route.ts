import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";
import Rate from "@/models/Rate";

export async function GET(
    _req: Request,
    context: { params: Promise<{ code: string }> }
) {
    await connectDB();

    const { code } = await context.params;
    const hsnCodeParam = decodeURIComponent(code || "").trim();

    const saleTypes = await SaleType.find(
        {},
        { SCODE: 1, SNAME: 1, SGCODE: 1, CGST: 1, IGST: 1 }
    ).lean();

    const hsnRow: any = saleTypes.find((s: any) => {
        const isCommcd = String(s.SGCODE || "").trim() === "COMMCD";
        const scodeMatch = String(s.SCODE || "").trim().toLowerCase() === hsnCodeParam.toLowerCase();
        const rawSname = String(s.SNAME || "").trim();
        const hsnCode = rawSname.split(/\s+/)[0] || "";
        const snameMatch = hsnCode.toLowerCase() === hsnCodeParam.toLowerCase();

        return isCommcd && (scodeMatch || snameMatch);
    });

    if (!hsnRow) {
        return NextResponse.json({ hsnCode: hsnCodeParam, hsnInfo: null, products: [] }, { status: 404 });
    }

    const scode = String(hsnRow.SCODE || "").trim();
    const cgst = Number(hsnRow.CGST || 0);
    const sgst = cgst;
    const igst = Number(hsnRow.IGST || 0);

    const rawSname = String(hsnRow.SNAME || "").trim();
    const snameParts = rawSname.split(/\s+/).filter(Boolean);
    const hsnCode = snameParts[0] || "";
    const description = snameParts.slice(1).join(" ");

    // Fetch mapped products
    const products: any[] = await Product.find(
        { GCODE6: scode },
        { CODE: 1, PRODUCT: 1, BILLNAME: 1, PACK: 1, GCODE6: 1, STATUS: 1, MRP: 1, RATE: 1 }
    ).lean();

    // Fetch rates for mapped products
    const pcodeList = products.map((p: any) => String(p.CODE || "").trim()).filter(Boolean);
    const rates = await Rate.find({ PCODE: { $in: pcodeList } }, { PCODE: 1, RATE: 1, DATE: 1 }).lean();

    const latestRateMap = new Map<string, number>();
    rates.forEach((r: any) => {
        if (r.PCODE === undefined || r.PCODE === null) return;
        const key = String(r.PCODE).trim();
        latestRateMap.set(key, Number(r.RATE || 0));
    });

    const mappedProducts = products.map((p: any) => {
        const pcode = String(p.CODE || "").trim();
        return {
            code: pcode,
            name: p.PRODUCT || p.BILLNAME || pcode,
            pack: p.PACK || "",
            status: String(p.STATUS || "").trim() === "C" ? "Closed" : "Active",
            mrp: Number(p.MRP || 0),
            rate: Number(p.RATE || latestRateMap.get(pcode) || 0),
        };
    });

    return NextResponse.json({
        hsnCode,
        hsnInfo: {
            HSNCODE: hsnCode,
            SCODE: scode,
            DESCRIPTION: description,
            CGST: cgst,
            SGST: sgst,
            IGST: igst,
            TOTALGST: cgst + sgst,
            productCount: mappedProducts.length,
            activeCount: mappedProducts.filter((p) => p.status === "Active").length,
        },
        products: mappedProducts,
    });
}
