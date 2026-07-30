import mongoose from "mongoose";

const VfpSettingLogSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: false,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
    companyCode: {
      type: String,
      required: false,
    },
    companyEmail: {
      type: String,
      required: false,
    },
    financialYear: {
      type: String,
      required: false,
    },
    financialYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialYear",
      required: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    tenantId: {
      type: String,
      default: "TENANT001",
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userName: {
      type: String,
      required: true,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    companyName: {
      type: String,
      required: true,
    },
    license: {
      type: String,
      required: true,
    },
    vfpExePath: {
      type: String,
      required: true,
    },
    action: {
      type: String, // "save_settings", "sync_triggered"
      required: true,
    },
    status: {
      type: String,
      default: "success",
    },
    message: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.VfpSettingLog) {
  delete mongoose.models.VfpSettingLog;
}

export default mongoose.model("VfpSettingLog", VfpSettingLogSchema, "vfpsettinglogs");
