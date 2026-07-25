import { NextRequest, NextResponse } from "next/server";

import GstReport from "@/models/GstReport";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const report = searchParams.get("report") || "register";

        const pageParam = Number(searchParams.get("page") || 1);
        const limitParam = Number(searchParams.get("limit") || 500);

        const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
        const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(2000, Math.floor(limitParam)) : 500;

        const restriction = await getMrTerritoryRestriction();

        const fetchLimit = restriction.isMrRestricted ? 5000 : limit;

        const filter = {
            search: searchParams.get("search") || "",
            customerCode: searchParams.get("customerCode") || "",
            gstNo: searchParams.get("gstNo") || "",
            voucher: searchParams.get("voucher") || "",
            hsn: searchParams.get("hsn") || "",
            city: searchParams.get("city") || "",
            type: searchParams.get("type") || "",
            dateFrom: searchParams.get("dateFrom") || "",
            dateTo: searchParams.get("dateTo") || "",
            page: restriction.isMrRestricted ? 1 : page,
            limit: fetchLimit,
        };

        let data: any;

        switch (report) {
            case "register":
                data = await GstReport.gstRegister(filter);
                break;

            case "hsn":
                data = await GstReport.hsnSummary(filter);
                break;

            case "ledger":
                data = await GstReport.gstLedger(filter);
                break;

            default:
                data = await GstReport.gstRegister(filter);
        }

        if (restriction.isMrRestricted && data && Array.isArray(data.rows)) {
            let filteredRows = data.rows;
            if (report === "register") {
                filteredRows = data.rows.filter((item: any) => restriction.isPartyAllowed(item));
            } else if (report === "ledger") {
                filteredRows = data.rows.filter((item: any) => {
                    const code1 = String(item.CODE1 || "").trim().toLowerCase();
                    if (code1 && restriction.allowedOrdnosSet.has(code1)) return true;
                    if (code1 && restriction.ordnoRegexes.some((rx) => rx.test(code1))) return true;
                    return false;
                });
            }

            data.total = filteredRows.length;
            data.limit = limit;
            data.page = page;
            data.totalPages = Math.ceil(filteredRows.length / limit) || 1;
            data.rows = filteredRows.slice((page - 1) * limit, page * limit);
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error("GST Report API Error:", error);

        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}