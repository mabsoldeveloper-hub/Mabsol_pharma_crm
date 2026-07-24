// import { NextResponse } from "next/server";
// import connectDB from "@/lib/mongodb";
// import Product from "@/models/Product";

// export async function GET() {

//     await connectDB();

//     const products = await Product.find(
//         {},
//         {
//             PRODUCT: 1,
//             NAME: 1,
//             CODE: 1,
//             BALANCE: 1,
//             MRP: 1,
//             PRATE: 1,
//             RATEF: 1,
//             UNIT: 1,
//             STATUS: 1,
//             CGST: 1,
//             IGST: 1,
//             GCODE: 1
//         }
//     ).sort({
//         PRODUCT: 1
//     });

//     return NextResponse.json(products);
// }
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";
import MrTerritory from "@/models/MrTerritory";
import { getCurrentUser } from "@/lib/auth";

// MR Territory Filtering:
//   If user has ACTIVE MrTerritory records → only return their assigned company's products.
//   Otherwise → return all products (admin / non-MR).

export const dynamic = "force-dynamic";

export async function GET() {

    await connectDB();

    // ── Step 1: Determine MR restrictions ────────────────────────────────
    let allowedGCODEs: string[] | null = null;

    try {
        const user = await getCurrentUser();
        if (user) {
            const roleName = String(user.roleId?.roleName || "").trim().toLowerCase();
            if (roleName.includes("admin")) {
                allowedGCODEs = null;
            } else {
                const territories = await MrTerritory.find(
                    { userId: user._id, status: "Active" },
                    { companyCode: 1 }
                );

                if (territories && territories.length > 0) {
                    allowedGCODEs = Array.from(
                        new Set(territories.map((t: any) => String(t.companyCode || "").trim()))
                    ).filter(Boolean);
                }
            }
        }

    } catch {
        allowedGCODEs = null;
    }

    // ── Step 2: Build filtered product query ─────────────────────────────
    const productFilter: any = {};
    if (allowedGCODEs !== null && allowedGCODEs.length > 0) {
        productFilter.GCODE = { $in: allowedGCODEs };
    } else if (allowedGCODEs !== null && allowedGCODEs.length === 0) {
        return NextResponse.json([]);
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
            GCODE: 1
        }
    ).sort({ PRODUCT: 1 });

    const saleTypes = await SaleType.find(
        {},
        {
            SCODE: 1,
            SNAME: 1
        }
    );

    // SCODE -> SNAME map
    const companyMap = new Map();

    saleTypes.forEach((item: any) => {

        if (item.SCODE) {

            companyMap.set(
                String(item.SCODE).trim(),
                item.SNAME
            );

        }

    });

    const result = products.map((p: any) => ({

        ...p.toObject(),

        companyName:
            companyMap.get(String(p.GCODE).trim()) || ""

    }));

    return NextResponse.json(result);
}