import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpSyncLog from "@/models/VfpSyncLog";
import { getCurrentUser } from "@/lib/auth";

import { performDirectServerSync } from "@/lib/vfp/dbfSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const syncResult = await performDirectServerSync(user.email);

    return NextResponse.json({
      success: true,
      message: `DBF rescan & synchronization completed! Synced ${syncResult.importedTables} table(s), ${syncResult.importedRows} row(s).`,
      result: syncResult,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to queue rescan",
      },
      { status: 500 }
    );
  }
}
