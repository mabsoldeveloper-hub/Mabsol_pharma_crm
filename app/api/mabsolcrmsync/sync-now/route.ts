import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import VfpSyncLog from "@/models/VfpSyncLog";
import VfpConfig from "@/models/VfpConfig";
import VfpSettingLog from "@/models/VfpSettingLog";
import { getCurrentUser } from "@/lib/auth";

import { performDirectServerSync } from "@/lib/vfp/dbfSync";

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

    // Resolve Company, FY & User identifiers
    const userId = user._id ? user._id.toString() : "";
    const companyId = user.companyId?._id ? user.companyId._id.toString() : (user.companyId ? user.companyId.toString() : "");
    const companyCode = user.companyId?.companyCode || body.companyCode || config?.companyName || "MABSOL";
    const resolvedCompanyName = (user.companyId as any)?.companyName || body.companyName || config?.companyName || "Mabsol Infotech";
    const resolvedCompanyEmail = (user.companyId as any)?.email || user.email || "";
    const financialYear = body.financialYear || "";
    const financialYearId = body.financialYearId || null;
    const tenantId = user.tenantId || "TENANT001";
    const resetCollections = Boolean(body.reset || body.clearExisting);

    // Create entry in VfpSettingLog to log who did the sync and when
    await VfpSettingLog.create({
      email: user.email,
      companyId: companyId || null,
      companyCode,
      companyEmail: resolvedCompanyEmail,
      financialYear,
      financialYearId,
      userId: userId || null,
      tenantId,
      ipAddress,
      userName,
      companyName: resolvedCompanyName,
      license,
      vfpExePath,
      action: "sync_triggered",
      status: "success",
      message: `Direct server sync manually triggered from dashboard for company ${resolvedCompanyName} (FY: ${financialYear || "Default"}).`,
    });

    // Execute direct server-side DBF sync with full user & company context
    const syncResult = await performDirectServerSync(
      {
        userId,
        companyId,
        companyName: resolvedCompanyName,
        companyEmail: resolvedCompanyEmail,
        companyCode,
        financialYear,
        financialYearId,
        tenantId,
        email: user.email,
      },
      { resetCollections }
    );

    return NextResponse.json({
      success: true,
      message: `DBF synchronization completed! Synced ${syncResult.importedTables} table(s), ${syncResult.importedRows} row(s).`,
      result: syncResult,
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
