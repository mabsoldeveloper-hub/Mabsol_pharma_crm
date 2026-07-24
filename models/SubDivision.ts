import mongoose, { Schema, models, model } from "mongoose";

const SubDivisionSchema = new Schema(
  {
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
    subDivisionCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    subDivisionName: {
      type: String,
      required: true,
      trim: true,
    },
    shortName: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
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

// Duplicate Sub Division Code within same Company & Division is not allowed
SubDivisionSchema.index(
  {
    companyCode: 1,
    divisionCode: 1,
    subDivisionCode: 1,
  },
  {
    unique: true,
  }
);

export default models.SubDivision || model("SubDivision", SubDivisionSchema);
