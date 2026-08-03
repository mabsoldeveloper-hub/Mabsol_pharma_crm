import mongoose, { Schema } from "mongoose";

const PurchaseOrderItemSchema = new Schema({
  productId: { type: String },
  productCode: { type: String },
  productName: { type: String, required: true },
  hsnCode: { type: String, default: "" },
  batchNo: { type: String, default: "" },
  expDate: { type: String, default: "" },
  mrp: { type: Number, default: 0 },
  qty: { type: Number, required: true, default: 1 },
  freeQty: { type: Number, default: 0 },
  unit: { type: String, default: "Box" },
  rate: { type: Number, required: true, default: 0 },
  discountPercent: { type: Number, default: 0 },
  schemePercent: { type: Number, default: 0 },
  gstPercent: { type: Number, default: 12 },
  taxableAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
});

const PurchaseOrderSchema = new Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    companyId: { type: String },
    companyCode: { type: String, default: "" },
    fyId: { type: String },
    fyCode: { type: String, default: "" },
    poDate: { type: String, required: true }, // YYYY-MM-DD
    expectedDeliveryDate: { type: String, default: "" },
    priority: { type: String, enum: ["Normal", "High", "Urgent"], default: "Normal" },
    paymentTerms: { type: String, default: "30 Days Credit" },
    taxType: { type: String, enum: ["Intrastate", "Interstate"], default: "Intrastate" },
    vendorId: { type: String },
    vendorCode: { type: String, default: "" },
    vendorName: { type: String, required: true },
    vendorGst: { type: String, default: "" },
    vendorPhone: { type: String, default: "" },
    vendorAddress: { type: String, default: "" },
    vendorCity: { type: String, default: "" },
    shippingAddress: { type: String, default: "" },
    items: [PurchaseOrderItemSchema],
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    freightCharges: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    netTotal: { type: Number, default: 0 },
    status: { type: String, enum: ["Pending", "Partially Billed", "Billed", "Cancelled"], default: "Pending" },
    remarks: { type: String, default: "" },
    createdBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.models.PurchaseOrder || mongoose.model("PurchaseOrder", PurchaseOrderSchema);
