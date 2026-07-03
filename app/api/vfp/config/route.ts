import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    let dataDir = process.env.VFP_DATA_DIR || "";
    let isFromDb = false;

    const config = await VfpConfig.findOne({ key: "vfp_sync_config" }).lean();
    if (config && (config as any).dataDir) {
      dataDir = (config as any).dataDir;
      isFromDb = true;
    }

    const exists = dataDir ? fs.existsSync(dataDir) : false;

    return NextResponse.json({
      success: true,
      dataDir,
      isFromDb,
      exists,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { dataDir } = body;

    if (!dataDir) {
      return NextResponse.json(
        { success: false, error: "dataDir is required" },
        { status: 400 }
      );
    }

    // Validate that path exists and is a directory on the server
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json(
        { success: false, error: `Folder path does not exist on local disk: ${dataDir}` },
        { status: 400 }
      );
    }

    const stat = fs.statSync(dataDir);
    if (!stat.isDirectory()) {
      return NextResponse.json(
        { success: false, error: `Path is not a directory: ${dataDir}` },
        { status: 400 }
      );
    }

    // Save to database
    await VfpConfig.updateOne(
      { key: "vfp_sync_config" },
      { $set: { dataDir } },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "Sync folder updated successfully!",
      dataDir,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
