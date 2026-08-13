import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helper to search for pre-built setup .exe or installers in public/downloads or dist/
function findInstallerFile(): string | null {
  // 1. Check public/downloads folder for pre-built setup files
  const publicDownloads = path.join(process.cwd(), "public", "downloads");
  if (fs.existsSync(publicDownloads)) {
    const files = fs.readdirSync(publicDownloads);
    for (const file of files) {
      if (file.endsWith(".exe") || file.endsWith(".zip")) {
        return path.join(publicDownloads, file);
      }
    }
  }

  // 2. Check dist folder for build outputs
  const distPath = path.join(process.cwd(), "dist");
  if (fs.existsSync(distPath)) {
    const entries = fs.readdirSync(distPath);
    for (const entry of entries) {
      if (entry.endsWith(".exe")) {
        const full = path.join(distPath, entry);
        if (fs.statSync(full).isFile()) {
          return full;
        }
      }
    }
    
    // Check win-unpacked executable fallback
    const unpackedExe = path.join(distPath, "win-unpacked", "MabsolPharmaCRM.exe");
    if (fs.existsSync(unpackedExe)) {
      return unpackedExe;
    }
    const electronExe = path.join(distPath, "win-unpacked", "electron.exe");
    if (fs.existsSync(electronExe)) {
      return electronExe;
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const installerFile = findInstallerFile();
    const { searchParams } = new URL(req.url);
    const checkOnly = searchParams.get("check") === "true";

    if (checkOnly) {
      return NextResponse.json({
        available: !!installerFile,
        fileName: installerFile ? path.basename(installerFile) : "Mabsol_Pharma_CRM_Setup.exe",
        fileSize: installerFile ? fs.statSync(installerFile).size : 0,
        isBuilding: false,
      });
    }

    if (!installerFile || !fs.existsSync(installerFile)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Desktop installer executable not found. Please place the pre-built installer in public/downloads/ or run 'npm run electron:dist'.",
        },
        { status: 404 }
      );
    }

    const fileStream = fs.createReadStream(installerFile);
    const stat = fs.statSync(installerFile);
    const downloadName = "Mabsol_Pharma_CRM_Setup.exe";

    return new NextResponse(fileStream as any, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Content-Length": stat.size.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error in desktop download API:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Download failed" },
      { status: 500 }
    );
  }
}
