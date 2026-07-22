import { NextRequest, NextResponse } from "next/server";
import Gstr1Report from "@/lib/gstr1Report";
import { buildGstr1Excel } from "@/lib/gstr1Excel";
import { buildGstr1Pdf } from "@/lib/gstr1Pdf";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const month = Number(searchParams.get("month"));
        const year = Number(searchParams.get("year"));
        const format = (searchParams.get("format") || "summary").toLowerCase(); // summary | json | excel | pdf
        const companyId = searchParams.get("companyId") || undefined;

        if (!month || month < 1 || month > 12 || !year) {
            return NextResponse.json(
                { success: false, message: "Valid month (1-12) and year are required" },
                { status: 400 }
            );
        }

        const { gstJson, meta, invoiceDetail } = await Gstr1Report.build({ month, year, companyId });

        if (format === "json") {
            // Official govt-format GSTR-1 JSON, ready for GST portal offline tool upload
            const filename = `GSTR1_${meta.companyGstin}_${meta.period}.json`;
            return new NextResponse(JSON.stringify(gstJson, null, 2), {
                headers: {
                    "Content-Type": "application/json",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                },
            });
        }

        if (format === "excel") {
            const buffer = await buildGstr1Excel(gstJson, meta, invoiceDetail);
            const filename = `GSTR1_${meta.companyGstin}_${meta.period}.xlsx`;
            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                },
            });
        }

        if (format === "pdf") {
            const buffer = await buildGstr1Pdf(gstJson, meta);
            const filename = `GSTR1_${meta.companyGstin}_${meta.period}.pdf`;
            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                },
            });
        }

        // default: return summary + full json + invoice detail for on-screen preview (no download)
        return NextResponse.json({ success: true, data: { meta, gstJson, invoiceDetail } });
    } catch (error: any) {
        console.error("GSTR-1 Report API Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
} 