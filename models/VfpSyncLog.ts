import mongoose from "mongoose";

const VfpSyncLogSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      index: true,
    },
    tableName: String,
    fileName: String,
    action: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "success", "failed", "locked", "skipped"],
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

export default mongoose.models.VfpSyncLog ||
  mongoose.model("VfpSyncLog", VfpSyncLogSchema);
