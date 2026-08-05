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

async function check() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI found");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) process.exit(1);

  console.log("\n=== RECENT VFP SYNC LOGS ===");
  const logs = await db.collection("vfpsynclogs").find().sort({ createdAt: -1 }).limit(20).toArray();
  for (const log of logs) {
    console.log(`[${log.createdAt?.toISOString()}] ${log.action} | ${log.tableName || log.fileName || "ALL"} | Status: ${log.status} | ${log.message || log.error || ""}`);
  }

  process.exit(0);
}

check();
