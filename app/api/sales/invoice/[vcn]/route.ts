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

        const header: any = await SalesMdis.findOne({
            $or: [
                { VCN: vcn },
                { VCN: new RegExp(`^${vcn.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i") },
            ],
        }).lean();

        if (!header) {
            return NextResponse.json({
                success: false,
                message: "Invoice not found",
            });
        }

        const resolvedVcn = String(header.VCN || vcn).trim();

        // Customer
        const customer = await Order.findOne({
            $or: [{ ORDNO: header.CODEP }, { CODEP: header.CODEP }],
        }).lean();

        // Invoice Items
        const details: any[] = await SalesDis.find({
            $or: [
                { VCN: resolvedVcn },
                { VCN: new RegExp(`^${resolvedVcn.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i") },
            ],
        }).lean();

        const items = [];

        for (const row of details) {
            const prodCode = String(row.PRODUCT || row.CODE || "").trim();
            const product: any = await Product.findOne({
                $or: [{ CODE: prodCode }, { PRODUCT: prodCode }]
            }).lean();

            items.push({
                code: prodCode,
                product: product?.PRODUCT || row.NAME || prodCode || "",
                name: row.NAME || product?.PRODUCT || "",
                pack: row.PACK || product?.PACK || "",
                unit: row.UNIT || product?.UNIT || "",
                hsn: row.HSN || product?.HSN || "",
                company: row.COMPANY || product?.GCODE || "",
                batch: row.BATCH || "DEFAULT",
                expiry: row.EXPIRY || row.EXP || "",
                mfg: row.MFG || "",
                mrp: Number(row.MRP || 0),
                prate: Number(row.PRATE || 0),
                rate: Number(row.LPRATE || row.RATE || 0),
                qty: Number(row.QTY || 0),
                freeQty: Number(row.FREEQTY || row.FREE || 0),
                disc: Number(row.DISC || 0),
                cashDisc: Number(row.CASHDISC || 0),
                cgst: Number(row.CGST || 0),
                sgst: Number(row.SGST || 0),
                igst: Number(row.IGST || 0),
                cess: Number(row.CESS || 0),
                taxable: Number(row.AMOUNTT || row.AMMMOUNT || 0),
                tax: Number(row.TAXAMO || row.SSTAAMO || 0),
                amount: Number(row.AMOUNTT || 0) + Number(row.TAXAMO || 0),
                remark: row.REMARK || "",
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