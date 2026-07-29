import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    let initialPath = "";
    try {
      const body = await req.json();
      if (body && body.currentPath) {
        initialPath = body.currentPath;
      }
    } catch {
      // Body is optional
    }

    // PowerShell script to launch a top-most FolderBrowserDialog on Windows
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Application]::EnableVisualStyles()
      $f = New-Object System.Windows.Forms.FolderBrowserDialog
      $f.Description = 'Select VFP Sync Folder'
      $f.ShowNewFolderButton = $true
      $initPath = "${initialPath.replace(/\\/g, "\\\\").replace(/"/g, '\"')}"
      if ($initPath -ne "" -and (Test-Path -Path $initPath)) {
        $f.SelectedPath = $initPath
      }
      $owner = New-Object System.Windows.Forms.Form
      $owner.TopMost = $true
      $result = $f.ShowDialog($owner)
      if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        Write-Output $f.SelectedPath
      }
    `;

    const encodedCommand = Buffer.from(script, "utf16le").toString("base64");
    const { stdout, stderr } = await execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedCommand}`
    );

    const selectedPath = stdout ? stdout.trim() : "";
    if (!selectedPath) {
      return NextResponse.json({ success: true, cancelled: true });
    }

    return NextResponse.json({ success: true, path: selectedPath });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

