import mongoose, { Schema, models, model } from "mongoose";

export interface IGiftSlab {
  minAchievementPercent: number; // e.g. 100 for 100%, 80 for 80%
  giftName: string;              // e.g. "Smartwatch"
  giftDescription?: string;      // e.g. "Boat Smartwatch or 5% extra cashback"
}

const TargetMasterSchema = new Schema(
  {
    // Target Scope Type
    targetType: {
      type: String,
      enum: ["MR", "Customer"],
      required: true,
    },

    // Target Period (e.g. "2026-07" for July 2026 or "2026-Q3" or "2026-2027")
    periodMonth: {
      type: String,
      required: true,
      trim: true,
    },

    // Target for MR Executive
    mrUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    mrName: {
      type: String,
      default: "",
      trim: true,
    },

    // Target for Customer / Chemist / Stockist / Doctor
    customerId: {
      type: String,
      default: "",
      trim: true,
    },
    customerName: {
      type: String,
      default: "",
      trim: true,
    },
    customerCode: {
      type: String,
      default: "",
      trim: true,
    },

    // Target Financial Amount
    targetAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Optional Gift / Scheme Configuration
    hasGiftScheme: {
      type: Boolean,
      default: false,
    },
    giftSlabs: [
      {
        minAchievementPercent: { type: Number, required: true },
        giftName: { type: String, required: true, trim: true },
        giftDescription: { type: String, default: "", trim: true },
      },
    ],

    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Closed"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

TargetMasterSchema.index({ periodMonth: 1, targetType: 1, mrUserId: 1, customerId: 1 });

export default models.TargetMaster || model("TargetMaster", TargetMasterSchema);
