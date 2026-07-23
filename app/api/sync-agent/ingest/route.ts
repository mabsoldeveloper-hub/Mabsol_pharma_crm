import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import VfpTableMap from "@/models/VfpTableMap";
import VfpSyncState from "@/models/VfpSyncState";
import VfpSyncLog from "@/models/VfpSyncLog";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Authenticate via Bearer License Key
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
    const { action, tables, logs, runId } = body;
    const email = config.email;

    if (action === "table_map" && Array.isArray(tables)) {
      // Upsert table mappings for this company
      for (const table of tables) {
        await VfpTableMap.updateOne(
          { email, fileName: table.fileName },
          { $set: { ...table, email, updatedAt: new Date() } },
          { upsert: true }
        );
      }
    }

    if (action === "sync_batch" && Array.isArray(tables)) {
      // Process batch table rows & sync state
      for (const tData of tables) {
        const { tableName, fileName, recordCount, primaryKeyFields } = tData;

        await VfpSyncState.updateOne(
          { email, tableName },
          {
            $set: {
              email,
              tableName,
              fileName: fileName || `${tableName}.dbf`,
              recordCount: recordCount || 0,
              primaryKeyFields: primaryKeyFields || [],
              lastSyncAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
    }

    // Log the sync activity
    if (logs) {
      await VfpSyncLog.create({
        runId: runId || `${Date.now()}`,
        email,
        action: action || "agent_sync",
        status: "success",
        message: typeof logs === "string" ? logs : "Agent data batch received successfully.",
        finishedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Data batch processed successfully.",
      email,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
