import mongoose, { Schema, models, model } from "mongoose";

const LeadQuotationSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    quotationNumber: { type: String, unique: true, sparse: true }, // e.g. QT-2026-0001
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, trim: true, default: "" },

    // Quotation validity
    validUntil: { type: Date, default: null },

    // Line items
    items: [
      {
        productCode: { type: String, default: "" },
        productName: { type: String, required: true, trim: true },
        packing: { type: String, default: "" },
        hsnCode: { type: String, default: "" },
        qty: { type: Number, default: 1 },
        unit: { type: String, default: "Box" },
        mrp: { type: Number, default: 0 },
        rate: { type: Number, default: 0 },           // Quoted rate
        discountPct: { type: Number, default: 0 },    // Discount %
        netRate: { type: Number, default: 0 },        // After discount
        gstPct: { type: Number, default: 12 },        // GST %
        gstAmount: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },         // Net + GST
      },
    ],

    // Totals
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalGst: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    // Terms & Conditions
    paymentTerms: { type: String, trim: true, default: "" },
    deliveryTerms: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },

    // Status
    status: {
      type: String,
      enum: ["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Revised"],
      default: "Draft",
    },

    // Sharing details
    sharedVia: { type: [String], default: [] }, // ["WhatsApp", "Email", "PDF"]
    pdfUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

LeadQuotationSchema.index({ leadId: 1 });
LeadQuotationSchema.index({ status: 1 });

export default models.LeadQuotation || model("LeadQuotation", LeadQuotationSchema);
