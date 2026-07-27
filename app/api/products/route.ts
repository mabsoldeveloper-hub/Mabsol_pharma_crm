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

export async function POST(request: Request) {
    try {
        await connectDB();
        const body = await request.json();

        if (!body.PRODUCT || !String(body.PRODUCT).trim()) {
            return NextResponse.json(
                { success: false, message: "Product Name is required" },
                { status: 400 }
            );
        }

        const numericFields = [
            "MRP", "PRATE", "RATEF", "LPRATE", "COST", "RATEA", "RATEB", "RATEC", "RATED", "RATEE", "RATEG",
            "CGST", "SGST", "IGST", "PURTAX", "SALTAX", "BALANCE", "OPENING", "ONQTY", "ONQTYFREE", "FREEBAL",
            "HOLD", "MINIMUM", "MAXIMUM", "TQTY", "QTY", "PACK", "SALDIS", "PURDIS", "SALVDIS", "PURSPDIS",
            "PURSPVDIS", "PURSPVDIS1", "SALVDIS1", "FIXDIS", "FIXDIS1"
        ];

        const productData: Record<string, any> = {};

        // Copy string fields
        Object.keys(body).forEach((key) => {
            if (body[key] !== undefined && body[key] !== null) {
                productData[key] = body[key];
            }
        });

        productData.PRODUCT = String(body.PRODUCT).trim();
        productData.CODE = body.CODE && String(body.CODE).trim() ? String(body.CODE).trim() : `P${Date.now().toString().slice(-6)}`;
        productData.STATUS = body.STATUS || "Y";

        // Convert numeric fields properly
        numericFields.forEach((field) => {
            if (field in body && body[field] !== "" && body[field] !== null && body[field] !== undefined) {
                const num = Number(body[field]);
                productData[field] = isNaN(num) ? 0 : num;
            }
        });

        const newProduct = await Product.create(productData);

        return NextResponse.json(
            { success: true, message: "Product created successfully", data: newProduct },
            { status: 201 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message || "Failed to create product" },
            { status: 500 }
        );
    }
}