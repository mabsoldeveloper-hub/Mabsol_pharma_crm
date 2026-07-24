import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export const dynamic = "force-dynamic";

export async function GET() {
    await connectDB();

    const restriction = await getMrTerritoryRestriction();

    const productFilter: any = {};
    if (restriction.isMrRestricted) {
        if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
            productFilter.GCODE = {
                $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes],
            };
        } else {
            return NextResponse.json([]);
        }
    }

    const products = await Product.find(
        productFilter,
        {
            PRODUCT: 1,
            NAME: 1,
            CODE: 1,
            BALANCE: 1,
            MRP: 1,
            PRATE: 1,
            RATEF: 1,
            UNIT: 1,
            STATUS: 1,
            CGST: 1,
            IGST: 1,
            GCODE: 1,
        }
    ).sort({ PRODUCT: 1 });

    const saleTypes = await SaleType.find(
        {},
        {
            SCODE: 1,
            SNAME: 1,
        }
    );

    // SCODE -> SNAME map
    const companyMap = new Map();
    saleTypes.forEach((st: any) => {
        companyMap.set(String(st.SCODE).trim(), String(st.SNAME).trim());
    });

    const result = products.map((p: any) => {
        const obj = p.toObject();
        const gcodeStr = String(p.GCODE || "").trim();
        obj.companyName = companyMap.get(gcodeStr) || "N/A";
        return obj;
    });

    return NextResponse.json(result);
}