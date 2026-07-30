import mongoose from "mongoose";

const VfpSyncLogSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      index: true,
    },
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
    companyName: {
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
    tableName: String,
    fileName: String,
    action: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "success", "failed", "locked", "skipped", "cancelled"],
      required: true,
    },
    message: String,
    importedCount: {
      type: Number,
      default: 0,
    },
    skippedCount: {
      type: Number,
      default: 0,
    },
    error: String,
    startedAt: Date,
    finishedAt: Date,
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.VfpSyncLog) {
  delete mongoose.models.VfpSyncLog;
}

export default mongoose.model("VfpSyncLog", VfpSyncLogSchema, "vfpsynclogs");
