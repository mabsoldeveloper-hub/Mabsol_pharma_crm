import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { targetPath } = body;

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
