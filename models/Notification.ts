import mongoose from "mongoose";

const NotificationSchema =
  new mongoose.Schema(
    {
      title: String,

      message: String,

      userId: String,

      isRead: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    }
  );

export default
  mongoose.models.Notification ||
  mongoose.model(
    "Notification",
    NotificationSchema
  );