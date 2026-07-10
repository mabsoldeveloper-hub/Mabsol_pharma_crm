import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import SalesMdis from "@/models/SalesMdis";
import Order from "@/models/Order";

export async function GET() {

    try {

        await connectDB();

        // Bill Header
        const bills = await SalesMdis.find(
            {},
            {
                VCN: 1,
                DATE: 1,
                CODEP: 1,
                FINAL: 1,
                AMOUNTT: 1,
                TAXAMO: 1,
                CGSTAMO: 1,
                STAXAMO: 1,
                ROUND: 1,
            }
        )
        .sort({ DATE: -1 })
        .lean();

        // Customer Master
        const customers = await Order.find(
            {},
            {
                CODEP: 1,
                PARNAM: 1,
                CITY: 1,
            }
        ).lean();

        const customerMap = new Map();

        customers.forEach((c: any) => {

            customerMap.set(

                String(c.CODEP || "").trim(),

                c

            );

        });

        const result = bills.map((bill: any) => {

            const customer = customerMap.get(

                String(bill.CODEP || "").trim()

            );

            return {

                _id: bill._id,

                vcn: bill.VCN,

                date: bill.DATE,

                customer:

                    customer?.PARNAM || "",

                city:

                    customer?.CITY || "",

                taxable:

                    Number(bill.AMOUNTT || 0),

                tax:

                    Number(bill.TAXAMO || 0),

                cgst:

                    Number(bill.CGSTAMO || 0),

                sgst:

                    Number(bill.STAXAMO || 0),

                round:

                    Number(bill.ROUND || 0),

                total:

                    Number(bill.FINAL || 0),

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