import { NextRequest, NextResponse } from "next/server";
import CustomerReport from "@/models/CustomerReport";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const report = searchParams.get("report") || "master";

        const pageParam = Number(searchParams.get("page") || 1);
        const limitParam = Number(searchParams.get("limit") || 500);

        const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
        const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(2000, Math.floor(limitParam)) : 500;

        const restriction = await getMrTerritoryRestriction();

        const fetchLimit = restriction.isMrRestricted ? 5000 : limit;

        const filter = {
            search: searchParams.get("search") || "",
            customer: searchParams.get("customer") || "",
            customerCode: searchParams.get("customerCode") || "",
            area: searchParams.get("area") || "",
            route: searchParams.get("route") || "",
            dsm: searchParams.get("dsm") || "",
            city: searchParams.get("city") || "",
            status: searchParams.get("status") || "",
            page: restriction.isMrRestricted ? 1 : page,
            limit: fetchLimit,
        };

        let data: any;

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

        if (restriction.isMrRestricted && data) {
            if (Array.isArray(data.rows)) {
                const filteredRows = data.rows.filter((item: any) => restriction.isPartyAllowed(item));
                data.total = filteredRows.length;
                data.limit = limit;
                data.page = page;
                data.totalPages = Math.ceil(filteredRows.length / limit) || 1;
                data.rows = filteredRows.slice((page - 1) * limit, page * limit);
            } else if (Array.isArray(data)) {
                data = data.filter((item: any) => restriction.isPartyAllowed(item));
            }
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