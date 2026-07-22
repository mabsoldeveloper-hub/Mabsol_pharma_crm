import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";

export async function GET() {
    await connectDB();

    const products = await Product.find({}).sort({ PRODUCT: 1 });

    // Pull HSN along with SCODE / SNAME
    const saleTypes = await SaleType.find({}, { SCODE: 1, SNAME: 1, HSN: 1 });

    // SCODE -> SNAME map
    const companyMap = new Map();
    // SCODE -> HSN map
    const hsnMap = new Map();

    saleTypes.forEach((item: any) => {
        if (item.SCODE) {
            const code = String(item.SCODE).trim();
            companyMap.set(code, item.SNAME);
            hsnMap.set(code, item.HSN);
        }
    });

    const result = products.map((p: any) => {
        const gcode = String(p.GCODE).trim();
        return {
            ...p.toObject(),
            companyName: companyMap.get(gcode) || "",
            // agar product ka apna HSN empty ho to SaleType se le lo, warna product ka rakho
            HSN: p.HSN || hsnMap.get(gcode) || "",
        };
    });

    return NextResponse.json(result);
}