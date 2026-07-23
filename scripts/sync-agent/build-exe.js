/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const AGENT_SCRIPT = path.join(__dirname, "agent-core.cjs");
const APP_GUI_SCRIPT = path.join(__dirname, "app-gui.cs");
const INSTALLER_SCRIPT = path.join(__dirname, "installer.cs");

const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "downloads");
const OUTPUT_EXE = path.join(OUTPUT_DIR, "mabsolsyncagent.exe");
const OUTPUT_APP_GUI = path.join(OUTPUT_DIR, "MabsolSyncAgentApp.exe");
const OUTPUT_MAIN_GUI = path.join(OUTPUT_DIR, "MabsolSyncAgent.exe");
const OUTPUT_INSTALLER = path.join(OUTPUT_DIR, "MabsolSyncAgentSetup.exe");

const CSC_PATH = "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe";

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log("=================================================");
console.log("  Building Mabsol Sync Agent & Desktop App GUI");
console.log("=================================================");

try {
  // 1. Build Core Node Engine Binary
  console.log("[1/3] Compiling core node engine (pkg)...");
  execSync(`npx -y pkg@5.8.1 "${AGENT_SCRIPT}" --targets node18-win-x64 --output "${OUTPUT_EXE}"`, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });

  // 2. Build Desktop GUI Control Panel Software (csc.exe)
  console.log("[2/3] Compiling Desktop App GUI software (csc.exe)...");
  execSync(`"${CSC_PATH}" /nologo /target:winexe /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:"${OUTPUT_APP_GUI}" "${APP_GUI_SCRIPT}"`, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });

  // Copy app GUI to main executable name MabsolSyncAgent.exe as well
  fs.copyFileSync(OUTPUT_APP_GUI, OUTPUT_MAIN_GUI);

  // 3. Build Windows GUI Installer Setup Wizard with csc.exe
  console.log("[3/3] Compiling Windows GUI Installer wizard (csc.exe)...");
  execSync(`"${CSC_PATH}" /nologo /target:winexe /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:"${OUTPUT_INSTALLER}" "${INSTALLER_SCRIPT}"`, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });

  console.log("=================================================");
  console.log(" SUCCESS! Desktop App GUI & Setup Installer built successfully.");
  console.log(` 1. Setup Installer: ${OUTPUT_INSTALLER}`);
  console.log(` 2. Desktop Control Panel App: ${OUTPUT_MAIN_GUI}`);
  console.log(` 3. Core Engine: ${OUTPUT_EXE}`);
  console.log("=================================================");
} catch (error) {
  console.error("[Build Error] Failed to build binaries:", error.message);
  process.exit(1);
}
