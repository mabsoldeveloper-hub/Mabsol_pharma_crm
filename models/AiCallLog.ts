import mongoose, { Schema, models, model } from "mongoose";

const AiCallLogSchema = new Schema(
  {
    tenantId: {
      type: String,
      default: "TENANT001",
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      default: "Admin / Owner",
    },

    // Target Contact Info
    partyType: {
      type: String,
      default: "Doctor",
      trim: true,
    },
    partyName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    callObjective: {
      type: String,
      default: "General CRM Follow-up & Feedback",
      trim: true,
    },

    // Call Execution Details
    callStatus: {
      type: String,
      enum: ["INITIATED", "RINGING", "IN_PROGRESS", "COMPLETED", "FAILED", "NO_ANSWER"],
      default: "INITIATED",
    },
    callDurationSeconds: {
      type: Number,
      default: 0,
    },
    recordingUrl: {
      type: String,
      default: "",
    },

    // Multi-turn Transcript
    rawTranscript: [
      {
        speaker: {
          type: String, // "AI_AGENT" | "CUSTOMER"
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        timestamp: {
          type: String,
          default: "00:00",
        },
      },
    ],

    // AI Generated Summary & Insights (via AWS Bedrock / OpenAI)
    aiSummary: {
      overview: { type: String, default: "" },
      keyPoints: [{ type: String }],
      actionItems: [{ type: String }],
      sentiment: {
        type: String,
        enum: ["POSITIVE", "NEUTRAL", "NEGATIVE"],
        default: "POSITIVE",
      },
    },

    // Owner Notification Status
    ownerNotified: {
      type: Boolean,
      default: false,
    },
    ownerEmail: {
      type: String,
      default: "",
    },
    notifiedAt: {
      type: Date,
    },

    // AWS Tracking
    awsMetadata: {
      transcribeJobName: { type: String, default: "" },
      s3BucketKey: { type: String, default: "" },
      bedrockModelId: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
);

AiCallLogSchema.index({ tenantId: 1, createdAt: -1 });
AiCallLogSchema.index({ partyName: 1 });
AiCallLogSchema.index({ callStatus: 1 });
AiCallLogSchema.index({ "aiSummary.sentiment": 1 });

if (models.AiCallLog) {
  delete (models as any).AiCallLog;
}

export default model("AiCallLog", AiCallLogSchema);
