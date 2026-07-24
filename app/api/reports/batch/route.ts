import { NextRequest, NextResponse } from "next/server";
import BatchReport from "@/models/BatchReport";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const report = searchParams.get("report") || "master";

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
            fromDate: searchParams.get("fromDate") || "",
            toDate: searchParams.get("toDate") || "",
            page: Number(searchParams.get("page") || 1),
            limit: Number(searchParams.get("limit") || 20),
            sortField: searchParams.get("sortField") || "DATE",
            sortOrder: (Number(searchParams.get("sortOrder") || -1) === 1 ? 1 : -1) as 1 | -1,
        };

        const restriction = await getMrTerritoryRestriction();

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

        if (restriction.isMrRestricted && data) {
            if (Array.isArray(data.rows)) {
                data.rows = data.rows.filter((item: any) => restriction.isPartyAllowed(item));
                data.total = data.rows.length;
            } else if (Array.isArray(data)) {
                data = data.filter((item: any) => restriction.isPartyAllowed(item));
            }
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