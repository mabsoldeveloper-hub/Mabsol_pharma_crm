import mongoose, { Schema } from "mongoose";

const PurchaseReturnItemSchema = new Schema({
  productId: { type: String },
  productCode: { type: String },
  productName: { type: String, required: true },
  hsnCode: { type: String, default: "" },
  batchNo: { type: String, default: "" },
  expDate: { type: String, default: "" },
  qty: { type: Number, required: true, default: 1 },
  unit: { type: String, default: "Box" },
  rate: { type: Number, required: true, default: 0 },
  discountPercent: { type: Number, default: 0 },
  gstPercent: { type: Number, default: 12 },
  taxableAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
});

const PurchaseReturnSchema = new Schema(
  {
    vcn: { type: String, required: true, unique: true },
    returnDate: { type: String, required: true },
    originalBillNo: { type: String, default: "" },
    companyId: { type: String },
    companyCode: { type: String, default: "" },
    fyId: { type: String },
    fyCode: { type: String, default: "" },
    vendorId: { type: String },
    vendorCode: { type: String, default: "" },
    vendorName: { type: String, required: true },
    vendorGst: { type: String, default: "" },
    vendorPhone: { type: String, default: "" },
    vendorAddress: { type: String, default: "" },
    vendorCity: { type: String, default: "" },
    reason: { type: String, default: "Damaged Stock" },
    deductFromInventory: { type: Boolean, default: true },
    items: [PurchaseReturnItemSchema],
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    status: { type: String, enum: ["Approved", "Pending", "Cancelled"], default: "Approved" },
    createdBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.models.PurchaseReturn || mongoose.model("PurchaseReturn", PurchaseReturnSchema);
