import mongoose, { Schema } from "mongoose";

const MaOrderSchema = new Schema(
    {},
    {
        strict: false,
        collection: "vfp_new_folder_maorder",
    }
);

export default mongoose.models.MaOrder ||
    mongoose.model("MaOrder", MaOrderSchema);