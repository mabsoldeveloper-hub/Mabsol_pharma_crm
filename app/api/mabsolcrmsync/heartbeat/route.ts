import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpWorkerHeartbeat from "@/models/VfpWorkerHeartbeat";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty
    }

    const {
      workerId = "desktop-worker-1",
      status = "online",
      dataDir = "",
      lastRunReason = "",
      lastError = "",
      email = "",
    } = body;

    // Get current user if authenticated session exists
    const user = await getCurrentUser();
    const targetEmail = email || user?.email || "global";

    // Upsert worker heartbeat in MongoDB
    await VfpWorkerHeartbeat.updateOne(
      { workerId },
      {
        $set: {
          workerId,
          status,
          dataDir,
          lastSeenAt: new Date(),
          lastRunReason,
          lastError,
          email: targetEmail,
        },
      },
      { upsert: true }
    );

    // Also update a global heartbeat record for quick lookup
    await VfpWorkerHeartbeat.updateOne(
      { workerId: "global-desktop-worker" },
      {
        $set: {
          workerId: "global-desktop-worker",
          status,
          dataDir,
          lastSeenAt: new Date(),
          lastRunReason,
          lastError,
          email: targetEmail,
        },
      },
      { upsert: true }
    );

    // Check for pending queued sync commands
    const pendingCommands = await VfpSyncCommand.find({
      status: "queued",
      ...(targetEmail !== "global" ? { email: targetEmail } : {}),
    }).lean();

    return NextResponse.json({
      success: true,
      workerOnline: true,
      pendingCommands: pendingCommands.map((c: any) => ({
        id: c._id.toString(),
        command: c.command,
        email: c.email,
        createdAt: c.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process heartbeat" },
      { status: 500 }
    );
  }
}
