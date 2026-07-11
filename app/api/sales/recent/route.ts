import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import SalesMdis from "@/models/SalesMdis";
import Customer from "@/models/Customer";

export async function GET() {

    try {

        await connectDB();

        const bills = await SalesMdis.find(
            {},
            {
                VOUCHER: 1,
                DATE: 1,
                FINAL: 1,
                CODEP: 1,
                MACHINEBY: 1,
                TYPE: 1,
            }
        )
            .sort({ DATE: -1 })
            .limit(20)
            .lean();

        const customers = await Customer.find(
            {},
            {
                ORDNO: 1,
                PARNAM: 1,
                CITY: 1,
            }
        ).lean();

        const customerMap = new Map();

        customers.forEach((c: any) => {

            customerMap.set(
                String(c.ORDNO).trim(),
                c
            );

        });

        const result = bills.map((b: any) => ({

            ...b,

            customer:
                customerMap.get(String(b.CODEP).trim())?.PARNAM || "",

            city:
                customerMap.get(String(b.CODEP).trim())?.CITY || ""

        }));

        return NextResponse.json(result);

    } catch (err: any) {

        return NextResponse.json({

            success: false,

            message: err.message

        });

    }

}