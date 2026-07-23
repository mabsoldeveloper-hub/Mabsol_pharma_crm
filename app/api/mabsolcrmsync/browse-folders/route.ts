import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpSyncCommand from "@/models/VfpSyncCommand";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let { targetPath } = body;

    // If running on a cloud Linux server, relay the browse request through the database
    // to let the local Windows sync worker handle it.
    const isLinuxServer = process.platform !== "win32";
    if (isLinuxServer) {
      const checkPath = targetPath || "";
      const command = await VfpSyncCommand.create({
        command: "browse_folders",
        email: user.email || "global",
        payload: { dir: checkPath, type: "dir" },
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
        const res = completedCommand.result;
        // Transform VFP browse result into format expected by FolderSelectorModal
        return NextResponse.json({
          success: true,
          currentPath: res.currentDir || "",
          parentPath: res.parentDir,
          folders: res.directories && res.directories.length > 0 ? res.directories : (res.drives || []),
        });
      } else {
        return NextResponse.json({
          success: false,
          error: completedCommand?.message || "Local VFP sync worker timed out. Make sure the VFP sync worker daemon (worker.cjs) is running on your local Windows PC.",
        });
      }
    }

    // --- FROM HERE DOWN: LOCAL WINDOWS SERVER RESOLUTION (DEV MODE) ---
    // Fallback to VFP_DATA_DIR or current working directory if no path is provided
    if (!targetPath) {
      targetPath = process.env.VFP_DATA_DIR || process.cwd();
    }

    // Resolve targetPath. If it is just a drive letter (e.g. C: or D:), append backslash.
    let resolvedPath = path.resolve(targetPath);
    if (/^[a-zA-Z]:$/.test(targetPath)) {
      resolvedPath = targetPath + "\\";
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({
        success: false,
        error: `Folder path does not exist: ${resolvedPath}`,
      });
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({
        success: false,
        error: `Path is not a directory: ${resolvedPath}`,
      });
    }

    // Read the directory contents
    const items = fs.readdirSync(resolvedPath, { withFileTypes: true });

    // Filter directories only and sort alphabetically
    const folders = items
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    // Determine the parent path.
    // In Windows, a root directory's parent (like D:\'s parent) resolves to itself.
    const parentPath = path.dirname(resolvedPath);
    const isRoot =
      parentPath === resolvedPath ||
      /^[a-zA-Z]:\\?$/.test(resolvedPath) ||
      resolvedPath.endsWith(":\\") ||
      resolvedPath.endsWith(":/");

    return NextResponse.json({
      success: true,
      currentPath: resolvedPath,
      parentPath: isRoot ? null : parentPath,
      folders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
