import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      default: "TENANT001",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    userId: {
      type: String, // Can be user ObjectId string or empty for role-wide notifications
      default: "",
    },
    type: {
      type: String,
      enum: ["OUTSTANDING_OVERDUE", "NEAR_EXPIRY", "LOW_STOCK", "NEW_ORDER", "SYNC_ALERT", "GENERAL"],
      default: "GENERAL",
    },
    severity: {
      type: String,
      enum: ["info", "warning", "error", "success"],
      default: "info",
    },
    targetRole: {
      type: String,
      enum: ["MR", "RSM", "ZSM", "Admin", "All"],
      default: "All",
    },
    entityId: {
      type: String,
      default: "",
    },
    metadata: {
      type: Object,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
