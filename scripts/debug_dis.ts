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

async function debugFastInsert() {
  const uri = process.env.MONGODB_URI;
  if (!uri) process.exit(1);
  await mongoose.connect(uri);

  const dataDir = "C:\\Users\\hp\\Downloads\\MANCHANDA\\MANCHANDA";
  const disPath = path.join(dataDir, "DIS_F17.DBF");

  const { readDbf } = await import("../lib/vfp/dbfSync");
  
  console.time("readDbf");
  const dbf = (readDbf as any)(disPath);
  console.timeEnd("readDbf");

  const collection = mongoose.connection.collection("vfp_new_folder_dis_f17");
  
  console.time("deleteOld");
  await collection.deleteMany({ _vfpTable: "DIS_F17" });
  console.timeEnd("deleteOld");

  console.time("insertAll81kRows");
  const docs = dbf.rows.map((row: any) => ({
    ...row.data,
    _vfpTable: "DIS_F17",
    _vfpSourceKey: `row:${row.rowNumber}`,
    _vfpRowNumber: row.rowNumber,
    _vfpDeleted: row.deleted,
    _vfpSyncedAt: new Date(),
  }));

  const BATCH_SIZE = 5000;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    await collection.insertMany(chunk, { ordered: false });
  }
  console.timeEnd("insertAll81kRows");

  console.log("FAST INSERT COMPLETE SUCCESS! Inserted 81,513 rows!");
  process.exit(0);
}

debugFastInsert().catch((err) => {
  console.error("FAST INSERT ERROR:", err);
  process.exit(1);
});
