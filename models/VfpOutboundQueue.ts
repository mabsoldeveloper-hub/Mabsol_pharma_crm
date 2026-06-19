import mongoose from "mongoose";

const VfpOutboundQueueSchema = new mongoose.Schema(
  {
    tableName: {
      type: String,
      required: true,
    },
    sourceKey: {
      type: String,
      required: true,
    },
    operation: {
      type: String,
      enum: ["upsert", "delete"],
      default: "upsert",
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    baseHash: String,
    status: {
      type: String,
      enum: ["pending", "processing", "applied", "conflict", "failed"],
      default: "pending",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.VfpOutboundQueue ||
  mongoose.model("VfpOutboundQueue", VfpOutboundQueueSchema);
