import mongoose, { Schema } from "mongoose";

const RateSchema = new Schema(
    {},
    {
        strict: false,
        collection: "vfp_new_folder_rate",
    }
);

export default mongoose.models.Rate ||
    mongoose.model("Rate", RateSchema);