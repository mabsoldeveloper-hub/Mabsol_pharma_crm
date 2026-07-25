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
      enum: [
        "OUTSTANDING_OVERDUE",
        "CREDIT_LIMIT_EXCEEDED",
        "TARGET_MILESTONE",
        "GIFT_UNLOCKED",
        "LOW_STOCK",
        "NEAR_EXPIRY",
        "NEW_ORDER",
        "ORDER_APPROVAL",
        "SYNC_ALERT",
        "GENERAL",
      ],
      default: "GENERAL",
    },
    category: {
      type: String,
      enum: ["FINANCIAL", "TARGETS", "INVENTORY", "ORDERS", "SYSTEM"],
      default: "SYSTEM",
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
    actionUrl: {
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
