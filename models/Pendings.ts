import mongoose, { Schema } from "mongoose";

const pendingsSchema = new Schema(
    {},
    {
        strict: false,
        collection: "vfp_new_folder_pendings",
    }
);

export default mongoose.models.pendings ||
mongoose.model("pendings", pendingsSchema);