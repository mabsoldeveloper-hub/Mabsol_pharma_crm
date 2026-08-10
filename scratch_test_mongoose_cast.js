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

const LeadSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  fyId: { type: mongoose.Schema.Types.ObjectId, ref: "FinancialYear" },
  partyName: String,
});
const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);

async function test() {
  await mongoose.connect(mongoUri);

  const stringCompanyId = "6a33dd1ed354e87d254816fd";
  const objectIdCompanyId = new mongoose.Types.ObjectId("6a33dd1ed354e87d254816fd");

  // Query 1: STRING inside nested $or inside $and
  const filterString = {
    $and: [
      {
        $or: [
          { companyId: stringCompanyId },
          { companyId: null },
          { companyId: { $exists: false } }
        ]
      }
    ]
  };

  // Query 2: OBJECTID inside nested $or inside $and
  const filterObjectId = {
    $and: [
      {
        $or: [
          { companyId: objectIdCompanyId },
          { companyId: null },
          { companyId: { $exists: false } }
        ]
      }
    ]
  };

  const leadsWithStr = await Lead.find(filterString).lean();
  console.log("Results with String ID inside nested $or:", leadsWithStr.length);

  const leadsWithObj = await Lead.find(filterObjectId).lean();
  console.log("Results with ObjectId inside nested $or:", leadsWithObj.length);

  await mongoose.disconnect();
}

test().catch(console.error);
