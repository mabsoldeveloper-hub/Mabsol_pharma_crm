import { NextRequest, NextResponse } from "next/server";

import GstReport from "@/models/GstReport";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const report = searchParams.get("report") || "register";

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
            page: Number(searchParams.get("page") || 1),
            limit: Number(searchParams.get("limit") || 20),
        };

        let data;

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

        const restriction = await getMrTerritoryRestriction();

        if (restriction.isMrRestricted && data && Array.isArray(data.rows)) {
            if (report === "register") {
                // Register rows have CODEP — isPartyAllowed checks it correctly
                data.rows = data.rows.filter((item: any) => restriction.isPartyAllowed(item));
                data.total = data.rows.length;
            } else if (report === "ledger") {
                // Ledger rows have CODE1 (customer code) — isPartyAllowed doesn't check CODE1,
                // so we manually match against allowedOrdnosSet
                data.rows = data.rows.filter((item: any) => {
                    const code1 = String(item.CODE1 || "").trim().toLowerCase();
                    if (code1 && restriction.allowedOrdnosSet.has(code1)) return true;
                    if (code1 && restriction.ordnoRegexes.some((rx) => rx.test(code1))) return true;
                    return false;
                });
                data.total = data.rows.length;
            }
            // HSN Summary is product-level data (no party fields) — the underlying
            // voucher list is already scoped by party filters in buildMdisMatch,
            // so no additional MR restriction is needed here.
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