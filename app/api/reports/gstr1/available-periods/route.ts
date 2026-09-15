import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Mdis from "@/models/SalesMdis";
import { getCompanyVfpFilter, combineFilters } from "@/lib/companyVfpHelper";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get("companyId") || undefined;

        // Build company/VFP filter same as the main report
        const companyVfpMatch = await getCompanyVfpFilter(searchParams);

        // Fetch distinct DATE values from Mdis (TYPE: S=Sale, B=Note)
        // DATE field format in DB: "YYYY-MM-DD"
        const pipeline: any[] = [
            {
                $match: combineFilters(
                    { TYPE: { $in: ["S", "B"] }, DATE: { $exists: true, $nin: [null, ""] } },
                    companyVfpMatch
                ),
            },
            // Deduplicate by VOUCHER (same as main report)
            { $sort: { _vfpSyncedAt: -1 } },
            { $group: { _id: "$VOUCHER", doc: { $first: "$$ROOT" } } },
            { $replaceRoot: { newRoot: "$doc" } },
            // Extract year and month from DATE string "YYYY-MM-DD"
            {
                $project: {
                    yearStr: { $substr: ["$DATE", 0, 4] },
                    monthStr: { $substr: ["$DATE", 5, 2] },
                },
            },
            {
                $group: {
                    _id: { year: "$yearStr", month: "$monthStr" },
                },
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
        ];

        const rawPeriods = await (Mdis as any).aggregate(pipeline);

        const periods: { year: number; month: number; label: string }[] = rawPeriods
            .map((p: any) => {
                const year = parseInt(p._id.year, 10);
                const month = parseInt(p._id.month, 10);
                if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;
                return {
                    year,
                    month,
                    label: `${MONTH_NAMES[month - 1]} ${year}`,
                };
            })
            .filter(Boolean)
            .sort((a: any, b: any) =>
                b.year !== a.year ? b.year - a.year : b.month - a.month
            );

        const years = [...new Set(periods.map((p: any) => p.year))].sort((a, b) => b - a);

        return NextResponse.json({
            success: true,
            data: { periods, years },
        });
    } catch (error: any) {
        console.error("GSTR-1 Available Periods Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
