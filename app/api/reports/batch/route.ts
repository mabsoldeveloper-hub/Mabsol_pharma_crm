import { NextRequest, NextResponse } from "next/server";
import BatchReport from "@/models/BatchReport";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import { getFYDateRange } from "@/lib/financialYearHelper";
import { getCompanyVfpFilter } from "@/lib/companyVfpHelper";
import connectDB from "@/lib/mongodb";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);
        const companyId = searchParams.get("companyId") || "";

        const report = searchParams.get("report") || "master";

        const pageParam = Number(searchParams.get("page") || 1);
        const limitParam = Number(searchParams.get("limit") || 500);

        const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
        const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(2000, Math.floor(limitParam)) : 500;

        const restriction = await getMrTerritoryRestriction();

        // If user is restricted, fetch larger candidate pool so territory filtering
        // doesn't produce empty / 1-2 item fragmented pages
        const fetchLimit = restriction.isMrRestricted ? 5000 : limit;

        const fyRange = await getFYDateRange(searchParams);

        const filter = {
            search: searchParams.get("search") || "",
            batchNo: searchParams.get("batchNo") || "",
            productCode: searchParams.get("productCode") || "",
            productName: searchParams.get("productName") || "",
            supplier: searchParams.get("supplier") || "",
            party: searchParams.get("party") || "",
            dsm: searchParams.get("dsm") || "",
            area: searchParams.get("area") || "",
            route: searchParams.get("route") || "",
            status: searchParams.get("status") || "",
            fromDate: searchParams.get("fromDate") || fyRange.startDate || "",
            toDate: searchParams.get("toDate") || fyRange.endDate || "",
            page: restriction.isMrRestricted ? 1 : page,
            limit: fetchLimit,
            sortField: searchParams.get("sortField") || "DATE",
            sortOrder: (Number(searchParams.get("sortOrder") || -1) === 1 ? 1 : -1) as 1 | -1,
            companyId,
            companyVfpMatch,
        };

        let data: any;

        switch (report) {
            case "master":
                data = await BatchReport.batchMaster(filter);
                break;

            case "expiring":
                data = await BatchReport.expiringBatches({
                    ...filter,
                    days: Number(searchParams.get("days") || 90),
                });
                break;

            case "zero-balance":
                data = await BatchReport.zeroBalanceBatches(filter);
                break;

            default:
                data = await BatchReport.batchMaster(filter);
        }

        if (restriction.isMrRestricted && data && Array.isArray(data.rows)) {
            const filteredRows = data.rows.filter((item: any) => {
                // Check company code (productInfo.GCODE or item.GCODE or item.COMPANY)
                const gcode = String(item.productInfo?.GCODE || item.GCODE || item.COMPANY || "").trim().toLowerCase();
                if (gcode && restriction.allowedCompanyCodesSet.has(gcode)) return true;
                if (gcode && restriction.companyRegexes.some((rx) => rx.test(gcode))) return true;

                // Check if any sales record (disRecords) belongs to an allowed party
                if (Array.isArray(item.disRecords) && item.disRecords.length > 0) {
                    return item.disRecords.some((dis: any) => restriction.isPartyAllowed(dis));
                }

                return false;
            });

            data.total = filteredRows.length;
            data.limit = limit;
            data.page = page;
            data.totalPages = Math.ceil(filteredRows.length / limit) || 1;
            data.rows = filteredRows.slice((page - 1) * limit, page * limit);
        }

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error("Batch Report API Error:", error);

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