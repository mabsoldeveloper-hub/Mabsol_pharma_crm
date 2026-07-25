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
                // Batch rows have `CODE` (product code, NOT party code) and
                // `productInfo.GCODE` (company group code). isPartyAllowed would
                // incorrectly match product CODE against party ordnos.
                // Instead, check company code from productInfo.GCODE, and also
                // check if any disRecords (sales) belong to allowed parties (via CODEP/DSM).
                data.rows = data.rows.filter((item: any) => {
                    // Check company code (productInfo.GCODE)
                    const gcode = String(item.productInfo?.GCODE || "").trim().toLowerCase();
                    if (gcode && restriction.allowedCompanyCodesSet.has(gcode)) return true;
                    if (gcode && restriction.companyRegexes.some((rx) => rx.test(gcode))) return true;

                    // Check if any sales record (disRecords) belongs to an allowed party
                    if (Array.isArray(item.disRecords) && item.disRecords.length > 0) {
                        return item.disRecords.some((dis: any) => restriction.isPartyAllowed(dis));
                    }

                    return false;
                });
                data.total = data.rows.length;
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