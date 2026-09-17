import mongoose, { Schema, Document } from "mongoose";

export interface IRecipientLog {
  email: string;
  status: "pending" | "sent" | "failed";
  error?: string;
  sentAt?: Date;
}

export interface IAttachmentMeta {
  filename: string;
  size: number;
  mimeType: string;
}

export interface IEmailCampaign extends Document {
  subject: string;
  message: string;
  recipients: IRecipientLog[];
  attachments: IAttachmentMeta[];
  totalCount: number;
  sentCount: number;
  failedCount: number;
  status: "draft" | "sending" | "completed" | "failed";
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecipientLogSchema = new Schema<IRecipientLog>(
  {
    email: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    error: { type: String },
    sentAt: { type: Date },
  },
  { _id: false }
);

const AttachmentMetaSchema = new Schema<IAttachmentMeta>(
  {
    filename: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: "application/octet-stream" },
  },
  { _id: false }
);

const EmailCampaignSchema = new Schema<IEmailCampaign>(
  {
    subject: { type: String, required: true },
    message: { type: String, required: true },
    recipients: [RecipientLogSchema],
    attachments: [AttachmentMetaSchema],
    totalCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "sending", "completed", "failed"],
      default: "draft",
    },
    createdBy: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.EmailCampaign ||
  mongoose.model<IEmailCampaign>("EmailCampaign", EmailCampaignSchema);
