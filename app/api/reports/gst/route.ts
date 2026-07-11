import { NextRequest, NextResponse } from "next/server";

import GstReport from "@/models/GstReport";

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

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error("GST Report API Error:", error);

        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}