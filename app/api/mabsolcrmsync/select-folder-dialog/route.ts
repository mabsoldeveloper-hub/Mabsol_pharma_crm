import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // PowerShell script to launch a top-most FolderBrowserDialog on Windows
    const script = `
      Add-Type -AssemblyName System.Windows.Forms;
      $f = New-Object System.Windows.Forms.FolderBrowserDialog;
      $f.Description = 'Select VFP Sync Folder';
      $f.ShowNewFolderButton = $true;
      $owner = New-Object System.Windows.Forms.Form;
      $owner.TopMost = $true;
      $result = $f.ShowDialog($owner);
      if ($result -eq 'OK') {
        Write-Output $f.SelectedPath
      }
    `;

    // Execute the PowerShell script in a single line
    const singleLineScript = script.replace(/\n/g, ' ').trim();
    const { stdout, stderr } = await execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${singleLineScript}"`
    );

    if (stderr && stderr.trim()) {
      return NextResponse.json({ success: false, error: stderr.trim() });
    }

    const selectedPath = stdout.trim();
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
