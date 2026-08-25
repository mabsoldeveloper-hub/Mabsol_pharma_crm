import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { ProductBatch } from "@/models/StockModels";
import SaleType from "@/models/SaleType";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

function daysAgo(dateStr: string) {
    if (!dateStr) return 0;
    const diff =
        (new Date(todayStr()).getTime() - new Date(dateStr).getTime()) /
        (1000 * 60 * 60 * 24);
    return Math.max(0, Math.floor(diff));
}

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const search = (searchParams.get("q") || searchParams.get("search") || "").trim();
        const company = (searchParams.get("company") || "").trim();
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "50", 10)));
        const sortBy = searchParams.get("sortBy") || "EXP";
        const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1; // Default desc (most recent first)

        const today = todayStr();

        // 1. Resolve MR Territory restrictions
        const restriction = await getMrTerritoryRestriction();

        // Build company map from SaleType
        const saleTypes = await SaleType.find({}, { SCODE: 1, SNAME: 1 }).lean();
        const companyMap = new Map<string, string>();
        saleTypes.forEach((item: any) => {
            if (item.SCODE) {
                companyMap.set(String(item.SCODE).trim(), String(item.SNAME || "").trim());
            }
        });

        // 2. Build Query Filters for Expired Batches
        let batchFilter: any = combineFilters({
            BALANCE: { $gt: 0 },
            EXP: { $lt: today, $ne: null },
        }, companyVfpMatch);

        if (restriction.isMrRestricted) {
            if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
                const compRegexes = restriction.allowedCompanyCodes.map((code: string) => new RegExp(`_${code}$|^${code}$`, "i"));
                batchFilter = combineFilters(batchFilter, {
                    $or: [
                        { _vfpTable: { $in: compRegexes } },
                        { COMPANY: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } },
                        { GCODE: { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] } }
                    ]
                });
            } else if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
                batchFilter = combineFilters(batchFilter, { CODEP: { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] } });
            } else {
                batchFilter = combineFilters(batchFilter, { CODEP: "NONE_MATCH" });
            }
        }

        if (company) {
            const compRegex = new RegExp(`_${company}$|^${company}$`, "i");
            batchFilter = combineFilters(batchFilter, {
                $or: [
                    { _vfpTable: compRegex },
                    { COMPANY: new RegExp(`^${company}$`, "i") },
                    { GCODE: new RegExp(`^${company}$`, "i") },
                    { companyCode: new RegExp(`^${company}$`, "i") }
                ]
            });
        }

        if (search) {
            const searchRegex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
            const isNum = !isNaN(Number(search));
            const searchConds: any[] = [
                { PRODUCT: searchRegex },
                { BATCHNO: searchRegex },
                { PACKING: searchRegex },
            ];
            if (isNum) {
                searchConds.push({ CODE: Number(search) });
            }
            batchFilter = combineFilters(batchFilter, { $or: searchConds });
        }

        const sortOption: any = {};
        if (sortBy === "BALANCE" || sortBy === "qty") sortOption.BALANCE = sortOrder;
        else if (sortBy === "PRODUCT") sortOption.PRODUCT = sortOrder;
        else sortOption.EXP = sortOrder;

        const [totalCount, batchDocs, summaryAgg, distinctCompanies, distinctVfpTables, distinctProducts] = await Promise.all([
            ProductBatch.countDocuments(batchFilter),
            ProductBatch.find(batchFilter)
                .sort(sortOption)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ProductBatch.aggregate([
                { $match: batchFilter },
                {
                    $group: {
                        _id: null,
                        totalQty: { $sum: { $ifNull: ["$BALANCE", 0] } },
                        totalValue: {
                            $sum: {
                                $multiply: [
                                    { $ifNull: ["$BALANCE", 0] },
                                    {
                                        $ifNull: [
                                            "$PRATE",
                                            { $ifNull: ["$MRP", 0] }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
            ]),
            ProductBatch.distinct("COMPANY", batchFilter),
            ProductBatch.distinct("_vfpTable", batchFilter),
            ProductBatch.distinct("CODE", batchFilter)
        ]);

        const extractedCodes = new Set<string>();
        distinctCompanies.filter(Boolean).forEach((cCode: string) => extractedCodes.add(String(cCode).trim()));
        distinctVfpTables.filter(Boolean).forEach((tbl: string) => {
            const code = String(tbl).replace(/^PROBAT_/i, "").trim();
            if (code) extractedCodes.add(code);
        });

        const companiesList = Array.from(extractedCodes)
            .map((cCode: string) => {
                const code = String(cCode).trim();
                return {
                    code,
                    name: companyMap.get(code) || code,
                };
            })
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

        const items = batchDocs.map((b: any) => {
            const bal = Number(b.BALANCE || 0);
            const mrp = Number(b.MRP || 0);
            const prate = Number(b.PRATE || 0);
            const rate = prate > 0 ? prate : mrp;
            const value = Math.round(bal * rate);
            const exp = b.EXP || null;
            const daysExpired = daysAgo(exp);

            const compCode = String(b.COMPANY || b.GCODE || (b._vfpTable ? b._vfpTable.replace(/^PROBAT_/i, "") : "") || "").trim();

            return {
                id: b._id.toString(),
                code: b.CODE,
                product: b.PRODUCT || "Unknown Product",
                batchNo: b.BATCHNO || "N/A",
                expiryDate: exp,
                daysExpired,
                packing: b.PACKING || "",
                mrp,
                prate,
                balance: bal,
                stockValue: value,
                companyCode: compCode,
                companyName: companyMap.get(compCode) || compCode || "N/A",
            };
        });

        return NextResponse.json({
            success: true,
            items,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1,
            },
            summary: {
                totalExpiredBatches: totalCount,
                totalStockQty: summaryAgg[0]?.totalQty ?? 0,
                totalStockValue: summaryAgg[0]?.totalValue ?? 0,
                totalAffectedProducts: distinctProducts.length,
            },
            companies: companiesList,
        });

    } catch (error: any) {
        console.error("Expired Batches API Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
