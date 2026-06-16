import mongoose, { Schema, Document } from "mongoose";

export interface ITenant extends Document {
  companyName: string;
  gstNo: string;
  mobile: string;
  email: string;
  subscription: string;
  status: string;
}

const TenantSchema = new Schema(
  {
    companyName: {
      type: String,
      required: true,
    },

    gstNo: {
      type: String,
      default: "",
    },

    mobile: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    subscription: {
      type: String,
      default: "Trial",
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

export default mongoose.models.Tenant ||
  mongoose.model<ITenant>("Tenant", TenantSchema);

  