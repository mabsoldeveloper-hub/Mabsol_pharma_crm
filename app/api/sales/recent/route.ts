import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import SalesMdis from "@/models/SalesMdis";
import Customer from "@/models/Customer";

import FinancialYear from "@/models/FinancialYear";

import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const fyRange = await getFYDateRange(searchParams);
        const { startDate, endDate } = fyRange;

        const dateMatch = buildFYDateQuery("DATE", startDate, endDate);
        const restriction = await getMrTerritoryRestriction();

        let billMatch: any = { ...dateMatch };
        if (restriction.isMrRestricted) {
          const orConditions: any[] = [];
          if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
            orConditions.push({ CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } });
          }
          if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
            orConditions.push({ COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } });
          }
          if (orConditions.length > 0) {
            billMatch = { ...dateMatch, $or: orConditions };
          } else {
            billMatch = { ...dateMatch, CODEP: "NONE_MATCH" };
          }
        }

        const bills = await SalesMdis.find(
            billMatch,
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