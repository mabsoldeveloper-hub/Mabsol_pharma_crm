import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpSettingLog from "@/models/VfpSettingLog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const logs = await VfpSettingLog.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
