import mongoose, { Schema } from "mongoose";

const ProductSchema = new Schema(
  {},
  {
    strict: false,
    collection: "vfp_new_folder_pro",
  }
);

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);

  