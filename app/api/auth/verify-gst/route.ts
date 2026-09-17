import { NextRequest, NextResponse } from "next/server";
import { verifyGST, lookupPostalPincode } from "@/lib/gstHelper";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gstin, pincode } = body;

    // PIN code auto-lookup mode
    if (pincode && !gstin) {
      const pinResult = await lookupPostalPincode(pincode);
      if (pinResult.success) {
        return NextResponse.json({
          success: true,
          type: "pincode",
          data: pinResult,
        });
      }
      return NextResponse.json({
        success: false,
        message: "PIN code not found",
      });
    }

    if (!gstin) {
      return NextResponse.json(
        { success: false, message: "GSTIN number is required" },
        { status: 400 }
      );
    }

    const cleanGst = String(gstin).trim().toUpperCase();

    // Call live GST API via verifyGST
    try {
      const gstResult = await verifyGST(cleanGst);

      return NextResponse.json({
        success: true,
        data: gstResult,
        message: gstResult.businessName || gstResult.legalName || gstResult.tradeName
          ? `GSTIN verified for ${gstResult.businessName || gstResult.legalName || gstResult.tradeName}`
          : "GSTIN verified successfully",
      });
    } catch (apiErr: any) {
      return NextResponse.json({
        success: false,
        message: apiErr?.message || "Invalid GSTIN or Data Missing",
      });
    }
  } catch (error: any) {
    console.error("[GST VERIFY ROUTE ERROR]:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to verify GSTIN via API",
      },
      { status: 500 }
    );
  }
}
