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
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body might be empty
    }

    // Get active VFP configuration for fallbacks
    const config = await VfpConfig.findOne({ email: user.email }) || await VfpConfig.findOne({ key: "vfp_sync_config" });

    const {
      userName = config?.userName || user.name || "Unknown",
      companyName = config?.companyName || (user.companyId as any)?.companyName || "Unknown",
      license = config?.license || "Unknown",
      vfpExePath = config?.vfpExePath || "Unknown",
    } = body;

    const command = await VfpSyncCommand.create({
      command: "sync_now",
      status: "queued",
      requestedBy: userName,
      email: user.email,
    });

    await VfpSyncLog.create({
      runId: String(command._id),
      email: user.email,
      action: "sync_now",
      status: "queued",
      message: `Immediate VFP import queued by ${userName} (${companyName}).`,
    });

    // Create entry in VfpSettingLog to log who did the sync and when
    await VfpSettingLog.create({
      email: user.email,
      ipAddress,
      userName,
      companyName,
      license,
      vfpExePath,
      action: "sync_triggered",
      status: "success",
      message: `Sync manually triggered from Settings Page.`,
    });

    return NextResponse.json({
      success: true,
      commandId: command._id,
      message: "Sync queued. Keep the VFP sync worker running to process it.",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to queue sync",
      },
      { status: 500 }
    );
  }
}
