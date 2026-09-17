import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppRecipientLog {
  phone: string;
  status: "pending" | "sent" | "failed";
  messageId?: string;
  error?: string;
  sentAt?: Date;
}

export interface IWhatsAppCampaign extends Document {
  campaignName: string;
  templateName: string;
  languageCode: string;
  headerText?: string;
  bodyText?: string;
  footerText?: string;
  buttonText?: string;
  buttonUrl?: string;
  recipients: IWhatsAppRecipientLog[];
  totalCount: number;
  sentCount: number;
  failedCount: number;
  status: "draft" | "sending" | "completed" | "failed";
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppRecipientLogSchema = new Schema<IWhatsAppRecipientLog>(
  {
    phone: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    messageId: { type: String },
    error: { type: String },
    sentAt: { type: Date },
  },
  { _id: false }
);

const WhatsAppCampaignSchema = new Schema<IWhatsAppCampaign>(
  {
    campaignName: { type: String, required: true },
    templateName: { type: String, default: "mabsol_infotech_pvt_ltd_demo" },
    languageCode: { type: String, default: "en" },
    headerText: { type: String },
    bodyText: { type: String },
    footerText: { type: String },
    buttonText: { type: String },
    buttonUrl: { type: String },
    recipients: [WhatsAppRecipientLogSchema],
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

export default mongoose.models.WhatsAppCampaign ||
  mongoose.model<IWhatsAppCampaign>("WhatsAppCampaign", WhatsAppCampaignSchema);
