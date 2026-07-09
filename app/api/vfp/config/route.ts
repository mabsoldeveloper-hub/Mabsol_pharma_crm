import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import VfpSettingLog from "@/models/VfpSettingLog";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    let dataDir = process.env.VFP_DATA_DIR || "";
    let sourceDir = "";
    let enabledFiles: string[] = [];
    let useVfpEngine = false;
    let vfpExePath = process.env.VFP_EXE_PATH || "";
    let userName = "";
    let companyName = "";
    let license = "";
    let isFromDb = false;

    const config = await VfpConfig.findOne({ key: "vfp_sync_config" }).lean();
    if (config) {
      if ((config as any).dataDir) {
        dataDir = (config as any).dataDir;
        isFromDb = true;
      }
      if ((config as any).sourceDir) {
        sourceDir = (config as any).sourceDir;
      }
      if ((config as any).enabledFiles) {
        enabledFiles = (config as any).enabledFiles;
      }
      if ((config as any).useVfpEngine !== undefined) {
        useVfpEngine = (config as any).useVfpEngine;
      }
      if ((config as any).vfpExePath) {
        vfpExePath = (config as any).vfpExePath;
      }
      if ((config as any).userName) {
        userName = (config as any).userName;
      }
      if ((config as any).companyName) {
        companyName = (config as any).companyName;
      }
      if ((config as any).license) {
        license = (config as any).license;
      }
    }

    const exists = dataDir ? fs.existsSync(dataDir) : false;
    const sourceExists = sourceDir ? fs.existsSync(sourceDir) : false;
    const vfpExeExists = vfpExePath ? fs.existsSync(vfpExePath) : false;

    return NextResponse.json({
      success: true,
      dataDir,
      sourceDir,
      enabledFiles,
      useVfpEngine,
      vfpExePath,
      userName,
      companyName,
      license,
      isFromDb,
      exists,
      sourceExists,
      vfpExeExists,
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
    const { dataDir, sourceDir, enabledFiles, useVfpEngine, vfpExePath, userName, companyName, license } = body;

    const updateFields: any = {};

    if (dataDir) {
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
      updateFields.dataDir = dataDir;
    } else {
      const existingConfig = await VfpConfig.findOne({ key: "vfp_sync_config" });
      if (!existingConfig?.dataDir && !process.env.VFP_DATA_DIR) {
        return NextResponse.json(
          { success: false, error: "dataDir is required" },
          { status: 400 }
        );
      }
    }

    if (sourceDir !== undefined) {
      if (sourceDir) {
        if (!fs.existsSync(sourceDir)) {
          return NextResponse.json(
            { success: false, error: `Source folder path does not exist on local disk: ${sourceDir}` },
            { status: 400 }
          );
        }

        const stat = fs.statSync(sourceDir);
        if (!stat.isDirectory()) {
          return NextResponse.json(
            { success: false, error: `Source path is not a directory: ${sourceDir}` },
            { status: 400 }
          );
        }
      }
      updateFields.sourceDir = sourceDir;
    }

    if (enabledFiles !== undefined) {
      if (!Array.isArray(enabledFiles)) {
        return NextResponse.json(
          { success: false, error: "enabledFiles must be an array of strings" },
          { status: 400 }
        );
      }
      updateFields.enabledFiles = enabledFiles;
    }

    if (useVfpEngine !== undefined) {
      updateFields.useVfpEngine = Boolean(useVfpEngine);
    }

    if (vfpExePath !== undefined) {
      if (vfpExePath) {
        if (!fs.existsSync(vfpExePath)) {
          return NextResponse.json(
            { success: false, error: `Visual FoxPro executable not found at: ${vfpExePath}` },
            { status: 400 }
          );
        }
      }
      updateFields.vfpExePath = vfpExePath;
    }

    if (userName !== undefined) {
      updateFields.userName = userName;
    }
    if (companyName !== undefined) {
      updateFields.companyName = companyName;
    }
    if (license !== undefined) {
      updateFields.license = license;
    }

    // Save to database
    await VfpConfig.updateOne(
      { key: "vfp_sync_config" },
      { $set: updateFields },
      { upsert: true }
    );

    // Get final values for logging (merging with existing)
    const activeConfig = await VfpConfig.findOne({ key: "vfp_sync_config" });
    const logUserName = activeConfig?.userName || "Unknown";
    const logCompanyName = activeConfig?.companyName || "Unknown";
    const logLicense = activeConfig?.license || "Unknown";
    const logVfpExePath = activeConfig?.vfpExePath || "Unknown";

    // Create entry in VfpSettingLog to log this configuration change
    await VfpSettingLog.create({
      userName: logUserName,
      companyName: logCompanyName,
      license: logLicense,
      vfpExePath: logVfpExePath,
      action: "save_settings",
      status: "success",
      message: "VFP configuration settings updated.",
    });

    return NextResponse.json({
      success: true,
      message: "VFP configuration updated successfully!",
      config: updateFields,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
