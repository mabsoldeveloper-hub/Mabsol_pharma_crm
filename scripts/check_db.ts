import mongoose from "mongoose";
import connectDB from "../lib/mongodb";

async function check() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) process.exit(1);

  console.log("\n=== SAMPLE DOC FROM vfp_new_folder_mdis ===");
  const sampleMdis = await db.collection("vfp_new_folder_mdis").findOne();
  console.log(sampleMdis);

  console.log("\n=== SAMPLE DOC FROM vfp_new_folder_order ===");
  const sampleOrder = await db.collection("vfp_new_folder_order").findOne();
  console.log(sampleOrder);

  process.exit(0);
}

check();
