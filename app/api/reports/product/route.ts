import { NextRequest, NextResponse } from "next/server";

import ProductReport from "@/models/ProductReport";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

const MAX_LIMIT = 2000;

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const report = searchParams.get("report") || "master";

        const pageParam = Number(searchParams.get("page") || 1);
        const limitParam = Number(searchParams.get("limit") || 500);

        const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
        const limit =
            Number.isFinite(limitParam) && limitParam > 0
                ? Math.min(MAX_LIMIT, Math.floor(limitParam))
                : 500;

        const restriction = await getMrTerritoryRestriction();

        const fetchLimit = restriction.isMrRestricted ? 5000 : limit;

        const filter = {
            search: searchParams.get("search") || "",
            category: searchParams.get("category") || "",
            company: searchParams.get("company") || "",
            status: searchParams.get("status") || "",
            batchNo: searchParams.get("batchNo") || "",
            nearExpiryDays: searchParams.get("nearExpiryDays")
                ? Number(searchParams.get("nearExpiryDays"))
                : undefined,
            page: restriction.isMrRestricted ? 1 : page,
            limit: fetchLimit,
        };

        let data: any;

        switch (report) {
            case "master":
                data = await ProductReport.productMaster(filter);
                break;

            case "fastmoving":
                data = await ProductReport.fastMovingProducts(filter);
                break;

            case "slowmoving":
                data = await ProductReport.slowMovingProducts(filter);
                break;

            case "deadstock":
                data = await ProductReport.deadStockProducts(filter);
                break;

            case "nearexpiry":
                data = await ProductReport.nearExpiryProducts(filter);
                break;

            case "active":
                data = await ProductReport.activeProducts(filter);
                break;

            case "inactive":
                data = await ProductReport.inactiveProducts(filter);
                break;

            default:
                data = await ProductReport.productMaster(filter);
        }

        if (restriction.isMrRestricted && data) {
            if (Array.isArray(data.rows)) {
                const filteredRows = data.rows.filter((item: any) => {
                    const comp = String(item.company || item.category || "").trim().toLowerCase();
                    if (!comp) return false;
                    if (restriction.allowedCompanyCodesSet.has(comp)) return true;
                    return restriction.companyRegexes.some((rx) => rx.test(comp));
                });

                data.total = filteredRows.length;
                data.limit = limit;
                data.page = page;
                data.totalPages = Math.ceil(filteredRows.length / limit) || 1;
                data.rows = filteredRows.slice((page - 1) * limit, page * limit);
            }
        }

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error("Product Report API Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: error.message || "Internal Server Error",
            },
            {
                status: 500,
            }
        );
    }
}