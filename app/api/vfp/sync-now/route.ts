import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpSyncLog from "@/models/VfpSyncLog";
import VfpConfig from "@/models/VfpConfig";
import VfpSettingLog from "@/models/VfpSettingLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body might be empty
    }

    // Get active VFP configuration for fallbacks
    const config = await VfpConfig.findOne({ key: "vfp_sync_config" });

    const {
      userName = config?.userName || "Unknown",
      companyName = config?.companyName || "Unknown",
      license = config?.license || "Unknown",
      vfpExePath = config?.vfpExePath || "Unknown",
    } = body;

    const command = await VfpSyncCommand.create({
      command: "sync_now",
      status: "queued",
      requestedBy: userName,
    });

    await VfpSyncLog.create({
      runId: String(command._id),
      action: "sync_now",
      status: "queued",
      message: `Immediate VFP import queued by ${userName} (${companyName}).`,
    });

    // Create entry in VfpSettingLog to log who did the sync and when
    await VfpSettingLog.create({
      userName,
      companyName,
      license,
      vfpExePath,
      action: "sync_triggered",
      status: "success",
      message: "Sync triggered from Settings Page.",
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
