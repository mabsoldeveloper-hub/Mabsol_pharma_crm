import mongoose from "mongoose";

const VfpWorkerHeartbeatSchema = new mongoose.Schema(
  {
    workerId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["starting", "online", "syncing", "error"],
      default: "starting",
    },
    dataDir: String,
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastRunReason: String,
    lastError: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.VfpWorkerHeartbeat ||
  mongoose.model("VfpWorkerHeartbeat", VfpWorkerHeartbeatSchema, "vfpworkerheartbeats");
