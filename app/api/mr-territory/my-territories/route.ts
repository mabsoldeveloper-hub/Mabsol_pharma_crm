import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MrTerritory from "@/models/MrTerritory";
import SaleType from "@/models/SaleType";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/mr-territory/my-territories
 *
 * Returns the current logged-in user's active territory assignments.
 * If the user has NO territory records => they are NOT an MR (or are admin)
 *   → `isMrRestricted: false` (show all products)
 * If the user HAS territory records
 *   → `isMrRestricted: true` + list of allowed GCODEs (companyCode → GCODE via SaleType)
 *
 * The product API uses this to filter products shown to an MR.
 */
export async function GET() {
  try {
    await connectDB();

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all ACTIVE territories for this user
    const territories = await MrTerritory.find({
      userId: user._id,
      status: "Active",
    }).select(
      "companyCode companyName divisionCode divisionName subDivisionCode subDivisionName categoryCode categoryName"
    );

    // If no territory records exist → user is NOT restricted (admin / non-MR)
    if (!territories || territories.length === 0) {
      return NextResponse.json({
        success: true,
        isMrRestricted: false,
        territories: [],
        allowedCompanyCodes: [],
      });
    }

    // Collect unique company codes from territory assignments
    const allowedCompanyCodes: string[] = Array.from(
      new Set(territories.map((t: any) => String(t.companyCode || "").trim()))
    ).filter(Boolean);

    // Map companyCode → GCODE via SaleType
    // SaleType has SCODE (= companyCode) and SNAME (= company name)
    // Product.GCODE == SaleType.SCODE → so allowedGCODEs = allowedCompanyCodes
    // (The GCODE on a product IS the company code from SaleType)
    const saleTypes = await SaleType.find(
      { SCODE: { $in: allowedCompanyCodes } },
      { SCODE: 1, SNAME: 1 }
    );

    const allowedGCODEs: string[] = Array.from(
      new Set(
        saleTypes.map((s: any) => String(s.SCODE || "").trim())
      )
    ).filter(Boolean);

    return NextResponse.json({
      success: true,
      isMrRestricted: true,
      territories: territories.map((t: any) => ({
        companyCode: t.companyCode,
        companyName: t.companyName,
        divisionCode: t.divisionCode,
        divisionName: t.divisionName,
        subDivisionCode: t.subDivisionCode,
        subDivisionName: t.subDivisionName,
        categoryCode: t.categoryCode,
        categoryName: t.categoryName,
      })),
      allowedCompanyCodes,
      allowedGCODEs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch MR territories",
      },
      { status: 500 }
    );
  }
}
