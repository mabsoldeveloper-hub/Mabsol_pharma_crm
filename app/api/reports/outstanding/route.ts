import { NextRequest, NextResponse } from "next/server";

import OutstandingReport from "@/models/OutstandingReport";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const filter = {
            search: searchParams.get("search") || "",
            customerCode: searchParams.get("customerCode") || "",
            city: searchParams.get("city") || "",
            status: searchParams.get("status") || "",

            area: searchParams.get("area") || "",
            route: searchParams.get("route") || "",
            dsm: searchParams.get("dsm") || "",
            asm: searchParams.get("asm") || "",
            rsm: searchParams.get("rsm") || "",

            type: searchParams.get("type") || "",
            mr: searchParams.get("mr") || "",
            voucher: searchParams.get("voucher") || "",
            vcn: searchParams.get("vcn") || "",
            dueFrom: searchParams.get("dueFrom") || "",
            dueTo: searchParams.get("dueTo") || "",
            minAmount: searchParams.get("minAmount") || "",
            maxAmount: searchParams.get("maxAmount") || "",
            onlyOutstanding: searchParams.get("onlyOutstanding") || "Y",

            book: searchParams.get("book") || "",
            cd: searchParams.get("cd") || "",
            ledgerCode: searchParams.get("ledgerCode") || "",

            godown: searchParams.get("godown") || "",
            transport: searchParams.get("transport") || "",
            form: searchParams.get("form") || "",
            challan: searchParams.get("challan") || "",
            account: searchParams.get("account") || "",

            batch: searchParams.get("batch") || "",
            company: searchParams.get("company") || "",

            page: Number(searchParams.get("page") || 1),
            limit: Number(searchParams.get("limit") || 20),

            sortField: searchParams.get("sortField") || "DDATE",
            sortOrder: (Number(searchParams.get("sortOrder")) === 1 ? 1 : -1) as 1 | -1,
        };

        const data = await OutstandingReport.get(filter);

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error("Outstanding Report API Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: error.message || "Internal Server Error",
            },
            { status: 500 }
        );
    }
}