import mongoose from "mongoose";

const VfpTableMapSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },
    companyCode: {
      type: String,
      required: false,
    },
    companyName: {
      type: String,
      required: false,
    },
    companyEmail: {
      type: String,
      required: false,
    },
    financialYear: {
      type: String,
      required: false,
    },
    financialYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialYear",
      required: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    tenantId: {
      type: String,
      default: "TENANT001",
    },
    filePath: {
      type: String,
      required: true,
    },
    targetCollection: {
      type: String,
      required: true,
    },
    primaryKeyFields: {
      type: [String],
      default: [],
    },
    columns: {
      type: [
        {
          name: String,
          type: { type: String },
          length: Number,
          decimalCount: Number,
        },
      ],
      default: [],
    },
    recordCount: {
      type: Number,
      default: 0,
    },
    lastFileMtimeMs: Number,
    lastDiscoveredAt: Date,
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

VfpTableMapSchema.index({ fileName: 1, email: 1, companyId: 1 }, { unique: true });

if (mongoose.models.VfpTableMap) {
  delete mongoose.models.VfpTableMap;
}
export default mongoose.model("VfpTableMap", VfpTableMapSchema, "vfptablemaps");
