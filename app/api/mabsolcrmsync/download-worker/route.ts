import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedFile = searchParams.get("file");

    // Serve worker.cjs directly if requested
    if (requestedFile === "worker.cjs") {
      const workerPath = path.join(process.cwd(), "scripts", "mabsolcrm-sync", "worker.cjs");
      if (fs.existsSync(workerPath)) {
        const workerContent = fs.readFileSync(workerPath, "utf-8");
        return new NextResponse(workerContent, {
          status: 200,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Content-Disposition": 'attachment; filename="worker.cjs"',
          },
        });
      }
    }

    // Determine host URL for Cloud API
    const user = await getCurrentUser();
    const userEmail = user?.email || "";

    const host = request.headers.get("host") || "phcrm.mabsolinfotech.cloud";
    const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const cloudUrl = `${proto}://${host}`;

    // Dynamically generate smart run_local_sync.bat
    const batContent = `@echo off
title Mabsol Pharma CRM - Desktop DBF Sync Worker
echo ========================================================
echo   Mabsol Pharma CRM - Desktop DBF Sync Worker (Marg / FoxPro)
echo ========================================================
echo.
echo Target Cloud URL: ${cloudUrl}
echo Account: ${userEmail || "Mabsol CRM"}
echo.

cd /d "%~dp0"

REM 1. Check if worker.cjs exists locally or in scripts subfolder
if not exist "worker.cjs" (
    if exist "scripts\\mabsolcrm-sync\\worker.cjs" (
        copy /Y "scripts\\mabsolcrm-sync\\worker.cjs" "worker.cjs" >nul
    ) else (
        echo Downloading worker script from Cloud server...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('${cloudUrl}/api/mabsolcrmsync/download-worker?file=worker.cjs', 'worker.cjs')"
    )
)

REM 2. Create worker-config.json if not present
if not exist "worker-config.json" (
    echo { "cloudUrl": "${cloudUrl}", "email": "${userEmail}", "dataDir": "C:\\\\VFP\\\\DATA" } > worker-config.json
)

REM 3. Verify Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js is not installed on this PC.
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

REM 4. Execute worker script
echo.
echo Starting Desktop Sync Worker...
node worker.cjs
echo.
pause
`;

    return new NextResponse(batContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="run_local_sync.bat"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate download file" },
      { status: 500 }
    );
  }
}
