import mongoose, { Schema } from "mongoose";

const CustomerSchema = new Schema(
  {},
  {
    strict: false,
    collection: "vfp_new_folder_order",
  }
);

export default mongoose.models.Customer ||
mongoose.model("Customer", CustomerSchema);