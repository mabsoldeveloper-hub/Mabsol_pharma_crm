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

async function checkStorage() {
  const uri = process.env.MONGODB_URI;
  if (!uri) process.exit(1);
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  if (!db) process.exit(1);

  const collections = await db.listCollections().toArray();
  console.log(`Found ${collections.length} collections in DB:\n`);

  const results: any[] = [];
  for (const col of collections) {
    try {
      const stats = await db.command({ collStats: col.name });
      const sizeMB = ((stats.size || 0) / (1024 * 1024)).toFixed(2);
      const storageMB = ((stats.storageSize || 0) / (1024 * 1024)).toFixed(2);
      results.push({ name: col.name, count: stats.count || 0, sizeMB: Number(sizeMB), storageMB: Number(storageMB) });
    } catch (e: any) {
      results.push({ name: col.name, count: "?", sizeMB: 0, storageMB: 0, error: e.message });
    }
  }

  results.sort((a, b) => b.storageMB - a.storageMB);

  for (const r of results) {
    console.log(`${r.name.padEnd(45)} | Docs: ${String(r.count).padStart(8)} | Data: ${r.sizeMB} MB | Storage: ${r.storageMB} MB`);
  }

  process.exit(0);
}

checkStorage();
