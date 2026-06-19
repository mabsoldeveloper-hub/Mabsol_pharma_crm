import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      default: "TENANT001",
    },

    companyCode: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
    },

    mobile: {
      type: String,
      default: "",
    },

    website: {
      type: String,
      default: "",
    },

    gstNo: {
      type: String,
      default: "",
    },

    panNo: {
      type: String,
      default: "",
    },

    drugLicenseNo: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    state: {
      type: String,
      default: "",
    },

    pincode: {
      type: String,
      default: "",
    },

    invoicePrefix: {
      type: String,
      default: "INV-001",
    },

    purchasePrefix: {
      type: String,
      default: "PUR-001",
    },

    currency: {
      type: String,
      default: "INR",
    },

    logo: {
      type: String,
      default: "",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      default: "Active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Company ||
  mongoose.model("Company", CompanySchema);