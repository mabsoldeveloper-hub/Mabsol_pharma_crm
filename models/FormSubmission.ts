import mongoose, { Schema, models, model } from "mongoose";

const FormSubmissionSchema = new Schema(
  {
    tenantId: { type: String, default: "TENANT001" },
    companyId: { type: Schema.Types.ObjectId, ref: "Company" },
    financialYear: { type: String, default: "" },
    formId: { type: String, required: true, index: true },
    formTitle: { type: String, default: "" },
    
    // Dynamic Key-Value store for submitted form data
    data: { type: Schema.Types.Mixed, required: true },

    submittedBy: {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      userName: { type: String, default: "System User" },
      userEmail: { type: String, default: "" },
      roleType: { type: String, default: "" },
      isPublicRespondent: { type: Boolean, default: false },
    },

    status: {
      type: String,
      enum: ["Submitted", "Under Review", "Approved", "Rejected", "Draft"],
      default: "Submitted",
    },

    approvalHistory: [
      {
        action: { type: String, enum: ["Approved", "Rejected", "Under Review"] },
        byUserName: { type: String, default: "" },
        byUserId: { type: Schema.Types.ObjectId, ref: "User" },
        remarks: { type: String, default: "" },
        at: { type: Date, default: Date.now },
      },
    ],

    syncedToMaster: {
      synced: { type: Boolean, default: false },
      targetModel: { type: String, default: "" },
      syncedRecordId: { type: String, default: "" },
      syncedAt: { type: Date },
    },

    remarks: { type: String, default: "" },
  },
  {
    timestamps: true,
    strict: false,
  }
);

FormSubmissionSchema.index({ formId: 1, createdAt: -1 });
FormSubmissionSchema.index({ formId: 1, status: 1 });
FormSubmissionSchema.index({ companyId: 1, financialYear: 1 });

if (mongoose.models.FormSubmission) {
  delete mongoose.models.FormSubmission;
}

export default mongoose.model("FormSubmission", FormSubmissionSchema);
