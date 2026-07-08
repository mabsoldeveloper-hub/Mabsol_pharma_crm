import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await dbConnect();

    // Fetch active VFP configuration
    const config = await VfpConfig.findOne({ key: "vfp_sync_config" });
    const vfpExePath = config && (config as any).vfpExePath ? (config as any).vfpExePath : (process.env.VFP_EXE_PATH || "");

    // Validate executable exists
    if (!vfpExePath) {
      return NextResponse.json(
        { success: false, error: "Visual FoxPro executable path is not configured. Please set the path in the Sync Wizard or define VFP_EXE_PATH in your environment." },
        { status: 400 }
      );
    }

    if (!fs.existsSync(vfpExePath)) {
      return NextResponse.json(
        { success: false, error: `Visual FoxPro executable not found at: ${vfpExePath}` },
        { status: 400 }
      );
    }

    const vfpDir = path.dirname(vfpExePath);

    // Spawn VFP in detached mode so it launches in foreground and remains open,
    // without locking or blocking the Next.js server thread.
    const child = spawn(vfpExePath, [], {
      cwd: vfpDir,
      detached: true,
      stdio: "ignore",
    });

    // Unreference the child process so Next.js doesn't wait for it to exit
    child.unref();

    return NextResponse.json({
      success: true,
      message: `Visual FoxPro (${path.basename(vfpExePath)}) opened successfully on the machine!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
