import mongoose from "mongoose";

const VfpFileAssetSchema = new mongoose.Schema(
  {
    relativePath: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
    fileName: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      default: "",
      index: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    mtimeMs: Number,
    contentHash: String,
    storageStatus: {
      type: String,
      enum: ["metadata_only", "stored", "too_large", "failed"],
      default: "metadata_only",
    },
    gridFsId: mongoose.Schema.Types.ObjectId,
    lastSyncedAt: Date,
    lastSyncedDate: String,
    lastError: String,
  },
  {
    timestamps: true,
  }
);

VfpFileAssetSchema.index({ relativePath: 1, email: 1 }, { unique: true });

if (mongoose.models.VfpFileAsset) {
  delete mongoose.models.VfpFileAsset;
}
export default mongoose.model("VfpFileAsset", VfpFileAssetSchema, "vfpfileassets");
