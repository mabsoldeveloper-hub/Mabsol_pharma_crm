import { NextResponse } from "next/server";
import { peekNextVoucherNumber } from "@/lib/voucherSeriesHelper";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawType = String(searchParams.get("type") || searchParams.get("billType") || "S").toUpperCase();
    const voucherType = rawType.includes("PROFORMA") || rawType.includes("ESTIMATE") ? "PROFORMA" : "SALES";

    const vcn = await peekNextVoucherNumber(voucherType);

    return NextResponse.json({
      success: true,
      voucherType,
      vcn,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
