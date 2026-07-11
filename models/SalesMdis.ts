import mongoose, { Schema } from "mongoose";

const SalesMdisSchema = new Schema(
  {},
  {
    strict: false,
    collection: "vfp_new_folder_mdis",
  }
);

export default mongoose.models.SalesMdis ||
  mongoose.model("SalesMdis", SalesMdisSchema);