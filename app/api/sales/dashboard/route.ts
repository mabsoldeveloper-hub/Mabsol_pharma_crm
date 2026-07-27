import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesDis from "@/models/SalesDis";
import SalesMdis from "@/models/SalesMdis";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

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

        const restriction = await getMrTerritoryRestriction();

        const mdisFilter: any = restriction.isMrRestricted
            ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
                ? { ...dateMatch, COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                : restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { ...dateMatch, CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { ...dateMatch, CODEP: "NONE_MATCH" }
            : { ...dateMatch };

        const disFilter: any = restriction.isMrRestricted
            ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
                ? { ...dateMatch, COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                : restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { ...dateMatch, CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { ...dateMatch, CODEP: "NONE_MATCH" }
            : { ...dateMatch };

        const customerFilter: any = restriction.isMrRestricted
            ? restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0
                ? { ORDNO: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } }
                : { ORDNO: "NONE_MATCH" }
            : {};

        const productFilter: any = restriction.isMrRestricted
            ? restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0
                ? { GCODE: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                : { GCODE: "NONE_MATCH" }
            : {};

        // Total Bills
        const totalBills = await SalesMdis.countDocuments(mdisFilter);

        // Total Sales
        const totalSales = await SalesMdis.aggregate([
            { $match: mdisFilter },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$FINAL" },
                },
            },
        ]);

        // Total Products Sold
        const totalQty = await SalesDis.aggregate([
            { $match: disFilter },
            {
                $group: {
                    _id: null,
                    qty: { $sum: "$QTY" },
                },
            },
        ]);

        // Total Customers
        const customers = await Customer.countDocuments({
            ...customerFilter,
            STATUS: "Y",
        });

        // Total Products
        const products = await Product.countDocuments({
            ...productFilter,
            STATUS: "Y",
        });

        return NextResponse.json({
            success: true,
            totalBills,
            customers,
            products,
            totalSales: totalSales[0]?.total || 0,
            totalQty: totalQty[0]?.qty || 0,
        });
    } catch (err: any) {
        return NextResponse.json({
            success: false,
            message: err.message,
        });
    }
}