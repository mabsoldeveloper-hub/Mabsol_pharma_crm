import mongoose, { Schema } from "mongoose";

const AccountGroupSchema = new Schema(
  {},
  {
    strict: false,
    collection: "vfp_new_folder_acgroup",
  }
);

export default mongoose.models.AccountGroup ||
mongoose.model("AccountGroup", AccountGroupSchema);