import mongoose, { Schema, models, model } from "mongoose";

const MrTerritorySchema = new Schema(
  {
    // MR (Salesman/User) Reference
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeCode: {
      type: String,
      default: "",
      trim: true,
    },

    // Territory Scope - Company Level (Required)
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

    // Territory Scope - Division Level (Required)
    divisionCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    divisionName: {
      type: String,
      required: true,
      trim: true,
    },

    // Territory Scope - Sub Division Level (Optional - "" means all sub divisions)
    subDivisionCode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    subDivisionName: {
      type: String,
      default: "",
      trim: true,
    },

    // Territory Scope - Category Level (Optional - "" means all categories)
    categoryCode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },
    categoryName: {
      type: String,
      default: "",
      trim: true,
    },

    // Notes / Remarks
    notes: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate assignments for the same MR + exact same territory scope
MrTerritorySchema.index(
  {
    userId: 1,
    companyCode: 1,
    divisionCode: 1,
    subDivisionCode: 1,
    categoryCode: 1,
  },
  {
    unique: true,
  }
);

// Index for fast querying by MR
MrTerritorySchema.index({ userId: 1, status: 1 });

// Index for fast querying by territory
MrTerritorySchema.index({ companyCode: 1, divisionCode: 1, status: 1 });

export default models.MrTerritory || model("MrTerritory", MrTerritorySchema);
