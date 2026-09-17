import mongoose, { Schema, models, model } from "mongoose";

const LeadSampleRequestSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedByName: { type: String, trim: true, default: "" },

    // Dispatch Info
    dispatchDate: { type: Date, default: null },
    courierName: { type: String, trim: true, default: "" },       // e.g. Blue Dart, DTDC, Delhivery
    trackingNumber: { type: String, trim: true, default: "" },
    deliveryAddress: { type: String, trim: true, default: "" },

    // Sample Items
    items: [
      {
        productCode: { type: String, default: "" },
        productName: { type: String, required: true, trim: true },
        batchNo: { type: String, default: "" },
        mfgDate: { type: String, default: "" },
        expDate: { type: String, default: "" },
        qty: { type: Number, default: 1 },
        unit: { type: String, default: "Strip" },
      },
    ],

    // Delivery & Feedback
    status: {
      type: String,
      enum: ["Requested", "Dispatched", "Delivered", "Feedback Received", "Returned"],
      default: "Requested",
    },
    deliveredAt: { type: Date, default: null },
    feedback: { type: String, trim: true, default: "" },          // Doctor/Chemist feedback
    feedbackDate: { type: Date, default: null },
    feedbackScore: { type: Number, min: 1, max: 5, default: null }, // Star rating 1-5

    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

LeadSampleRequestSchema.index({ leadId: 1 });
LeadSampleRequestSchema.index({ status: 1 });

export default models.LeadSampleRequest || model("LeadSampleRequest", LeadSampleRequestSchema);
