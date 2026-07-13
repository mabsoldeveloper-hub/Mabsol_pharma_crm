import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetDir = searchParams.get("dir") || "";
    const filterType = searchParams.get("type") || ""; // "exe" or "prg" or ""

    // If no directory is specified, return active Windows drives
    if (!targetDir) {
      const drives: string[] = [];
      for (let i = 65; i <= 90; i++) {
        const drive = String.fromCharCode(i) + ":\\";
        try {
          if (fs.existsSync(drive)) {
            drives.push(drive);
          }
        } catch (e) {}
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

    // If the path is a Windows path (e.g. C:\... or D:\...) but the server is running on Linux,
    // bypass validation checks since we are in a cloud/hybrid deployment.
    const isWindowsPath = /^[a-zA-Z]:/i.test(targetDir);
    const isLinuxServer = process.platform !== "win32";

    if (isWindowsPath && isLinuxServer) {
      return NextResponse.json({
        success: true,
        currentDir: targetDir.endsWith("\\") || targetDir.endsWith("/") ? targetDir : targetDir + "\\",
        parentDir: null,
        drives: [],
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
