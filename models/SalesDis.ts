import mongoose, { Schema } from "mongoose";

const SalesDisSchema = new Schema(
  {},
  {
    strict: false,
    collection: "vfp_new_folder_dis",
  }
);

export default mongoose.models.SalesDis ||
  mongoose.model("SalesDis", SalesDisSchema);