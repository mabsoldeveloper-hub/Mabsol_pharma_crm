import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpConfig from "@/models/VfpConfig";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch active VFP configuration
    const config = await VfpConfig.findOne({ email: user.email }) || await VfpConfig.findOne({ key: "vfp_sync_config" });
    const vfpExePath = config && (config as any).vfpExePath ? (config as any).vfpExePath : (process.env.VFP_EXE_PATH || "");
    const startupCommand = config && (config as any).startupCommand ? (config as any).startupCommand : "";

    // Validate executable and startup command exist
    if (!vfpExePath || !startupCommand.trim()) {
      return NextResponse.json(
        { success: false, error: "Both Visual FoxPro executable path and Startup Console Command are required to open the VFP Console." },
        { status: 400 }
      );
    }

    if (!fs.existsSync(vfpExePath)) {
      return NextResponse.json(
        { success: false, error: `Visual FoxPro executable not found at: ${vfpExePath}` },
        { status: 400 }
      );
    }

    const prgPath = path.join(process.cwd(), "vfp_launch_startup.prg");
    const fpwPath = path.join(process.cwd(), "vfp_launch_config.fpw");

    // Write VFP startup file and configuration mapping
    const keyboardInstruction = startupCommand 
      ? `KEYBOARD [DO "${startupCommand}"] + CHR(13)`
      : `KEYBOARD '* Drag & drop your PRG file here or type script path (e.g. DO "D:\\New Folder\\1.PRG")' + CHR(13)`;

    fs.writeFileSync(prgPath, `SET SAFETY OFF\r\nSET TALK OFF\r\n${keyboardInstruction}\r\n`);
    fs.writeFileSync(fpwPath, `COMMAND = DO "${prgPath}"\r\n`);

    const vfpDir = path.dirname(vfpExePath);

    // Spawn VFP in detached mode pointing to configuration
    const child = spawn(vfpExePath, ["-c" + fpwPath], {
      cwd: vfpDir,
      detached: true,
      stdio: "ignore",
    });

    // Unreference the child process so Next.js doesn't wait for it to exit
    child.unref();

    // Clean up temporary script files after a short delay (e.g. 5 seconds)
    setTimeout(() => {
      try {
        if (fs.existsSync(prgPath)) fs.unlinkSync(prgPath);
        if (fs.existsSync(fpwPath)) fs.unlinkSync(fpwPath);
        const fxpPath = prgPath.replace(/\.prg$/i, ".fxp");
        const bakPath = prgPath.replace(/\.prg$/i, ".bak");
        if (fs.existsSync(fxpPath)) fs.unlinkSync(fxpPath);
        if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);
      } catch (e) {}
    }, 5000);

    return NextResponse.json({
      success: true,
      message: `Visual FoxPro (${path.basename(vfpExePath)}) opened successfully on the machine with pre-loaded command!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
