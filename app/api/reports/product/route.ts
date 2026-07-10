import { NextRequest, NextResponse } from "next/server";

import ProductReport from "@/models/ProductReport";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const report = searchParams.get("report") || "master";

        const filter = {
            search: searchParams.get("search") || "",
            category: searchParams.get("category") || "",
            company: searchParams.get("company") || "",
            status: searchParams.get("status") || "",
            batchNo: searchParams.get("batchNo") || "",
            nearExpiryDays: searchParams.get("nearExpiryDays")
                ? Number(searchParams.get("nearExpiryDays"))
                : undefined,
            page: Number(searchParams.get("page") || 1),
            limit: Number(searchParams.get("limit") || 20),
        };

        let data;

        switch (report) {
            case "master":
                data = await ProductReport.productMaster(filter);
                break;

            case "fastmoving":
                data = await ProductReport.fastMovingProducts(filter);
                break;

            case "slowmoving":
                data = await ProductReport.slowMovingProducts(filter);
                break;

            case "deadstock":
                data = await ProductReport.deadStockProducts(filter);
                break;

            case "nearexpiry":
                data = await ProductReport.nearExpiryProducts(filter);
                break;

            case "active":
                data = await ProductReport.activeProducts(filter);
                break;

            case "inactive":
                data = await ProductReport.inactiveProducts(filter);
                break;

            default:
                data = await ProductReport.productMaster(filter);
        }

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error("Product Report API Error:", error);

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