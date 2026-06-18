import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema(
  {
    // tenantId: {
    //   type: String,
    //   default: "TENANT001",
    // },

    tenantId: {
      type: String,
      required: true,
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    
    status: {
      type: String,
      default: "Active",
    },

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
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Company ||
mongoose.model("Company", CompanySchema);