import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import SalesDis from "@/models/SalesDis";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";

import FinancialYear from "@/models/FinancialYear";

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        let startDate = searchParams.get("startDate");
        let endDate = searchParams.get("endDate");
        const fyId = searchParams.get("fyId");

        if (!startDate || !endDate) {
            let currentFY = null;
            if (fyId && fyId !== "ALL") {
                currentFY = await FinancialYear.findById(fyId);
            } else if (fyId !== "ALL") {
                currentFY = await FinancialYear.findOne({ isCurrent: true });
            }
            if (currentFY) {
                startDate = currentFY.startDate ? new Date(currentFY.startDate).toISOString().slice(0, 10) : null;
                endDate = currentFY.endDate ? new Date(currentFY.endDate).toISOString().slice(0, 10) : null;
            }
        }

        const dateMatch: any = (startDate && endDate) ? { DATE: { $gte: startDate, $lte: endDate } } : {};

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
            { $match: dateMatch },
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