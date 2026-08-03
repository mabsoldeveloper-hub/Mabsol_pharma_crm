import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesDis from "@/models/SalesDis";
import Product from "@/models/Product";
import SaleType from "@/models/SaleType";
import Company from "@/models/Company";

import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

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
    let disFilter: any = combineFilters(dateMatch, saleFilterBase, companyVfpMatch);
    if (restriction.isMrRestricted) {
      const orConditions: any[] = [];
      if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
        orConditions.push({ CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } });
      }
      if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
        orConditions.push({ COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } });
      }
      if (orConditions.length > 0) {
        disFilter = combineFilters(dateMatch, saleFilterBase, companyVfpMatch, { $or: orConditions });
      } else {
        disFilter = combineFilters(dateMatch, saleFilterBase, companyVfpMatch, { CODEP: "NONE_MATCH" });
      }
    }

    // Fetch Product Master
    const products = await Product.find(
      combineFilters(companyVfpMatch),
      {
        CODE: 1,
        PRODUCT: 1,
        NAME: 1,
        GCODE: 1,
        COMPANY: 1,
        MRP: 1,
      }
    ).lean();

    const productMap = new Map<string, any>();
    products.forEach((p: any) => {
      [p.CODE, p.PRODUCT, p.NAME].forEach((k) => {
        if (k) {
          const key = String(k).trim().toUpperCase();
          if (key && !productMap.has(key)) {
            productMap.set(key, p);
          }
        }
      });
    });

    // Fetch Company / SaleType Masters
    const [saleTypes, companies] = await Promise.all([
      SaleType.find({}, { SCODE: 1, SNAME: 1, CODE: 1, NAME: 1 }).lean(),
      Company.find({}, { CODE: 1, NAME: 1, COMPANY: 1 }).lean(),
    ]);

    const companyMap = new Map<string, string>();
    saleTypes.forEach((c: any) => {
      const name = c.SNAME || c.NAME || "";
      [c.SCODE, c.CODE].forEach((k) => {
        if (k) companyMap.set(String(k).trim().toUpperCase(), name);
      });
    });
    companies.forEach((c: any) => {
      const name = c.NAME || c.COMPANY || "";
      [c.CODE, c.COMPANY].forEach((k) => {
        if (k) companyMap.set(String(k).trim().toUpperCase(), name);
      });
    });

    // Aggregate Sales by Product
    const sales = await SalesDis.aggregate([
      { $match: disFilter },
      {
        $group: {
          _id: { $ifNull: ["$PRODUCT", "$CODE"] },
          disName: { $first: "$NAME" },
          disProduct: { $first: "$PRODUCT" },
          disCompany: { $first: "$COMPANY" },
          disMrp: { $max: "$MRP" },
          qty: { $sum: "$QTY" },
          amount: {
            $sum: {
              $ifNull: [
                "$AMOUNTT",
                { $multiply: [{ $ifNull: ["$QTY", 0] }, { $ifNull: ["$LPRATE", 0] }] },
              ],
            },
          },
          bills: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 30 },
    ]);

    const result = sales.map((item: any) => {
      const itemKey = String(item._id || "").trim().toUpperCase();
      const p = productMap.get(itemKey);

      const prodName =
        p?.PRODUCT || p?.NAME || item.disName || item.disProduct || item._id || "Unknown Product";

      const compCode = String(p?.GCODE || p?.COMPANY || item.disCompany || "").trim().toUpperCase();
      const compName = companyMap.get(compCode) || compCode || "-";

      return {
        code: item._id,
        product: prodName,
        company: compName,
        qty: Number(item.qty || 0),
        amount: Number(item.amount || 0),
        mrp: Number(p?.MRP || item.disMrp || 0),
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}