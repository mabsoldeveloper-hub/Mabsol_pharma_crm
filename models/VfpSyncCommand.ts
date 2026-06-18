import mongoose from "mongoose";

const VfpSyncCommandSchema = new mongoose.Schema(
  {
    command: {
      type: String,
      enum: ["rescan", "sync_now"],
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "processing", "done", "failed"],
      default: "queued",
      index: true,
    },
    requestedBy: String,
    message: String,
    processedAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.VfpSyncCommand ||
  mongoose.model("VfpSyncCommand", VfpSyncCommandSchema);
