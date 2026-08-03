import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesDis from "@/models/SalesDis";
import SalesMdis from "@/models/SalesMdis";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

import FinancialYear from "@/models/FinancialYear";

import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export async function GET(req: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const fyRange = await getFYDateRange(searchParams);
        const { startDate, endDate } = fyRange;

        const dateMatch = buildFYDateQuery("DATE", startDate, endDate);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);

        const restriction = await getMrTerritoryRestriction();

        const saleFilterBase = { TRANSFER: { $ne: "P" }, TYPE: { $nin: ["PROFORMA", "ESTIMATE", "P"] } };
        let mdisFilter: any = combineFilters(dateMatch, saleFilterBase, companyVfpMatch);
        let disFilter: any = combineFilters(dateMatch, saleFilterBase, companyVfpMatch);
        let customerFilter: any = { ...companyVfpMatch };
        let productFilter: any = { ...companyVfpMatch };

        if (restriction.isMrRestricted) {
          const orConditions: any[] = [];
          if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
            orConditions.push({ CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } });
          }
          if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
            orConditions.push({ COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } });
          }

          if (orConditions.length > 0) {
            mdisFilter = combineFilters(dateMatch, saleFilterBase, companyVfpMatch, { $or: orConditions });
            disFilter = combineFilters(dateMatch, saleFilterBase, companyVfpMatch, { $or: orConditions });
          } else {
            mdisFilter = combineFilters(dateMatch, saleFilterBase, companyVfpMatch, { CODEP: "NONE_MATCH" });
            disFilter = combineFilters(dateMatch, saleFilterBase, companyVfpMatch, { CODEP: "NONE_MATCH" });
          }

          if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
            customerFilter = combineFilters(companyVfpMatch, { ORDNO: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } });
          }

          if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
            productFilter = { GCODE: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } };
          }
        }

        const mdisSaleFilter = { ...mdisFilter, TYPE: "S" };
        const mdisReturnFilter = { ...mdisFilter, TYPE: "R" };
        const disSaleFilter = { ...disFilter, TYPE: "S" };

        const [
          totalBills,
          returnBills,
          salesAgg,
          returnsAgg,
          totalQtyAgg,
          customers,
          products
        ] = await Promise.all([
          SalesMdis.countDocuments(mdisSaleFilter),
          SalesMdis.countDocuments(mdisReturnFilter),
          SalesMdis.aggregate([
            { $match: mdisSaleFilter },
            { $group: { _id: null, total: { $sum: "$FINAL" } } }
          ]),
          SalesMdis.aggregate([
            { $match: mdisReturnFilter },
            { $group: { _id: null, total: { $sum: "$FINAL" } } }
          ]),
          SalesDis.aggregate([
            { $match: disSaleFilter },
            { $group: { _id: null, qty: { $sum: "$QTY" } } }
          ]),
          Customer.countDocuments({ ...customerFilter, STATUS: { $ne: "N" } }),
          Product.countDocuments({ ...productFilter, STATUS: { $ne: "N" } }),
        ]);

        const totalSales = salesAgg[0]?.total || 0;
        const salesReturns = returnsAgg[0]?.total || 0;
        const netSales = totalSales - salesReturns;
        const totalQty = totalQtyAgg[0]?.qty || 0;

        return NextResponse.json({
            success: true,
            totalBills,
            returnBills,
            customers,
            products,
            totalSales,
            salesReturns,
            netSales,
            totalQty,
        });
    } catch (err: any) {
        return NextResponse.json({
            success: false,
            message: err.message,
        });
    }
}