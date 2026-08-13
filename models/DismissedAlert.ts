import mongoose from "mongoose";

const DismissedAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: "ALL",
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

DismissedAlertSchema.index({ entityId: 1, userId: 1 }, { unique: true });

export default mongoose.models.DismissedAlert || mongoose.model("DismissedAlert", DismissedAlertSchema);
