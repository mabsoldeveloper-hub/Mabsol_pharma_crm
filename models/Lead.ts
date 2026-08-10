import mongoose, { Schema, models, model } from "mongoose";
// Lead number (LD-YYYY-NNNN) is generated in the API POST route.

const LeadSchema = new Schema(
  {
    // ─── Multi-Tenant Scoping ─────────────────────────────────────────────
    tenantId: { type: String, default: "TENANT001" },
    companyId: { type: Schema.Types.ObjectId, ref: "Company" },
    fyId: { type: Schema.Types.ObjectId, ref: "FinancialYear", default: null },
    fyCode: { type: String, trim: true, default: "" },

    // ─── Auto-Generated Lead Number ───────────────────────────────────────
    leadNumber: { type: String, unique: true, sparse: true }, // e.g. LD-2026-0001

    // ─── Basic Lead Info ──────────────────────────────────────────────────
    title: { type: String, trim: true, default: "" }, // Lead display name / summary
    partyName: { type: String, required: true, trim: true }, // Doctor / Chemist / Company name

    // ─── Lead Classification ──────────────────────────────────────────────
    leadType: {
      type: String,
      enum: [
        "Doctor",
        "Chemist/Retailer",
        "Hospital/Nursing Home",
        "Stockist/Distributor",
        "Export/International",
        "B2B Bulk Buyer",
        "Direct/OTC Customer",
        "Franchise Inquiry",
        "Generic Store",
        "Other",
      ],
      default: "Doctor",
    },
    speciality: { type: String, trim: true, default: "" }, // e.g. Cardiology, Retail Chain, Wholesale

    // ─── Contact Details ──────────────────────────────────────────────────
    contactPerson: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    altPhone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    whatsapp: { type: String, trim: true, default: "" },

    // ─── Location ─────────────────────────────────────────────────────────
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "India" },
    areaId: { type: Schema.Types.ObjectId, ref: "AreaMaster", default: null },

    // ─── Pharma/Business Specific ─────────────────────────────────────────
    gstin: { type: String, trim: true, default: "" },           // GST Number
    dlNumber: { type: String, trim: true, default: "" },        // Drug License
    panNumber: { type: String, trim: true, default: "" },
    clinicHospitalName: { type: String, trim: true, default: "" },
    bedCapacity: { type: Number, default: 0 },                  // For hospitals
    monthlyTurnover: { type: String, trim: true, default: "" }, // Estimated monthly business
    existingBrands: { type: [String], default: [] },            // Brands they currently deal in
    interestedProducts: { type: [String], default: [] },        // Our products they're interested in
    
    // For Export leads
    country_export: { type: String, trim: true, default: "" },
    incoterms: { type: String, trim: true, default: "" },
    moq: { type: String, trim: true, default: "" },             // Minimum order quantity
    regulatoryRequired: { type: Boolean, default: false },      // FDA / WHO-GMP etc.

    // ─── Pipeline Stage ───────────────────────────────────────────────────
    stage: {
      type: String,
      enum: [
        "New",
        "Contacted",
        "Qualified",
        "Sample Delivered",
        "Quotation Shared",
        "Negotiation",
        "Won",
        "Lost",
        "Dropped",
      ],
      default: "New",
    },
    lostReason: { type: String, trim: true, default: "" },
    droppedReason: { type: String, trim: true, default: "" },

    // ─── Priority & Scoring ───────────────────────────────────────────────
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    score: { type: Number, default: 0, min: 0, max: 100 }, // AI/rule-based lead score

    // ─── Source & Attribution ─────────────────────────────────────────────
    source: {
      type: String,
      enum: [
        "Field Visit",
        "Website Form",
        "IndiaMART",
        "TradeIndia",
        "JustDial",
        "Facebook Ads",
        "Google Ads",
        "WhatsApp Inquiry",
        "Email Inquiry",
        "Reference/Referral",
        "Exhibition/Trade Show",
        "Cold Call",
        "Walk-in",
        "Excel Import",
        "Other",
      ],
      default: "Field Visit",
    },
    referredBy: { type: String, trim: true, default: "" }, // Name of referrer
    campaignName: { type: String, trim: true, default: "" }, // Marketing campaign

    // ─── Assignment ───────────────────────────────────────────────────────
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedToName: { type: String, trim: true, default: "" },
    assignedAt: { type: Date, default: null },

    // ─── Financial Estimates ──────────────────────────────────────────────
    estimatedMonthlyValue: { type: Number, default: 0 }, // Estimated monthly POB / sales value
    estimatedDealValue: { type: Number, default: 0 },    // One-time deal value (for B2B/Export)
    creditTermsRequested: { type: String, trim: true, default: "" }, // e.g. "30 days"
    securityDepositCapacity: { type: Number, default: 0 }, // For stockists

    // ─── Follow-up & Scheduling ───────────────────────────────────────────
    nextFollowUpDate: { type: Date, default: null },
    nextFollowUpNote: { type: String, trim: true, default: "" },
    lastContactedAt: { type: Date, default: null },

    // ─── Conversion ───────────────────────────────────────────────────────
    isConverted: { type: Boolean, default: false },
    convertedAt: { type: Date, default: null },
    convertedCustomerId: { type: String, default: null }, // CRM Party Master ID after conversion
    convertedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    // ─── Tags & Extras ────────────────────────────────────────────────────
    tags: { type: [String], default: [] },
    internalNotes: { type: String, trim: true, default: "" },
    attachments: [
      {
        name: { type: String, default: "" },
        url: { type: String, default: "" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for fast queries
LeadSchema.index({ stage: 1 });
LeadSchema.index({ leadType: 1 });
LeadSchema.index({ assignedTo: 1 });
LeadSchema.index({ source: 1 });
LeadSchema.index({ priority: 1 });
LeadSchema.index({ nextFollowUpDate: 1 });
LeadSchema.index({ companyId: 1 });
LeadSchema.index({ phone: 1 });
LeadSchema.index({ gstin: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ isConverted: 1 });

export default models.Lead || model("Lead", LeadSchema);
