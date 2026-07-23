import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import VfpWorkerHeartbeat from "@/models/VfpWorkerHeartbeat";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Authenticate via Bearer License Key or Header
    const authHeader = request.headers.get("authorization") || "";
    const licenseKey = authHeader.replace(/^Bearer\s+/i, "").trim() || request.headers.get("x-license-key") || "";

    if (!licenseKey) {
      return NextResponse.json({ success: false, error: "Missing License Key" }, { status: 401 });
    }

    const config = await VfpConfig.findOne({
      $or: [{ licenseKey }, { license: licenseKey }],
    });
    if (!config) {
      return NextResponse.json({ success: false, error: "Invalid License Key" }, { status: 401 });
    }

    const body = await request.json();
    const { workerId, hostname, dataDir, agentVersion, status, lastError } = body;

    const currentWorkerId = workerId || `${hostname || 'client-pc'}-${config.email}`;

    // Update Worker Heartbeat document in MongoDB
    await VfpWorkerHeartbeat.updateOne(
      { workerId: currentWorkerId },
      {
        $set: {
          workerId: currentWorkerId,
          email: config.email,
          licenseKey,
          hostname: hostname || "Client-PC",
          dataDir: dataDir || "",
          agentVersion: agentVersion || "1.0.0",
          status: status || "online",
          lastError: lastError || "",
          lastSeenAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "Heartbeat recorded",
      email: config.email,
      companyName: config.companyName,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
