import fs from "fs";
import path from "path";
import mongoose from "mongoose";

function loadEnv(filePath: string) {
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

loadEnv(path.join(__dirname, "..", ".env"));
loadEnv(path.join(__dirname, "..", ".env.local"));

async function testInnerFolder() {
  const innerPath = "C:\\Users\\hp\\Downloads\\MANCHANDA\\MANCHANDA";
  console.log(`Checking inner path: ${innerPath}`);
  if (fs.existsSync(innerPath)) {
    const files = fs.readdirSync(innerPath).filter(f => f.toLowerCase().endsWith(".dbf"));
    console.log(`Found ${files.length} DBF files in ${innerPath}:`, files);
  } else {
    console.log("Inner path does not exist!");
  }

  const uri = process.env.MONGODB_URI;
  if (uri) {
    await mongoose.connect(uri);
    const VfpConfig = mongoose.connection.collection("vfpconfigs");
    // Update config to point directly to the folder containing the DBF files
    await VfpConfig.updateOne(
      { email: "mabsolinfotech@gmail.com" },
      { $set: { dataDir: innerPath, consoleSyncDir: innerPath, enabledFiles: [] } }
    );
    await VfpConfig.updateOne(
      { key: "vfp_sync_config" },
      { $set: { dataDir: innerPath, consoleSyncDir: innerPath, enabledFiles: [] } }
    );
    console.log("Updated DB VfpConfig dataDir to:", innerPath);
  }

  const { performDirectServerSync } = await import("../lib/vfp/dbfSync");
  try {
    const res = await performDirectServerSync("mabsolinfotech@gmail.com");
    console.log("\nSYNC RESULT:", res);
  } catch (err: any) {
    console.error("\nSYNC ERROR:", err.message, err.stack);
  }
  process.exit(0);
}

testInnerFolder();
