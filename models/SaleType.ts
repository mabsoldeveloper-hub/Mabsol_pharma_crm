import mongoose, { Schema, models, model } from "mongoose";

const SaleTypeSchema = new Schema({}, {
  strict: false,
  collection: "vfp_new_folder_saletype"
});

export default models.SaleType || model("SaleType", SaleTypeSchema);