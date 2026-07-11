import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import SalesMdis from "@/models/SalesMdis";
import SalesDis from "@/models/SalesDis";
import Product from "@/models/Product";
import Batch from "@/models/Batch";
import Order from "@/models/Order";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ vcn: string }> }
) {

    try {

        await connectDB();

        const { vcn } = await params;

        // ===========================
        // Invoice Header
        // ===========================

        const header: any = await SalesMdis.findOne(
            {
                VCN: vcn,
            }
        ).lean();

        if (!header) {

            return NextResponse.json({
                success: false,
                message: "Invoice not found",
            });

        }

        // ===========================
        // Customer
        // ===========================

        const customer = await Order.findOne(
            {
                ORDNO: header.CODEP,
            }
        ).lean();

        // ===========================
        // Invoice Items
        // ===========================

        const details: any[] = await SalesDis.find(
            {
                VCN: vcn,
            }
        ).lean();

        const items = [];

        for (const row of details) {

            const product: any = await Product.findOne({

                CODE: row.CODE,

            }).lean();

            const batch: any = await Batch.findOne({

                CODE: row.CODE,

                BATCHNO: row.BATCH,

            }).lean();

            items.push({

                code: row.CODE,

                product:

                    product?.PRODUCT ||

                    product?.BILLNAME ||

                    "",

                company:

                    row.COMPANY ||

                    "",

                batch:

                    row.BATCH ||

                    "",

                expiry:

                    row.EXP ||

                    "",

                mrp:

                    batch?.MRP ||

                    row.MRP ||

                    0,

                qty:

                    row.QTY ||

                    0,

                free:

                    row.FREE ||

                    0,

                rate:

                    row.RATE ||

                    0,

                taxable:

                    row.AMMMOUNT ||

                    0,

                tax:

                    row.SSTAAMO ||

                    0,

                amount:

                    Number(row.AMMMOUNT || 0) +

                    Number(row.SSTAAMO || 0),

            });

        }

        // ===========================
        // Summary
        // ===========================

        const summary = {

            taxable:

                Number(header.AMOUNTT || 0),

            tax:

                Number(header.TAXAMO || 0),

            cgst:

                Number(header.CGSTAMO || 0),

            sgst:

                Number(header.STAXAMO || 0),

            round:

                Number(header.ROUND || 0),

            total:

                Number(header.FINAL || 0),

        };

        return NextResponse.json({

            success: true,

            header,

            customer,

            items,

            summary,

        });

    }

    catch (err: any) {

        return NextResponse.json({

            success: false,

            message: err.message,

        });

    }

}