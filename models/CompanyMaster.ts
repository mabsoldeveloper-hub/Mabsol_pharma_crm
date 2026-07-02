import mongoose from "mongoose";

const CompanyMasterSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
    },

    companyCode: String,
    companyName: String,
    ownerName: String,

    email: String,
    mobile: String,
    website: String,

    gstNo: String,
    panNo: String,
    drugLicenseNo: String,

    address: String,
    city: String,
    state: String,
    pincode: String,

    invoicePrefix: {
      type: String,
      default: "INV",
    },

    purchasePrefix: {
      type: String,
      default: "PUR",
    },

    currency: {
      type: String,
      default: "INR",
    },

    logo: String,

    status: {
      type: String,
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Company ||
mongoose.model(
  "Company",
  CompanyMasterSchema
);