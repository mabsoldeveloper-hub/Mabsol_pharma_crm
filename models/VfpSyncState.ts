import mongoose from "mongoose";

const VfpSyncStateSchema = new mongoose.Schema(
  {
    tableName: {
      type: String,
      required: true,
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
    fileName: String,
    filePath: String,
    targetCollection: String,
    syncDirection: {
      type: String,
      enum: ["dbf_to_crm", "crm_to_dbf", "two_way"],
      default: "two_way",
    },
    status: {
      type: String,
      enum: ["idle", "running", "success", "failed", "locked", "skipped"],
      default: "idle",
    },
    lastStartedAt: Date,
    lastSyncedAt: Date,
    lastSyncedDate: String,
    lastFileMtimeMs: Number,
    lastRecordCount: {
      type: Number,
      default: 0,
    },
    lastImportedCount: {
      type: Number,
      default: 0,
    },
    lastSkippedCount: {
      type: Number,
      default: 0,
    },
    lastHash: String,
    lastError: String,
  },
  {
    timestamps: true,
  }
);

VfpSyncStateSchema.index({ tableName: 1, email: 1, companyId: 1 }, { unique: true });

if (mongoose.models.VfpSyncState) {
  delete mongoose.models.VfpSyncState;
}

export default mongoose.model("VfpSyncState", VfpSyncStateSchema, "vfpsyncstates");
