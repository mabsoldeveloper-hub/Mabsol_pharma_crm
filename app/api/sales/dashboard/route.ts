import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesDis from "@/models/SalesDis";
import SalesMdis from "@/models/SalesMdis";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

import FinancialYear from "@/models/FinancialYear";

import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const fyRange = await getFYDateRange(searchParams);
        const { startDate, endDate } = fyRange;

        const dateMatch = buildFYDateQuery("DATE", startDate, endDate);

        const restriction = await getMrTerritoryRestriction();

        const saleFilterBase = { TRANSFER: { $ne: "P" }, TYPE: { $nin: ["PROFORMA", "ESTIMATE", "P"] } };
        let mdisFilter: any = { ...dateMatch, ...saleFilterBase };
        let disFilter: any = { ...dateMatch, ...saleFilterBase };
        let customerFilter: any = {};
        let productFilter: any = {};

        if (restriction.isMrRestricted) {
          const orConditions: any[] = [];
          if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
            orConditions.push({ CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } });
          }
          if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
            orConditions.push({ COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } });
          }

          if (orConditions.length > 0) {
            mdisFilter = { ...dateMatch, ...saleFilterBase, $or: orConditions };
            disFilter = { ...dateMatch, ...saleFilterBase, $or: orConditions };
          } else {
            mdisFilter = { ...dateMatch, ...saleFilterBase, CODEP: "NONE_MATCH" };
            disFilter = { ...dateMatch, ...saleFilterBase, CODEP: "NONE_MATCH" };
          }

          if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
            customerFilter = { ORDNO: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } };
          }

          if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
            productFilter = { GCODE: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } };
          }
        }

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
            STATUS: { $ne: "N" },
        });

        // Total Products
        const products = await Product.countDocuments({
            ...productFilter,
            STATUS: { $ne: "N" },
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