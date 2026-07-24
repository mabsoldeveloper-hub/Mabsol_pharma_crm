import mongoose, { Schema, models, model } from "mongoose";

const MrDcrSchema = new Schema(
  {
    // MR User Details
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

    // DCR Header Information
    dcrDate: {
      type: Date,
      required: true,
    },
    workType: {
      type: String,
      enum: ["Field Work", "Office Work", "Meeting", "Conference", "Leave", "Holiday"],
      default: "Field Work",
    },
    stationType: {
      type: String,
      enum: ["HQ", "EX", "OS"], // Headquarter, Ex-station, Out-station
      default: "HQ",
    },
    areaVisited: {
      type: String,
      default: "",
      trim: true,
    },

    // Aggregated Metrics
    totalDoctorCalls: {
      type: Number,
      default: 0,
    },
    totalChemistCalls: {
      type: Number,
      default: 0,
    },
    totalStockistCalls: {
      type: Number,
      default: 0,
    },
    totalPobAmount: {
      type: Number,
      default: 0,
    },

    // Manager Approval Workflow
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedByName: {
      type: String,
      default: "",
    },
    approvalRemarks: {
      type: String,
      default: "",
    },
    approvedAt: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate DCR for the same MR on the exact same date
MrDcrSchema.index({ userId: 1, dcrDate: 1 }, { unique: true });
MrDcrSchema.index({ userId: 1, approvalStatus: 1 });
MrDcrSchema.index({ dcrDate: -1 });

export default models.MrDcr || model("MrDcr", MrDcrSchema);
