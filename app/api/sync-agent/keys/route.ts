import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import VfpConfig from "@/models/VfpConfig";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// GET /api/sync-agent/keys - Get or generate License Key for logged-in company user
export async function GET() {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const email = user.email || "global";
    let config = await VfpConfig.findOne({
      $or: [{ email }, { key: "vfp_sync_config_" + email }],
    });

    if (!config || !config.licenseKey) {
      // Generate a new 16-char unique License Key
      const newKey = `MSK-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      config = await VfpConfig.findOneAndUpdate(
        { $or: [{ email }, { key: "vfp_sync_config_" + email }] },
        {
          $set: {
            email,
            key: "vfp_sync_config_" + email,
            licenseKey: newKey,
            companyName: (user.companyId as any)?.companyName || user.name || "Default Company",
          },
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({
      success: true,
      licenseKey: config?.licenseKey,
      companyName: config?.companyName || user.name,
      serverUrl: process.env.NEXT_PUBLIC_APP_URL || "https://phcrm.mabsolinfotech.cloud",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/sync-agent/keys - Regenerate License Key
export async function POST() {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const email = user.email || "global";
    const newKey = `MSK-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    
    const config = await VfpConfig.findOneAndUpdate(
      { $or: [{ email }, { key: "vfp_sync_config_" + email }] },
      { $set: { email, key: "vfp_sync_config_" + email, licenseKey: newKey } },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      licenseKey: config?.licenseKey,
      message: "New License Key generated successfully!",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
