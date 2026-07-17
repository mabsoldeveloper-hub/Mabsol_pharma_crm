import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import fs from "fs";
import path from "path";

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

    // If running on a cloud Linux server, relay the browse request through the database
    // to let the local Windows sync worker handle it.
    const isLinuxServer = process.platform !== "win32";
    if (isLinuxServer) {
      const command = await VfpSyncCommand.create({
        command: "browse_dir",
        email: user.email || "global",
        payload: { dir: targetDir, type: filterType === "dir" ? "dir" : "file", filter: filterType },
        status: "queued",
        requestedBy: user.email || "web",
      });

      // Poll database for up to 12 seconds
      let completedCommand = null;
      for (let i = 0; i < 24; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const check = await VfpSyncCommand.findById(command._id);
        if (check && (check.status === "done" || check.status === "failed")) {
          completedCommand = check;
          break;
        }
      }

      // Cleanup command doc
      try {
        await VfpSyncCommand.deleteOne({ _id: command._id });
      } catch (e) {}

      if (completedCommand && completedCommand.status === "done") {
        return NextResponse.json(completedCommand.result);
      } else {
        return NextResponse.json(
          {
            success: false,
            error: completedCommand?.message || "Local VFP sync worker timed out. Make sure the VFP sync worker daemon (worker.cjs) is running on your local Windows PC.",
          },
          { status: 504 }
        );
      }
    }

    // --- FROM HERE DOWN: LOCAL WINDOWS SERVER RESOLUTION (DEV MODE) ---
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
