import mongoose, { Schema, Document } from "mongoose";

export interface IVoucherSeries extends Document {
  seriesName: string;
  voucherType: "SALES" | "PROFORMA" | "PURCHASE" | "RETURN";
  prefix: string;
  suffix: string;
  nextNumber: number;
  padding: number;
  isDefault: boolean;
  status: "Active" | "Inactive";
  companyCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherSeriesSchema = new Schema<IVoucherSeries>(
  {
    seriesName: { type: String, required: true, trim: true },
    voucherType: {
      type: String,
      required: true,
      enum: ["SALES", "PROFORMA", "PURCHASE", "RETURN"],
      default: "SALES",
    },
    prefix: { type: String, default: "INV-", trim: true },
    suffix: { type: String, default: "", trim: true },
    nextNumber: { type: Number, default: 1001, min: 1 },
    padding: { type: Number, default: 5, min: 1, max: 10 },
    isDefault: { type: Boolean, default: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    companyCode: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    collection: "voucher_series",
  }
);

export default mongoose.models.VoucherSeries ||
  mongoose.model<IVoucherSeries>("VoucherSeries", VoucherSeriesSchema);
