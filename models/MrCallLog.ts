import mongoose, { Schema, models, model } from "mongoose";

const MrCallLogSchema = new Schema(
  {
    dcrId: {
      type: Schema.Types.ObjectId,
      ref: "MrDcr",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },

    // Party Information (Doctor / Chemist / Stockist)
    callType: {
      type: String,
      enum: ["Doctor", "Chemist", "Stockist"],
      default: "Doctor",
    },
    partyName: {
      type: String,
      required: true,
      trim: true,
    },
    speciality: {
      type: String,
      default: "", // e.g. MBBS, MD, Cardiology, Orthopedics
      trim: true,
    },
    visitShift: {
      type: String,
      enum: ["Morning", "Evening"],
      default: "Morning",
    },
    visitedWith: {
      type: String,
      default: "Self", // Self, ASM, ZSM, RSM
      trim: true,
    },

    // Promoted Products & Samples
    productsPromoted: [
      {
        productCode: { type: String, default: "" },
        productName: { type: String, required: true },
        sampleQty: { type: Number, default: 0 },
      },
    ],

    // Personal Order Booking (POB)
    pobAmount: {
      type: Number,
      default: 0,
    },

    // Remarks & Feedback
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

MrCallLogSchema.index({ dcrId: 1 });
MrCallLogSchema.index({ userId: 1 });
MrCallLogSchema.index({ callType: 1 });

export default models.MrCallLog || model("MrCallLog", MrCallLogSchema);
