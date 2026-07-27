import mongoose, { Schema } from "mongoose";

const AreaMasterSchema = new Schema(
  {
    areaName: { type: String, required: true, unique: true },
    PRICE: { type: String, default: "RATEF" }, // Assigned default rate (RATEA, RATEB, etc.)
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    status: { type: String, default: "Active" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.AreaMaster ||
  mongoose.model("AreaMaster", AreaMasterSchema);
