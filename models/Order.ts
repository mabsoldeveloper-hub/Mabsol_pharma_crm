import mongoose, { Schema } from "mongoose";

const OrderSchema = new Schema(
  {},
  {
    strict: false,
    collection: "vfp_new_folder_order",
  }
);

export default mongoose.models.Order ||
  mongoose.model("Order", OrderSchema);