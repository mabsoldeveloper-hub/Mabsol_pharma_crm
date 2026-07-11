import mongoose, { Schema } from "mongoose";

const GlLedgerSchema = new Schema(
    {},
    {
        strict: false,
        collection: "vfp_new_folder_gledger",
    }
);

export default mongoose.models.GlLedger ||
    mongoose.model("GlLedger", GlLedgerSchema);