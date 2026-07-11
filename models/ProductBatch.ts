import mongoose, { Schema } from "mongoose";

const ProductBatchSchema = new Schema(
    {},
    {
        strict: false,
        collection: "vfp_new_folder_probat",
    }
);

export default mongoose.models.ProductBatch ||
    mongoose.model("ProductBatch", ProductBatchSchema);