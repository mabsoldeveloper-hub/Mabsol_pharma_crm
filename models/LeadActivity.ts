import mongoose, { Schema, models, model } from "mongoose";

const LeadActivitySchema = new Schema(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: { type: String, required: true, trim: true },

    // Activity type covers all interaction types
    type: {
      type: String,
      enum: [
        "Call",
        "Field Visit",
        "WhatsApp",
        "Email",
        "SMS",
        "Sample Delivered",
        "Quotation Sent",
        "Meeting",
        "Demo",
        "Follow-up",
        "Stage Changed",
        "Note",
        "System",         // Automated system events (created, assigned, converted)
        "Other",
      ],
      default: "Note",
    },

    // Summary / Description
    summary: { type: String, trim: true, default: "" },

    // Stage transition (for Stage Changed events)
    fromStage: { type: String, trim: true, default: "" },
    toStage: { type: String, trim: true, default: "" },

    // Call / Visit details
    callDuration: { type: Number, default: 0 }, // in minutes
    outcome: { type: String, trim: true, default: "" }, // e.g. "Interested", "Not available", "Callback requested"

    // Scheduled next action from this activity
    nextActionDate: { type: Date, default: null },
    nextActionNote: { type: String, trim: true, default: "" },

    // Attachments (photos, documents)
    attachments: [
      {
        name: { type: String, default: "" },
        url: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

LeadActivitySchema.index({ leadId: 1, createdAt: -1 });
LeadActivitySchema.index({ userId: 1 });
LeadActivitySchema.index({ type: 1 });

export default models.LeadActivity || model("LeadActivity", LeadActivitySchema);
