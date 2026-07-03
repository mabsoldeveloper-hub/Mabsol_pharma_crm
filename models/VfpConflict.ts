import mongoose from "mongoose";

const VfpConflictSchema = new mongoose.Schema(
  {
    tableName: {
      type: String,
      required: true,
    },
    sourceKey: {
      type: String,
      required: true,
    },
    policy: {
      type: String,
      default: "vfp_wins",
    },
    crmPayload: mongoose.Schema.Types.Mixed,
    vfpPayload: mongoose.Schema.Types.Mixed,
    reason: String,
    status: {
      type: String,
      enum: ["open", "resolved", "skipped"],
      default: "open",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.VfpConflict ||
  mongoose.model("VfpConflict", VfpConflictSchema, "vfpconflicts");
