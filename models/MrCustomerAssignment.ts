import mongoose, { Schema, models, model } from "mongoose";

const MrCustomerAssignmentSchema = new Schema(
  {
    // MR Executive Reference
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

    // Assigned Customer / Party Details
    customerCode: {
      type: String,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    area: {
      type: String,
      default: "",
      trim: true,
    },

    // Metadata
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

// Prevent duplicate assignment of the same customer to the same MR
MrCustomerAssignmentSchema.index({ userId: 1, customerCode: 1 }, { unique: true });

// Fast lookup indexes
MrCustomerAssignmentSchema.index({ userId: 1, status: 1 });
MrCustomerAssignmentSchema.index({ customerCode: 1, status: 1 });

export default models.MrCustomerAssignment || model("MrCustomerAssignment", MrCustomerAssignmentSchema);
