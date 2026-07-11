import mongoose, { Schema } from "mongoose";

const PendSchema = new Schema(
    {},
    {
        strict: false,
        collection: "vfp_new_folder_pend",
    }
);

export default mongoose.models.Pend ||
    mongoose.model("Pend", PendSchema);