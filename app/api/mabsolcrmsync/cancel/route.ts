import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpSyncLog from "@/models/VfpSyncLog";
import VfpConfig from "@/models/VfpConfig";
import VfpSettingLog from "@/models/VfpSettingLog";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "127.0.0.1";
    const config = await VfpConfig.findOne({ email: user.email }) || await VfpConfig.findOne({ key: "vfp_sync_config" });

    // Cancel pending sync commands in DB
    await VfpSyncCommand.updateMany(
      { email: user.email, status: { $in: ["pending", "running"] } },
      { $set: { status: "cancelled", message: "Cancelled by user" } }
    );

    // Create log entries for cancellation
    await VfpSettingLog.create({
      email: user.email,
      ipAddress,
      userName: config?.userName || user.name || "Unknown",
      companyName: config?.companyName || "Unknown",
      license: config?.license || "Unknown",
      vfpExePath: config?.vfpExePath || "Unknown",
      action: "sync_cancelled",
      status: "cancelled",
      message: "Sync operation cancelled by user.",
    });

    await VfpSyncLog.create({
      runId: "cancel-" + Date.now(),
      email: user.email,
      action: "sync_cancelled",
      status: "cancelled",
      message: "Synchronization process cancelled.",
    });

    return NextResponse.json({
      success: true,
      message: "Sync operation cancelled successfully.",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to cancel sync",
      },
      { status: 500 }
    );
  }
}
