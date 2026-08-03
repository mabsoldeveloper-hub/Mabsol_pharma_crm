import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Product, ProductBatch } from "@/models/StockModels";
import SaleType from "@/models/SaleType";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const search = (searchParams.get("q") || searchParams.get("search") || "").trim();
        const filter = (searchParams.get("filter") || "all").toLowerCase(); // all, in_stock, low_stock, out_of_stock
        const company = (searchParams.get("company") || "").trim();
        const view = (searchParams.get("view") || "product").toLowerCase(); // product, batch
        const rateType = (searchParams.get("rateType") || "prate").toLowerCase(); // prate, lprate, mrp, ratef
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "50", 10)));
        const sortBy = searchParams.get("sortBy") || "PRODUCT";
        const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1;

        // Dynamic rate expression builder for MongoDB aggregation
        const getRateExpr = (rType: string) => {
            if (rType === "mrp") return { $ifNull: ["$MRP", 0] };
            if (rType === "lprate") return { $ifNull: ["$LPRATE", { $ifNull: ["$PRATE", { $ifNull: ["$MRP", 0] }] }] };
            if (rType === "ratef" || rType === "sale") return { $ifNull: ["$RATEF", { $ifNull: ["$RATE", { $ifNull: ["$PRATE", { $ifNull: ["$MRP", 0] }] }] }] };
            return { $ifNull: ["$PRATE", { $ifNull: ["$RATEF", { $ifNull: ["$MRP", 0] }] }] };
        };

        // 1. Resolve MR Territory restrictions
        const restriction = await getMrTerritoryRestriction();

        // Build base company map from SaleType
        const saleTypes = await SaleType.find({}, { SCODE: 1, SNAME: 1 }).lean();
        const companyMap = new Map<string, string>();
        saleTypes.forEach((item: any) => {
            if (item.SCODE) {
                companyMap.set(String(item.SCODE).trim(), String(item.SNAME || "").trim());
            }
        });

        if (view === "batch") {
            // Batch-level query logic
            let batchFilter: any = { ...companyVfpMatch };

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

            if (filter === "in_stock") {
                batchFilter.BALANCE = { $gt: 0 };
            } else if (filter === "out_of_stock") {
                batchFilter.BALANCE = { $lte: 0 };
            } else if (filter === "low_stock") {
                batchFilter.BALANCE = { $gt: 0, $lte: 10 }; // arbitrary low batch threshold
            }

            const sortOption: any = {};
            if (sortBy === "BALANCE" || sortBy === "qty") sortOption.BALANCE = sortOrder;
            else if (sortBy === "EXP") sortOption.EXP = sortOrder;
            else sortOption.PRODUCT = sortOrder;

            const [totalCount, batchDocs, summaryAgg] = await Promise.all([
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
                                        getRateExpr(rateType)
                                    ]
                                }
                            },
                            inStock: {
                                $sum: {
                                    $cond: [{ $gt: ["$BALANCE", 0] }, 1, 0]
                                }
                            },
                            outOfStock: {
                                $sum: {
                                    $cond: [{ $lte: ["$BALANCE", 0] }, 1, 0]
                                }
                            }
                        }
                    }
                ])
            ]);

            const today = new Date().toISOString().slice(0, 10);
            const items = batchDocs.map((b: any) => {
                const bal = Number(b.BALANCE || 0);
                const mrp = Number(b.MRP || 0);
                const prate = Number(b.PRATE || 0);
                const lprate = Number(b.LPRATE || 0);
                const ratef = Number(b.RATEF || b.RATE || 0);

                let selectedRate = prate > 0 ? prate : mrp;
                if (rateType === "mrp") selectedRate = mrp;
                else if (rateType === "lprate") selectedRate = lprate > 0 ? lprate : (prate > 0 ? prate : mrp);
                else if (rateType === "ratef" || rateType === "sale") selectedRate = ratef > 0 ? ratef : (prate > 0 ? prate : mrp);

                const value = Math.round(bal * selectedRate);
                const exp = b.EXP || null;

                let status = "in_stock";
                if (bal <= 0) status = "out_of_stock";
                else if (exp && exp < today) status = "expired";
                else if (bal <= 10) status = "low_stock";

                return {
                    id: b._id.toString(),
                    code: b.CODE,
                    product: b.PRODUCT || "Unknown Product",
                    batchNo: b.BATCHNO || "N/A",
                    expiryDate: exp,
                    mfd: b.MFD || null,
                    packing: b.PACKING || "",
                    mrp,
                    prate,
                    lprate,
                    ratef,
                    selectedRate,
                    balance: bal,
                    stockValue: value,
                    status,
                    companyCode: b.COMPANY || b.GCODE || "",
                    companyName: companyMap.get(String(b.COMPANY || b.GCODE || "").trim()) || b.COMPANY || b.GCODE || "N/A",
                };
            });

            return NextResponse.json({
                success: true,
                view: "batch",
                items,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit) || 1,
                },
                summary: {
                    totalStockQty: summaryAgg[0]?.totalQty ?? 0,
                    totalStockValue: summaryAgg[0]?.totalValue ?? 0,
                    totalItems: totalCount,
                    inStockCount: summaryAgg[0]?.inStock ?? 0,
                    outOfStockCount: summaryAgg[0]?.outOfStock ?? 0,
                }
            });

        } else {
            // Product-level query logic (Default)
            let productFilter: any = { ...companyVfpMatch };

            if (restriction.isMrRestricted) {
                if (restriction.allowedCompanyCodes && restriction.allowedCompanyCodes.length > 0) {
                    productFilter.GCODE = { $in: [...restriction.allowedCompanyCodes, ...restriction.companyRegexes] };
                } else {
                    productFilter.GCODE = "NONE_MATCH";
                }
            }

            if (company) {
                productFilter.GCODE = company;
            }

            if (search) {
                const searchRegex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
                const isNum = !isNaN(Number(search));
                const searchConds: any[] = [
                    { PRODUCT: searchRegex },
                    { GCODE: searchRegex },
                    { PACKING: searchRegex },
                ];
                if (isNum) {
                    searchConds.push({ CODE: Number(search) });
                }
                productFilter.$or = searchConds;
            }

            if (filter === "in_stock") {
                productFilter.BALANCE = { $gt: 0 };
            } else if (filter === "out_of_stock") {
                productFilter.BALANCE = { $lte: 0 };
            } else if (filter === "low_stock") {
                productFilter.$expr = {
                    $and: [
                        { $gt: ["$MINIMUM", 0] },
                        { $lte: [{ $ifNull: ["$BALANCE", 0] }, "$MINIMUM"] },
                    ],
                };
            }

            const sortOption: any = {};
            if (sortBy === "BALANCE" || sortBy === "qty") sortOption.BALANCE = sortOrder;
            else if (sortBy === "CODE") sortOption.CODE = sortOrder;
            else if (sortBy === "GCODE") sortOption.GCODE = sortOrder;
            else sortOption.PRODUCT = sortOrder;

            // Fetch list, count, summary KPIs, and list of distinct companies for filter dropdown
            const [totalCount, productDocs, summaryAgg, distinctGcodes] = await Promise.all([
                Product.countDocuments(productFilter),
                Product.find(productFilter)
                    .sort(sortOption)
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
                Product.aggregate([
                    { $match: productFilter },
                    {
                        $group: {
                            _id: null,
                            totalQty: { $sum: { $ifNull: ["$BALANCE", 0] } },
                            totalValue: {
                                $sum: {
                                    $multiply: [
                                        { $ifNull: ["$BALANCE", 0] },
                                        getRateExpr(rateType)
                                    ]
                                }
                            },
                            inStock: {
                                $sum: {
                                    $cond: [{ $gt: ["$BALANCE", 0] }, 1, 0]
                                }
                            },
                            outOfStock: {
                                $sum: {
                                    $cond: [{ $lte: ["$BALANCE", 0] }, 1, 0]
                                }
                            },
                            lowStock: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $gt: ["$MINIMUM", 0] },
                                                { $lte: [{ $ifNull: ["$BALANCE", 0] }, "$MINIMUM"] }
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            }
                        }
                    }
                ]),
                Product.distinct("GCODE", restriction.isMrRestricted && restriction.allowedCompanyCodes ? { GCODE: { $in: restriction.allowedCompanyCodes } } : {})
            ]);

            const companiesList = distinctGcodes
                .filter(Boolean)
                .map((gcode: string) => {
                    const code = String(gcode).trim();
                    return {
                        code,
                        name: companyMap.get(code) || code,
                    };
                })
                .sort((a: any, b: any) => a.name.localeCompare(b.name));

            const items = productDocs.map((p: any) => {
                const bal = Number(p.BALANCE || 0);
                const mrp = Number(p.MRP || 0);
                const prate = Number(p.PRATE || 0);
                const lprate = Number(p.LPRATE || 0);
                const ratef = Number(p.RATEF || p.RATE || 0);

                let selectedRate = prate > 0 ? prate : mrp;
                if (rateType === "mrp") selectedRate = mrp;
                else if (rateType === "lprate") selectedRate = lprate > 0 ? lprate : (prate > 0 ? prate : mrp);
                else if (rateType === "ratef" || rateType === "sale") selectedRate = ratef > 0 ? ratef : (prate > 0 ? prate : mrp);

                const min = Number(p.MINIMUM || 0);
                const gcode = p.GCODE ? String(p.GCODE).trim() : "";
                const value = Math.round(bal * selectedRate);

                let status = "in_stock";
                if (bal <= 0) {
                    status = "out_of_stock";
                } else if (min > 0 && bal <= min) {
                    status = "low_stock";
                }

                return {
                    id: p._id.toString(),
                    code: p.CODE,
                    product: p.PRODUCT || "Unknown Product",
                    gcode,
                    companyName: companyMap.get(gcode) || gcode || "N/A",
                    packing: p.PACKING || "",
                    unit: p.UNIT || "",
                    mrp,
                    prate,
                    lprate,
                    ratef,
                    selectedRate,
                    minimum: min,
                    balance: bal,
                    stockValue: value,
                    status,
                };
            });

            return NextResponse.json({
                success: true,
                view: "product",
                items,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit) || 1,
                },
                summary: {
                    totalStockQty: summaryAgg[0]?.totalQty ?? 0,
                    totalStockValue: summaryAgg[0]?.totalValue ?? 0,
                    totalItems: totalCount,
                    inStockCount: summaryAgg[0]?.inStock ?? 0,
                    lowStockCount: summaryAgg[0]?.lowStock ?? 0,
                    outOfStockCount: summaryAgg[0]?.outOfStock ?? 0,
                },
                companies: companiesList,
            });
        }
    } catch (error: any) {
        console.error("Current Stock API Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
