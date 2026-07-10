const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const mongoose = require("mongoose");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const PROJECT_ROOT = path.resolve(__dirname, "..");
loadEnv(path.join(PROJECT_ROOT, ".env"));

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  let vfpExePath = process.env.VFP_EXE_PATH || "C:\\Program Files (x86)\\Microsoft Visual FoxPro 9\\vfp9.exe";
  let startupCommand = "";

  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      const vfpConfigSchema = new mongoose.Schema({}, { strict: false });
      const VfpConfig = mongoose.models.VfpConfig || mongoose.model("VfpConfig", vfpConfigSchema, "vfpconfigs");
      const config = await VfpConfig.findOne({ dataDir: { $exists: true, $ne: "" } });
      if (config) {
        if (config.get("vfpExePath")) {
          vfpExePath = config.get("vfpExePath");
        }
        if (config.get("startupCommand")) {
          startupCommand = config.get("startupCommand");
        }
      }
    } catch (e) {
      console.warn("[launcher] Warning: Could not connect to MongoDB, using local env fallback.");
    } finally {
      try {
        await mongoose.disconnect();
      } catch (e) {}
    }
  }

  if (!fs.existsSync(vfpExePath)) {
    console.error(`Error: Visual FoxPro executable not found at: ${vfpExePath}`);
    console.log("Please check your .env configuration or VFP Settings for VFP_EXE_PATH.");
    process.exit(1);
  }

  const prgPath = path.join(PROJECT_ROOT, "vfp_startup.prg");
  const fpwPath = path.join(PROJECT_ROOT, "vfp_config.fpw");

  // Write VFP startup file and configuration mapping
  const keyboardInstruction = startupCommand 
    ? `KEYBOARD [DO "${startupCommand}"] + CHR(13)`
    : `KEYBOARD '* Drag & drop your PRG file here or type script path (e.g. DO "D:\\New Folder\\1.PRG")' + CHR(13)`;

  fs.writeFileSync(prgPath, `SET SAFETY OFF\r\nSET TALK OFF\r\n${keyboardInstruction}\r\n`);
  fs.writeFileSync(fpwPath, `COMMAND = DO "${prgPath}"\r\n`);

  console.log(`Launching VFP interactive console...`);

  const child = spawn(vfpExePath, ["-c" + fpwPath], {
    cwd: path.dirname(vfpExePath),
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  // Clean up temporary startup scripts after a brief delay
  setTimeout(() => {
    try {
      if (fs.existsSync(prgPath)) fs.unlinkSync(prgPath);
      if (fs.existsSync(fpwPath)) fs.unlinkSync(fpwPath);
      const fxpPath = prgPath.replace(/\.prg$/i, ".fxp");
      const bakPath = prgPath.replace(/\.prg$/i, ".bak");
      if (fs.existsSync(fxpPath)) fs.unlinkSync(fxpPath);
      if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);
    } catch (e) {}
    process.exit(0);
  }, 5000);
}

main().catch((error) => {
  console.error("Launcher error:", error);
  process.exit(1);
});
