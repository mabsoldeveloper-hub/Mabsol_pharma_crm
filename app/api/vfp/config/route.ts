import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import VfpSettingLog from "@/models/VfpSettingLog";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let dataDir = process.env.VFP_DATA_DIR || "";
    let sourceDir = "";
    let enabledFiles: string[] = [];
    let useVfpEngine = false;
    let vfpExePath = process.env.VFP_EXE_PATH || "";
    let prgPath = "";
    let userName = user.name || "";
    let companyName = (user.companyId as any)?.companyName || "";
    let license = "";
    let startupCommand = "";
    let isFromDb = false;

    const config = await VfpConfig.findOne({ email: user.email }).lean() || await VfpConfig.findOne({ key: "vfp_sync_config" }).lean();
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
      if ((config as any).prgPath) {
        prgPath = (config as any).prgPath;
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
      if ((config as any).startupCommand) {
        startupCommand = (config as any).startupCommand;
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
      prgPath,
      userName,
      companyName,
      license,
      startupCommand,
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "127.0.0.1";
    const body = await request.json();
    const { dataDir, sourceDir, enabledFiles, useVfpEngine, vfpExePath, prgPath, userName, companyName, license, startupCommand } = body;

    const updateFields: any = {};
    const existingConfig = await VfpConfig.findOne({ email: user.email }) || await VfpConfig.findOne({ key: "vfp_sync_config" });

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

    if (prgPath !== undefined) {
      if (prgPath) {
        if (!fs.existsSync(prgPath)) {
          return NextResponse.json(
            { success: false, error: `PRG script file not found at: ${prgPath}` },
            { status: 400 }
          );
        }
      }
      updateFields.prgPath = prgPath;
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
    if (startupCommand !== undefined) {
      updateFields.startupCommand = startupCommand;
    }

    // Save to database
    await VfpConfig.updateOne(
      { key: "vfp_sync_config_" + user.email },
      { $set: { ...updateFields, email: user.email } },
      { upsert: true }
    );

    // Get final values for logging (merging with existing)
    const activeConfig = await VfpConfig.findOne({ email: user.email });
    const logUserName = activeConfig?.userName || user.name || "Unknown";
    const logCompanyName = activeConfig?.companyName || (user.companyId as any)?.companyName || "Unknown";
    const logLicense = activeConfig?.license || "Unknown";
    const logVfpExePath = activeConfig?.vfpExePath || "Unknown";

    // Calculate detailed changes
    const changesList: string[] = [];
    const changes: any = {};
    const fieldsToCompare = ["userName", "companyName", "license", "vfpExePath", "prgPath", "dataDir", "sourceDir", "useVfpEngine", "enabledFiles", "startupCommand"];
    for (const field of fieldsToCompare) {
      if (body[field] !== undefined) {
        const oldVal = existingConfig ? (existingConfig as any)[field] : undefined;
        const newVal = body[field];
        const oldStr = Array.isArray(oldVal) ? JSON.stringify(oldVal) : String(oldVal ?? "");
        const newStr = Array.isArray(newVal) ? JSON.stringify(newVal) : String(newVal ?? "");
        if (oldStr !== newStr) {
          changes[field] = { old: oldVal, new: newVal };
          changesList.push(`${field} changed from "${oldVal ?? ''}" to "${newVal ?? ''}"`);
        }
      }
    }
    const changesMsg = changesList.length > 0 ? changesList.join(", ") : "No configuration properties changed.";

    // Create entry in VfpSettingLog to log this configuration change
    await VfpSettingLog.create({
      email: user.email,
      ipAddress,
      userName: logUserName,
      companyName: logCompanyName,
      license: logLicense,
      vfpExePath: logVfpExePath,
      action: "save_settings",
      status: "success",
      message: changesMsg,
      changes,
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
