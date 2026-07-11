import mongoose, { Schema } from "mongoose";

const SubDisSchema = new Schema(
    {},
    {
        strict: false,
        collection: "vfp_new_folder_subdis",
    }
);

export default mongoose.models.SubDis ||
    mongoose.model("SubDis", SubDisSchema);