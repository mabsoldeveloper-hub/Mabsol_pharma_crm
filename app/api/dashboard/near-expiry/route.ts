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

function addDaysStr(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function daysBetween(dateStr: string) {
    if (!dateStr) return 0;
    const diff =
        (new Date(dateStr).getTime() - new Date(todayStr()).getTime()) /
        (1000 * 60 * 60 * 24);
    return Math.ceil(diff);
}

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const search = (searchParams.get("q") || searchParams.get("search") || "").trim();
        const windowDays = Math.max(1, parseInt(searchParams.get("days") || "90", 10));
        const company = (searchParams.get("company") || "").trim();
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "50", 10)));
        const sortBy = searchParams.get("sortBy") || "EXP";
        const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1;

        const today = todayStr();
        const expiryLimit = addDaysStr(windowDays);

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

        // 2. Build Query Filters for Near Expiry Batches
        let batchFilter: any = combineFilters({
            BALANCE: { $gt: 0 },
            EXP: { $gte: today, $lte: expiryLimit },
        }, companyVfpMatch);

        if (restriction.isMrRestricted) {
            if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
                batchFilter.COMPANY = { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] };
            } else if (restriction.allowedOrdnos && restriction.allowedOrdnos.length > 0) {
                batchFilter.CODEP = { $in: [...restriction.allowedOrdnos, ...restriction.ordnoRegexes] };
            } else {
                batchFilter.CODEP = "NONE_MATCH";
            }
        }

        if (company) {
            batchFilter.$or = [
                { COMPANY: company },
                { GCODE: company },
            ];
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
            if (batchFilter.$or) {
                batchFilter.$and = [
                    { $or: batchFilter.$or },
                    { $or: searchConds }
                ];
                delete batchFilter.$or;
            } else {
                batchFilter.$or = searchConds;
            }
        }

        const sortOption: any = {};
        if (sortBy === "BALANCE" || sortBy === "qty") sortOption.BALANCE = sortOrder;
        else if (sortBy === "PRODUCT") sortOption.PRODUCT = sortOrder;
        else sortOption.EXP = sortOrder;

        const day30Limit = addDaysStr(30);
        const day60Limit = addDaysStr(60);

        const [totalCount, batchDocs, summaryAgg, distinctCompanies] = await Promise.all([
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
                        },
                        critical30: {
                            $sum: {
                                $cond: [{ $lte: ["$EXP", day30Limit] }, 1, 0]
                            }
                        },
                        warning60: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $gt: ["$EXP", day30Limit] },
                                            { $lte: ["$EXP", day60Limit] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        moderate90: {
                            $sum: {
                                $cond: [{ $gt: ["$EXP", day60Limit] }, 1, 0]
                            }
                        }
                    }
                }
            ]),
            ProductBatch.distinct("COMPANY", batchFilter)
        ]);

        const companiesList = distinctCompanies
            .filter(Boolean)
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
            const daysLeft = daysBetween(exp);

            let urgency = "moderate"; // moderate (60-90+ days)
            if (daysLeft <= 30) {
                urgency = "critical"; // < 30 days
            } else if (daysLeft <= 60) {
                urgency = "warning"; // 31-60 days
            }

            const compCode = String(b.COMPANY || b.GCODE || "").trim();

            return {
                id: b._id.toString(),
                code: b.CODE,
                product: b.PRODUCT || "Unknown Product",
                batchNo: b.BATCHNO || "N/A",
                expiryDate: exp,
                daysLeft,
                packing: b.PACKING || "",
                mrp,
                prate,
                balance: bal,
                stockValue: value,
                urgency,
                companyCode: compCode,
                companyName: companyMap.get(compCode) || compCode || "N/A",
            };
        });

        return NextResponse.json({
            success: true,
            windowDays,
            items,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1,
            },
            summary: {
                totalBatches: totalCount,
                totalStockQty: summaryAgg[0]?.totalQty ?? 0,
                totalStockValue: summaryAgg[0]?.totalValue ?? 0,
                critical30Count: summaryAgg[0]?.critical30 ?? 0,
                warning60Count: summaryAgg[0]?.warning60 ?? 0,
                moderate90Count: summaryAgg[0]?.moderate90 ?? 0,
            },
            companies: companiesList,
        });

    } catch (error: any) {
        console.error("Near Expiry API Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
