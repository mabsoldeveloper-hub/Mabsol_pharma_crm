import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const batPath = path.join(process.cwd(), "run_local_sync.bat");
    
    let content = "";
    if (fs.existsSync(batPath)) {
      content = fs.readFileSync(batPath, "utf-8");
    } else {
      content = `@echo off
title Mabsol Pharma CRM - Desktop Sync Worker
echo ========================================================
echo   Mabsol Pharma CRM - Desktop DBF Sync Worker (Marg / FoxPro)
echo ========================================================
echo.
echo Starting background worker for live cloud database sync...
echo Local Folder: Watcher & Queue active
echo.
node scripts\\mabsolcrm-sync\\worker.cjs
pause
`;
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="run_local_sync.bat"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate bat file" },
      { status: 500 }
    );
  }
}
