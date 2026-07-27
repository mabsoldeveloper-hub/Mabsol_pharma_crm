import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetDir = searchParams.get("dir") || "";
    const filterType = searchParams.get("type") || ""; // "exe" or "prg" or ""

    // If no directory is specified, return active server drives or root paths
    if (!targetDir) {
      const drives: string[] = [];
      if (process.platform === "win32") {
        for (let i = 65; i <= 90; i++) {
          const drive = String.fromCharCode(i) + ":\\";
          try {
            if (fs.existsSync(drive)) {
              drives.push(drive);
            }
          } catch (e) {}
        }
      } else {
        // Linux / AWS Server under XRDP or Wine - ONLY return mapped local Windows PC drives
        const homeDir = os.homedir();
        
        // 1. Check for XRDP Local PC Redirected Drives (thinclient_drives)
        try {
          const possibleHomes = ["/home", homeDir];
          for (const hDir of possibleHomes) {
            if (fs.existsSync(hDir)) {
              const userDirs = fs.readdirSync(hDir, { withFileTypes: true });
              for (const uDir of userDirs) {
                if (uDir.isDirectory()) {
                  const thinClientPath = path.join(hDir, uDir.name, "thinclient_drives");
                  if (fs.existsSync(thinClientPath)) {
                    try {
                      const subDrives = fs.readdirSync(thinClientPath);
                      for (const sDrive of subDrives) {
                        const fullDrivePath = path.join(thinClientPath, sDrive);
                        if (fs.existsSync(fullDrivePath) && !drives.includes(fullDrivePath)) {
                          drives.push(fullDrivePath);
                        }
                      }
                    } catch (e) {}
                    if (drives.length === 0 && !drives.includes(thinClientPath)) {
                      drives.push(thinClientPath);
                    }
                  }
                }
              }
            }
          }
        } catch (e) {}

        // 2. Check for Wine DOS Devices (C:, D:, Z: drives mapped by Wine)
        const wineDevicesDir = path.join(homeDir, ".wine", "dosdevices");
        if (fs.existsSync(wineDevicesDir)) {
          try {
            const wineItems = fs.readdirSync(wineDevicesDir);
            for (const item of wineItems) {
              const fullWinePath = path.join(wineDevicesDir, item);
              try {
                if (fs.existsSync(fullWinePath) && !drives.includes(fullWinePath)) {
                  drives.push(fullWinePath);
                }
              } catch (e) {}
            }
          } catch (e) {}
        }
      }
      return NextResponse.json({
        success: true,
        currentDir: "",
        parentDir: null,
        drives,
        directories: [],
        files: [],
      });
    }

    // Resolve directory details
    if (!fs.existsSync(targetDir)) {
      return NextResponse.json({ success: false, error: "Directory does not exist." }, { status: 400 });
    }

    const stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) {
      return NextResponse.json({ success: false, error: "Target is not a directory." }, { status: 400 });
    }

    const items = fs.readdirSync(targetDir, { withFileTypes: true });
    const directories: string[] = [];
    const files: string[] = [];

    for (const item of items) {
      try {
        if (item.isDirectory()) {
          // Ignore system folders or hidden folders starting with "."
          if (!item.name.startsWith(".") && !item.name.startsWith("$")) {
            directories.push(item.name);
          }
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (filterType === "exe" && ext === ".exe") {
            files.push(item.name);
          } else if (filterType === "prg" && ext === ".prg") {
            files.push(item.name);
          } else if (filterType === "dbf" && ext === ".dbf") {
            files.push(item.name);
          } else if (!filterType) {
            files.push(item.name);
          }
        }
      } catch (e) {}
    }

    // Determine parent directory
    const parentDir = path.dirname(targetDir);
    const hasParent = parentDir !== targetDir;

    return NextResponse.json({
      success: true,
      currentDir: targetDir.endsWith("\\") || targetDir.endsWith("/") ? targetDir : targetDir + path.sep,
      parentDir: hasParent ? parentDir : null,
      drives: [],
      directories: directories.sort((a, b) => a.localeCompare(b)),
      files: files.sort((a, b) => a.localeCompare(b)),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
