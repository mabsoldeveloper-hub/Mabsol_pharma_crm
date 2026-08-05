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

async function findManchanda() {
  const possiblePaths = [
    "C:\\Users\\hp\\Downloads\\MANCHANDA",
    "D:\\VfpNew\\MANCHANDA",
    "D:\\VfpNew\\MANCHANDA\\MANCHANDA",
    "D:\\MANCHANDA",
    "C:\\MANCHANDA",
  ];

  for (const p of possiblePaths) {
    console.log(`Checking path: ${p}`);
    if (fs.existsSync(p)) {
      const files = fs.readdirSync(p);
      console.log(`  EXISTS! Contains ${files.length} items:`, files.slice(0, 10));
    } else {
      console.log(`  Does NOT exist.`);
    }
  }

  const uri = process.env.MONGODB_URI;
  if (uri) {
    await mongoose.connect(uri);
    const VfpConfig = mongoose.connection.collection("vfpconfigs");
    const configs = await VfpConfig.find({}).toArray();
    console.log("\n=== STORED VFP CONFIGS IN DB ===");
    for (const c of configs) {
      console.log(`Config [${c.email || c.key}]: dataDir="${c.dataDir}", consoleSyncDir="${c.consoleSyncDir}", sourceDir="${c.sourceDir}", enabledFiles Count=${c.enabledFiles?.length}`);
      if (c.enabledFiles) {
        console.log("  enabledFiles:", c.enabledFiles);
      }
    }
  }

  process.exit(0);
}

findManchanda();
