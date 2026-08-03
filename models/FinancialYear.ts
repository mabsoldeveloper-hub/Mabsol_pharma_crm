import mongoose from "mongoose";

const FinancialYearSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      default: "TENANT001",
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },

    fyCode: {
      type: String,
      trim: true,
      default: "",
    },

    fyName: {
      type: String,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    isCurrent: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

// Delete any cached Mongoose model to ensure updated schema with fyCode is compiled
if (mongoose.models && mongoose.models.FinancialYear) {
  delete (mongoose.models as any).FinancialYear;
}

export default mongoose.model("FinancialYear", FinancialYearSchema);