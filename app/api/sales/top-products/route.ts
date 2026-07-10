import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import SalesDis from "@/models/SalesDis";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";

export async function GET() {

    try {

        await connectDB();

        // Product Master
        const products = await Product.find(
            {},
            {
                CODE: 1,
                PRODUCT: 1,
                GCODE: 1,
                MRP: 1,
            }
        ).lean();

        const productMap = new Map();

        products.forEach((p: any) => {

            productMap.set(String(p.CODE), p);

        });

        // Company Master
        const saleTypes = await SaleType.find(
            {},
            {
                SCODE: 1,
                SNAME: 1,
            }
        ).lean();

        const companyMap = new Map();

        saleTypes.forEach((c: any) => {

            companyMap.set(String(c.SCODE).trim(), c.SNAME);

        });

        // Sales Summary
        const sales = await SalesDis.aggregate([

            {
                $group: {

                    _id: "$CODE",

                    qty: {
                        $sum: "$QTY",
                    },

                    amount: {
                        $sum: "$AMMMOUNT",
                    },

                    bills: {
                        $sum: 1,
                    },

                },

            },

            {
                $sort: {
                    amount: -1,
                },
            },

            {
                $limit: 20,
            },

        ]);

        const result = sales.map((item: any) => {

            const p =
                productMap.get(String(item._id));

            return {

                code: item._id,

                product:
                    p?.PRODUCT || "",

                company:
                    companyMap.get(String(p?.GCODE).trim()) || "",

                qty: item.qty,

                amount: item.amount,

                mrp: p?.MRP || 0,

            };

        });

        return NextResponse.json(result);

    } catch (err: any) {

        return NextResponse.json({

            success: false,

            message: err.message,

        });

    }

}