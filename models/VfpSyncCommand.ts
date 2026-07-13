import mongoose from "mongoose";

const VfpSyncCommandSchema = new mongoose.Schema(
  {
    command: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["queued", "processing", "done", "failed"],
      default: "queued",
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
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
  mongoose.model("VfpSyncCommand", VfpSyncCommandSchema, "vfpsynccommands");
