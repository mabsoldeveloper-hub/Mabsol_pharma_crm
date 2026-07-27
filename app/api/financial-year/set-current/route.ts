import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { fyId } = await req.json();

    if (fyId === "ALL") {
      await FinancialYear.updateMany({}, { isCurrent: false });
    } else if (fyId) {
      await FinancialYear.updateMany({}, { isCurrent: false });
      await FinancialYear.findByIdAndUpdate(fyId, { isCurrent: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed" },
      { status: 500 }
    );
  }
}