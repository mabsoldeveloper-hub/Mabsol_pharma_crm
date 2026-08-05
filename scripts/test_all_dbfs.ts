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

async function testDbfs() {
  const dataDir = "C:\\Users\\hp\\Downloads\\MANCHANDA";
  if (!fs.existsSync(dataDir)) {
    console.error("Directory not found:", dataDir);
    process.exit(1);
  }

  const files = fs.readdirSync(dataDir).filter(f => f.toLowerCase().endsWith(".dbf"));
  console.log(`Found ${files.length} DBF files in ${dataDir}:`, files);

  const { performDirectServerSync } = await import("../lib/vfp/dbfSync");
  try {
    const res = await performDirectServerSync("mabsolinfotech@gmail.com");
    console.log("SYNC RESULT:", res);
  } catch (err: any) {
    console.error("SYNC FAILED WITH ERROR:", err.message, err.stack);
  }
  process.exit(0);
}

testDbfs();
