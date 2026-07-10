import mongoose, { Schema } from "mongoose";

const BatchSchema = new Schema(
  {},
  {
    strict: false,
    collection: "vfp_new_folder_probat",
  }
);

export default mongoose.models.Batch ||
  mongoose.model("Batch", BatchSchema);