import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MenuAdjustment from "@/models/MenuAdjustment";
import { getDefaultMenuItems } from "@/lib/defaultMenuData";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { companyId, financialYearId } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "companyId is required to reset menu settings" },
        { status: 400 }
      );
    }

    const query: any = { companyId };
    if (financialYearId && financialYearId !== "ALL") {
      query.financialYearId = financialYearId;
    }

    await MenuAdjustment.deleteMany(query);

    return NextResponse.json({
      success: true,
      message: "Menu configuration reset to default successfully",
      items: getDefaultMenuItems(),
    });
  } catch (error: any) {
    console.error("Error resetting menu adjustments:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reset menu configuration" },
      { status: 500 }
    );
  }
}
