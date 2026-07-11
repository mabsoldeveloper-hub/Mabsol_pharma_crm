import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import SalesDis from "@/models/SalesDis";
import SalesMdis from "@/models/SalesMdis";
import Product from "@/models/Product";
import Customer from "@/models/Customer";

export async function GET() {

    try {

        await connectDB();

        // ===========================
        // Total Bills
        // ===========================

        const totalBills =
            await SalesMdis.countDocuments();

        // ===========================
        // Total Sales
        // ===========================

        const totalSales =
            await SalesMdis.aggregate([
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$FINAL"
                        }
                    }
                }
            ]);

        // ===========================
        // Total Products Sold
        // ===========================

        const totalQty =
            await SalesDis.aggregate([
                {
                    $group: {
                        _id: null,
                        qty: {
                            $sum: "$QTY"
                        }
                    }
                }
            ]);

        // ===========================
        // Total Customers
        // ===========================

        const customers =
            await Customer.countDocuments({
                STATUS: "Y"
            });

        // ===========================
        // Total Products
        // ===========================

        const products =
            await Product.countDocuments({
                STATUS: "Y"
            });

        return NextResponse.json({

            success: true,

            totalBills,

            customers,

            products,

            totalSales:
                totalSales[0]?.total || 0,

            totalQty:
                totalQty[0]?.qty || 0

        });

    } catch (err: any) {

        return NextResponse.json({

            success: false,

            message: err.message

        });

    }

}