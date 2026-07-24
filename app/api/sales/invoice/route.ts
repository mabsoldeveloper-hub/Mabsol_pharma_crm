import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesMdis from "@/models/SalesMdis";
import Order from "@/models/Order";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export async function GET() {
    try {
        await connectDB();

        const restriction = await getMrTerritoryRestriction();

        const invoiceFilter: any = restriction.isMrRestricted
            ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
                ? { COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                : restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { CODEP: "NONE_MATCH" }
            : {};

        // Invoice Header
        const invoices = await SalesMdis.find(
            invoiceFilter,
            {
                VCN: 1,
                DATE: 1,
                TYPE: 1,
                CODEP: 1,
                COMPANY: 1,
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
                ORDNO: 1,
                PARNAM: 1,
                CITY: 1,
                GSTNO: 1,
                GSTHED: 1,
                STATE: 1,
                COMPANY: 1,
                GCODE: 1,
                SCODE: 1,
                DSM: 1,
            }
        ).lean();

        // Customer Map (ORDNO -> Customer)
        const customerMap = new Map();

        customers.forEach((c: any) => {
            const key = String(c.ORDNO || "").trim().toUpperCase();
            customerMap.set(key, c);
        });

        const result = invoices.map((bill: any) => {
            const code = String(bill.CODEP || "").trim().toUpperCase();
            const customer = customerMap.get(code);

            const cgst = Number(bill.CGSTAMO || 0);
            const sgst = Number(bill.STAXAMO || 0);

            const isLocal = (customer?.GSTHED || "").toUpperCase().includes("LOCAL");
            const igst = isLocal ? 0 : Number(bill.TAXAMO || 0);

            return {
                _id: bill._id,
                vcn: bill.VCN,
                date: bill.DATE,
                type: bill.TYPE,
                code: code,
                customer: customer?.PARNAM || "",
                city: customer?.CITY || "",
                gst: customer?.GSTNO || "",
                state: customer?.STATE || "",
                gstHeading: customer?.GSTHED || "",
                taxable: bill.AMOUNTT || 0,
                cgst,
                sgst,
                igst,
                round: bill.ROUND || 0,
                finalAmount: bill.FINAL || 0,
            };
        });

        return NextResponse.json({
            success: true,
            total: result.length,
            invoices: result,
        });
    } catch (err: any) {
        return NextResponse.json({
            success: false,
            message: err.message,
        });
    }
}