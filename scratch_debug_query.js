const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const envContent = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
envContent.split("\n").forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
});

const mongoUri = process.env.MONGODB_URI;

const LeadSchema = new mongoose.Schema({}, { strict: false });
const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);

async function test() {
  await mongoose.connect(mongoUri);

  const reqCompanyId = "6a33dd1ed354e87d254816fd";
  const reqFyId = "6a738129...something"; // whatever string FY ID

  const companyId = reqCompanyId;
  const filter = {};

  if (companyId) {
    filter.$or = [
      { companyId: new mongoose.Types.ObjectId(companyId) },
      { companyId: companyId },
      { companyId: null },
      { companyId: { $exists: false } },
    ];
  }

  console.log("Filter Object 1 (companyId only):", JSON.stringify(filter, null, 2));
  const res1 = await Lead.find(filter).lean();
  console.log("Res 1 count:", res1.length);

  if (reqFyId && reqFyId !== "ALL") {
    const fyOr = [
      { fyId: reqFyId },
      { fyId: null },
      { fyId: { $exists: false } },
    ];
    if (filter.$or) {
      filter.$and = [
        { $or: filter.$or },
        { $or: fyOr },
      ];
      delete filter.$or;
    } else {
      filter.$or = fyOr;
    }
  }

  console.log("Filter Object 2 (with fyId):", JSON.stringify(filter, null, 2));
  const res2 = await Lead.find(filter).lean();
  console.log("Res 2 count:", res2.length);

  await mongoose.disconnect();
}

test().catch(console.error);
