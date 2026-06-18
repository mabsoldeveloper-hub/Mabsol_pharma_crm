import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpSyncLog from "@/models/VfpSyncLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await dbConnect();

    const command = await VfpSyncCommand.create({
      command: "sync_now",
      status: "queued",
      requestedBy: "crm",
    });

    await VfpSyncLog.create({
      runId: String(command._id),
      action: "sync_now",
      status: "queued",
      message: "Immediate VFP import queued for the local sync worker.",
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
