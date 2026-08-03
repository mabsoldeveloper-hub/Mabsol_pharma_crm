import mongoose, { Schema } from "mongoose";

const SettledBillSchema = new Schema({
  billId: { type: String },
  billNumber: { type: String, required: true },
  originalAmount: { type: Number, default: 0 },
  settledAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
});

const PurchasePaymentSchema = new Schema(
  {
    voucherNo: { type: String, required: true, unique: true },
    paymentDate: { type: String, required: true },
    companyId: { type: String, default: "" },
    companyCode: { type: String, default: "" },
    fyId: { type: String, default: "" },
    fyCode: { type: String, default: "" },
    vendorId: { type: String, default: "" },
    vendorCode: { type: String, default: "" },
    vendorName: { type: String, required: true },
    vendorGst: { type: String, default: "" },
    vendorPhone: { type: String, default: "" },
    vendorCity: { type: String, default: "" },
    amount: { type: Number, required: true, default: 0 },
    paymentMode: {
      type: String,
      enum: ["Cash", "Bank Transfer", "UPI", "Cheque", "Draft"],
      default: "Bank Transfer",
    },
    refNo: { type: String, default: "" },
    bankName: { type: String, default: "" },
    discountReceived: { type: Number, default: 0 },
    settledBills: [SettledBillSchema],
    remarks: { type: String, default: "" },
    status: { type: String, enum: ["Approved", "Cancelled"], default: "Approved" },
    createdBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.models.PurchasePayment || mongoose.model("PurchasePayment", PurchasePaymentSchema);
