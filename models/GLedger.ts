import mongoose, { Schema } from "mongoose";

const GLedgerSchema = new Schema(
  {},
  {
    strict: false,
    collection: "vfp_new_folder_gledger",
  }
);

export default mongoose.models.GLedger ||
  mongoose.model("GLedger", GLedgerSchema);