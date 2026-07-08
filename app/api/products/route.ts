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

export async function GET() {

    await connectDB();

    const products = await Product.find(
        {},
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