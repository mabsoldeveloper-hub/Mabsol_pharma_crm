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

async function testSingle() {
  const uri = process.env.MONGODB_URI;
  if (!uri) process.exit(1);
  await mongoose.connect(uri);

  const { performDirectServerSync } = await import("../lib/vfp/dbfSync");
  const dataDir = "C:\\Users\\hp\\Downloads\\MANCHANDA\\MANCHANDA";
  
  // Set config
  const VfpConfig = mongoose.connection.collection("vfpconfigs");
  await VfpConfig.updateOne(
    { email: "mabsolinfotech@gmail.com" },
    { $set: { dataDir, consoleSyncDir: dataDir, enabledFiles: [] } }
  );

  console.log("Starting full direct server sync...");
  const start = Date.now();
  const res = await performDirectServerSync("mabsolinfotech@gmail.com");
  console.log(`FULL SYNC DONE in ${Date.now() - start}ms:`, res);
  process.exit(0);
}

testSingle();
