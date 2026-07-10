import { NextRequest, NextResponse } from "next/server";

import CustomerReport from "@/models/CustomerReport";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const report = searchParams.get("report") || "master";

        const filter = {
            search: searchParams.get("search") || "",
            customer: searchParams.get("customer") || "",
            customerCode: searchParams.get("customerCode") || "",
            area: searchParams.get("area") || "",
            route: searchParams.get("route") || "",
            dsm: searchParams.get("dsm") || "",
            city: searchParams.get("city") || "",
            status: searchParams.get("status") || "",
            fromDate: searchParams.get("fromDate") || "",
            toDate: searchParams.get("toDate") || "",
            page: Number(searchParams.get("page") || 1),
            limit: Number(searchParams.get("limit") || 20),
        };

        let data;

        switch (report) {
            case "master":
                data = await CustomerReport.customerMaster(filter);
                break;

            case "ledger":
                data = await CustomerReport.customerLedger(filter);
                break;

            case "outstanding":
                data = await CustomerReport.customerOutstanding(filter);
                break;

            case "balance":
                data = await CustomerReport.customerBalance(filter);
                break;

            case "opening":
                data = await CustomerReport.customerOpening(filter);
                break;

            case "credit":
                data = await CustomerReport.customerCreditLimit(filter);
                break;

            case "duedays":
                data = await CustomerReport.customerDueDays(filter);
                break;

            case "aging":
                data = await CustomerReport.customerAging(filter);
                break;

            case "area":
                data = await CustomerReport.areaWiseCustomer(filter);
                break;

            case "route":
                data = await CustomerReport.routeWiseCustomer(filter);
                break;

            case "dsm":
                data = await CustomerReport.dsmWiseCustomer(filter);
                break;

            case "active":
                data = await CustomerReport.activeCustomers(filter);
                break;

            case "inactive":
                data = await CustomerReport.inactiveCustomers(filter);
                break;

            case "new":
                data = await CustomerReport.newCustomers(filter);
                break;

            case "summary":
                data = await CustomerReport.partySummary(filter);
                break;

            case "collection":
                data = await CustomerReport.collectionPending(filter);
                break;

            default:
                data = await CustomerReport.customerMaster(filter);
        }

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error("Customer Report API Error:", error);

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