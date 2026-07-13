import mongoose, { Schema, models, model } from "mongoose";

const otpSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["email", "mobile"],
      required: true,
    },

    email: {
      type: String,
      default: "",
    },

    mobile: {
      type: String,
      default: "",
    },

    otp: {
      type: String,
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default models.Otp || model("Otp", otpSchema);